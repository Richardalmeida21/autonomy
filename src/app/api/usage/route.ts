import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { plans } from "@/lib/plans";
import { getUserFromRequest } from "@/lib/supabase-server";

export const runtime = "nodejs";
const STALE_RESERVATION_INTERVAL = "30 minutes";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const database = getDatabase();
    const result = await database.query(
      `select
         coalesce(p.credits_limit, $2)::int as credits_limit,
         coalesce(sum(u.credits_used), 0)::int as used_credits
       from profiles p
       left join usage_events u
         on u.user_id = p.id
        and u.created_at >= date_trunc('month', now())
        and not (
          u.metadata->>'status' = 'reserved'
          and u.created_at < now() - $3::interval
        )
       where p.id = $1
       group by p.credits_limit`,
      [user.id, plans[1].creditLimit, STALE_RESERVATION_INTERVAL]
    );

    const creditsLimit = Number(
      result.rows[0]?.credits_limit || plans[1].creditLimit
    );
    const usedCredits = Number(result.rows[0]?.used_credits || 0);
    const remainingCredits = Math.max(creditsLimit - usedCredits, 0);
    const usagePercent =
      creditsLimit > 0
        ? Math.min(Math.round((usedCredits / creditsLimit) * 100), 100)
        : 0;

    return NextResponse.json({
      creditsLimit,
      remainingCredits,
      usedCredits,
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
