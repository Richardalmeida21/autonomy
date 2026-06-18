import { NextResponse } from "next/server";
import { createMetaOAuthUrl } from "@/lib/meta";
import { checkRateLimit } from "@/lib/rate-limit";
import { getUserFromRequest } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const rateLimit = checkRateLimit({
      identifier: `meta:oauth:start:${user.id}`,
      limit: 12,
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
