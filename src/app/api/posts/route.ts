import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db";
import { generatedPostZodSchema } from "@/lib/post-schema";
import { getUserFromRequest } from "@/lib/supabase-server";

const savedPostSchema = generatedPostZodSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string()
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
      `select id, created_at, payload
       from saved_posts
       where user_id = $1
       order by created_at desc`,
      [user.id]
    );

    const posts = result.rows.map((row) => ({
      ...row.payload,
      id: row.id,
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

    const { createdAt, id, ...payload } = parsedPost.data;
    const database = getDatabase();

    await database.query(
      `insert into saved_posts (id, user_id, created_at, payload)
       values ($1, $2, $3, $4)
       on conflict (id)
       do update set
         user_id = excluded.user_id,
         created_at = excluded.created_at,
         payload = excluded.payload`,
      [id, user.id, createdAt, payload]
    );

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
