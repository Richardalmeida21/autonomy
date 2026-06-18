import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db";
import { publishInstagramMedia, type SocialAccountRecord } from "@/lib/meta";
import { uploadPostImages } from "@/lib/post-images";
import { generatedPostZodSchema } from "@/lib/post-schema";
import { getUserFromRequest } from "@/lib/supabase-server";

const scheduleInputSchema = z.object({
  savedPostId: z.string().uuid().optional(),
  socialAccountId: z.string().uuid(),
  scheduledFor: z.string().datetime().optional(),
  publishNow: z.boolean().optional().default(false),
  post: generatedPostZodSchema
});

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const database = getDatabase();
    const result = await database.query(
      `select sp.id, sp.saved_post_id, sp.caption, sp.media_urls, sp.scheduled_for,
              sp.status, sp.provider_media_id, sp.error_message, sp.created_at,
              sa.instagram_username, sa.page_name
       from scheduled_posts sp
       join social_accounts sa on sa.id = sp.social_account_id
       where sp.user_id = $1
       order by sp.scheduled_for desc`,
      [user.id]
    );

    return NextResponse.json(
      result.rows.map((row) => ({
        ...row,
        media_urls: row.media_urls || []
      }))
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar agendamentos."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const parsedInput = scheduleInputSchema.safeParse(body);

    if (!parsedInput.success) {
      return NextResponse.json(
        {
          error: "Agendamento invalido.",
          issues: parsedInput.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const scheduledFor = parsedInput.data.publishNow
      ? new Date()
      : parsedInput.data.scheduledFor
        ? new Date(parsedInput.data.scheduledFor)
        : null;

    if (!scheduledFor || Number.isNaN(scheduledFor.getTime())) {
      return NextResponse.json(
        { error: "Escolha data e horario para publicar." },
        { status: 400 }
      );
    }

    if (!parsedInput.data.publishNow && scheduledFor.getTime() < Date.now() - 60 * 1000) {
      return NextResponse.json(
        { error: "Escolha um horario atual ou futuro." },
        { status: 400 }
      );
    }

    const database = getDatabase();
    const account = await database.query(
      `select id, auth_flow, instagram_business_account_id, access_token_encrypted
       from social_accounts
       where id = $1 and user_id = $2 and status = 'connected'`,
      [parsedInput.data.socialAccountId, user.id]
    );

    if (account.rowCount === 0) {
      return NextResponse.json(
        { error: "Conta do Instagram nao conectada." },
        { status: 404 }
      );
    }

    const scheduleIdResult = await database.query("select gen_random_uuid() as id");
    const scheduleId = String(scheduleIdResult.rows[0].id);
    const images =
      parsedInput.data.post.post.generated_images.length > 0
        ? parsedInput.data.post.post.generated_images
        : parsedInput.data.post.post.generated_image
          ? [parsedInput.data.post.post.generated_image]
          : [];
    const mediaUrls = await uploadPostImages({
      images,
      postId: scheduleId,
      userId: user.id
    });

    if (mediaUrls.length === 0) {
      return NextResponse.json(
        { error: "Este post nao tem imagem para publicar no Instagram." },
        { status: 400 }
      );
    }

    const publishCaption = formatCaptionWithHashtags(
      parsedInput.data.post.post.caption,
      parsedInput.data.post.post.hashtags
    );

    await database.query(
      `insert into scheduled_posts (
         id, user_id, saved_post_id, social_account_id, caption, media_urls,
         original_payload, scheduled_for, status
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        scheduleId,
        user.id,
        parsedInput.data.savedPostId || null,
        parsedInput.data.socialAccountId,
        publishCaption,
        JSON.stringify(mediaUrls),
        parsedInput.data.post,
        scheduledFor.toISOString(),
        parsedInput.data.publishNow ? "publishing" : "pending"
      ]
    );

    if (parsedInput.data.publishNow) {
      try {
        const publishResult = await publishInstagramMedia({
          account: account.rows[0] as SocialAccountRecord,
          caption: publishCaption,
          mediaUrls
        });

        await database.query(
          `update scheduled_posts
           set status = 'published',
               provider_media_id = $2,
               error_message = null
           where id = $1`,
          [scheduleId, publishResult.id]
        );

        return NextResponse.json({
          id: scheduleId,
          ok: true,
          providerMediaId: publishResult.id,
          status: "published"
        });
      } catch (publishError) {
        const message =
          publishError instanceof Error
            ? publishError.message
            : "Falha ao publicar post.";

        await database.query(
          `update scheduled_posts
           set status = 'failed',
               error_message = $2
           where id = $1`,
          [scheduleId, message]
        );

        return NextResponse.json({ error: message, id: scheduleId }, { status: 502 });
      }
    }

    return NextResponse.json({ id: scheduleId, ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel agendar o post."
      },
      { status: 500 }
    );
  }
}

function formatCaptionWithHashtags(caption: string, hashtags: string[]) {
  const normalizedCaption = caption.trim();
  const normalizedHashtags = hashtags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
  const missingHashtags = normalizedHashtags.filter(
    (tag) => !new RegExp(`(^|\\s)${escapeRegExp(tag)}(\\s|$)`, "i").test(normalizedCaption)
  );

  if (missingHashtags.length === 0) {
    return normalizedCaption;
  }

  return `${normalizedCaption}\n\n${missingHashtags.join(" ")}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
