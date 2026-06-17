import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db";
import { getUserFromRequest } from "@/lib/supabase-server";

const paramsSchema = z.object({
  id: z.string().uuid()
});

export const runtime = "nodejs";

export async function DELETE(
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
      return NextResponse.json({ error: "Conta invalida." }, { status: 400 });
    }

    const database = getDatabase();
    await database.query(
      `update social_accounts
       set status = 'disconnected'
       where id = $1 and user_id = $2`,
      [params.data.id, user.id]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel desconectar a conta."
      },
      { status: 500 }
    );
  }
}
