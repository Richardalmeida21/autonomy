import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db";
import { generatedPostZodSchema } from "@/lib/post-schema";
import { getUserFromRequest } from "@/lib/supabase-server";

const paramsSchema = z.object({
  id: z.string().uuid()
});

export const runtime = "nodejs";

const updatePostSchema = z.object({
  isFavorite: z.boolean().optional(),
  post: generatedPostZodSchema.optional()
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const params = paramsSchema.safeParse(await context.params);

    if (!params.success) {
      return NextResponse.json({ error: "ID invalido." }, { status: 400 });
    }

    const body = await request.json();
    const parsedBody = updatePostSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: "Atualizacao invalida." }, { status: 400 });
    }

    if (
      typeof parsedBody.data.isFavorite === "undefined" &&
      typeof parsedBody.data.post === "undefined"
    ) {
      return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
    }

    const database = getDatabase();
    const result = await database.query(
      `update saved_posts
       set
         is_favorite = coalesce($3, is_favorite),
         payload = coalesce($4::jsonb, payload)
       where id = $1 and user_id = $2`,
      [
        params.data.id,
        user.id,
        parsedBody.data.isFavorite,
        parsedBody.data.post ? JSON.stringify(parsedBody.data.post) : null
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Post nao encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel atualizar o post."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(_request);

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const params = paramsSchema.safeParse(await context.params);

    if (!params.success) {
      return NextResponse.json({ error: "ID invalido." }, { status: 400 });
    }

    const database = getDatabase();
    await database.query("delete from saved_posts where id = $1 and user_id = $2", [
      params.data.id,
      user.id
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel remover o post."
      },
      { status: 500 }
    );
  }
}
