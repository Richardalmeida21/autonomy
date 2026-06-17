import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db";
import { uploadPostImages } from "@/lib/post-images";
import { generatedPostZodSchema } from "@/lib/post-schema";
import { getUserFromRequest } from "@/lib/supabase-server";

const scheduleInputSchema = z.object({
  savedPostId: z.string().uuid().optional(),
  socialAccountId: z.string().uuid(),
  scheduledFor: z.string().datetime(),
  post: generatedPostZodSchema
});

export const runtime = "nodejs";

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

    const scheduledFor = new Date(parsedInput.data.scheduledFor);

    if (scheduledFor.getTime() < Date.now() + 60 * 1000) {
      return NextResponse.json(
        { error: "Escolha um horario pelo menos 1 minuto no futuro." },
        { status: 400 }
      );
    }

    const database = getDatabase();
    const account = await database.query(
      `select id
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

    await database.query(
      `insert into scheduled_posts (
         id, user_id, saved_post_id, social_account_id, caption, media_urls,
         original_payload, scheduled_for, status
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
      [
        scheduleId,
        user.id,
        parsedInput.data.savedPostId || null,
        parsedInput.data.socialAccountId,
        parsedInput.data.post.post.caption,
        JSON.stringify(mediaUrls),
        parsedInput.data.post,
        scheduledFor.toISOString()
      ]
    );

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
