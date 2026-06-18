import { NextResponse } from "next/server";
import { ensureCreditsSchema } from "@/lib/credits";
import { getDatabase } from "@/lib/db";
import { plans } from "@/lib/plans";
import { getUserFromRequest } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const database = getDatabase();
    await ensureCreditsSchema(database);
    const result = await database.query(
      `select
         coalesce(p.credits_limit, $2)::int as credits_limit,
         coalesce(p.credits_used, 0)::int as used_credits,
         coalesce(p.credits_reserved, 0)::int as reserved_credits
       from profiles p
       where p.id = $1`,
      [user.id, plans[1].creditLimit]
    );

    const creditsLimit = Number(
      result.rows[0]?.credits_limit || plans[1].creditLimit
    );
    const usedCredits = Number(result.rows[0]?.used_credits || 0);
    const reservedCredits = Number(result.rows[0]?.reserved_credits || 0);
    const committedAndReservedCredits = usedCredits + reservedCredits;
    const remainingCredits = Math.max(
      creditsLimit - committedAndReservedCredits,
      0
    );
    const usagePercent =
      creditsLimit > 0
        ? Math.min(
            Math.round((committedAndReservedCredits / creditsLimit) * 100),
            100
          )
        : 0;

    return NextResponse.json({
      creditsLimit,
      remainingCredits,
      usedCredits: committedAndReservedCredits,
      usagePercent
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar o uso."
      },
      { status: 500 }
    );
  }
}
