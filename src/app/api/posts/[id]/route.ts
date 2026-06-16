import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db";

const paramsSchema = z.object({
  id: z.string().uuid()
});

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = paramsSchema.safeParse(await context.params);

    if (!params.success) {
      return NextResponse.json({ error: "ID invalido." }, { status: 400 });
    }

    const database = getDatabase();
    await database.query("delete from saved_posts where id = $1", [
      params.data.id
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
