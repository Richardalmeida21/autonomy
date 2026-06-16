import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db";
import { generatedPostZodSchema } from "@/lib/post-schema";

const savedPostSchema = generatedPostZodSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string()
});

export const runtime = "nodejs";

export async function GET() {
  try {
    const database = getDatabase();
    const result = await database.query(
      `select id, created_at, payload
       from saved_posts
       order by created_at desc`
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
      `insert into saved_posts (id, created_at, payload)
       values ($1, $2, $3)
       on conflict (id)
       do update set created_at = excluded.created_at, payload = excluded.payload`,
      [id, createdAt, payload]
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
