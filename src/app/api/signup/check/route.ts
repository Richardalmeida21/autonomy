import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

const signupCheckSchema = z.object({
  document: z.string().min(5),
  email: z.string().email()
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimit = checkRateLimit({
      identifier: `signup:check:${ip}`,
      limit: 20,
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

    const body = await request.json();
    const parsedCheck = signupCheckSchema.safeParse(body);

    if (!parsedCheck.success) {
      return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
    }

    const database = getDatabase();
    const result = await database.query(
      `select
         exists (
           select 1 from profiles
           where lower(email) = lower($1)
         ) as email_exists,
         exists (
           select 1 from profiles
           where regexp_replace(coalesce(document, ''), '\\D', '', 'g') = $2
         ) as document_exists`,
      [parsedCheck.data.email, normalizeDocument(parsedCheck.data.document)]
    );

    return NextResponse.json({
      documentExists: Boolean(result.rows[0]?.document_exists),
      emailExists: Boolean(result.rows[0]?.email_exists)
    });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel verificar o cadastro." },
      { status: 500 }
    );
  }
}

function normalizeDocument(document: string) {
  return document.replace(/\D/g, "");
}
