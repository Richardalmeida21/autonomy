import { NextResponse } from "next/server";
import { createMetaOAuthUrl } from "@/lib/meta";
import { getUserFromRequest } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    return NextResponse.json({ url: createMetaOAuthUrl(user.id) });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel iniciar conexao com a Meta."
      },
      { status: 500 }
    );
  }
}
