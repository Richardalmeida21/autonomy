import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db";
import { uploadPostImages } from "@/lib/post-images";
import { generatedPostZodSchema } from "@/lib/post-schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { getUserFromRequest } from "@/lib/supabase-server";

const savedPostSchema = generatedPostZodSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string(),
  isFavorite: z.boolean().optional().default(false)
});

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const rateLimit = checkRateLimit({
      identifier: `posts:save:${user.id}`,
      limit: 60,
      windowMs: 60 * 1000
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente em instantes." },
        {
          headers: { "Retry-After": String(rateLimit.retryAfter) },
          status: 429
        }
      );
    }

    const database = getDatabase();
    const result = await database.query(
      `select id, created_at, is_favorite, payload
       from saved_posts
       where user_id = $1
       order by is_favorite desc, created_at desc`,
      [user.id]
    );

    const posts = result.rows.map((row) => ({
      ...row.payload,
      id: row.id,
      isFavorite: Boolean(row.is_favorite),
      createdAt: row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString()
    }));

    return NextResponse.json(posts);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar os posts."
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
    const parsedPost = savedPostSchema.safeParse(body);

    if (!parsedPost.success) {
      return NextResponse.json(
        {
          error: "Post invalido.",
          issues: parsedPost.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const { createdAt, id, isFavorite, ...payload } = parsedPost.data;
    const images =
      payload.post.generated_images.length > 0
        ? payload.post.generated_images
        : payload.post.generated_image
          ? [payload.post.generated_image]
          : [];

    if (images.some((image) => image.startsWith("data:"))) {
      const imageUrls = await uploadPostImages({
        images,
        postId: id,
        userId: user.id
      });

      payload.post.generated_images = imageUrls;
      payload.post.generated_image = imageUrls[0] || null;
    }

    const database = getDatabase();

    const saveResult = await database.query(
      `insert into saved_posts (id, user_id, created_at, is_favorite, payload)
       values ($1, $2, $3, $4, $5)
       on conflict (id)
       do update set
         created_at = excluded.created_at,
         is_favorite = excluded.is_favorite,
         payload = excluded.payload
       where saved_posts.user_id = excluded.user_id
       returning id`,
      [id, user.id, createdAt, isFavorite, payload]
    );

    if (saveResult.rowCount === 0) {
      return NextResponse.json({ error: "Post nao autorizado." }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar o post."
      },
      { status: 500 }
    );
  }
}
