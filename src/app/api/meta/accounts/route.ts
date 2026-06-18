import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { getUserFromRequest } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const database = getDatabase();
    const result = await database.query(
      `select id, provider, auth_flow, page_id, page_name, instagram_business_account_id,
              instagram_username, token_expires_at, status, connected_at
       from social_accounts
       where user_id = $1
        and status = 'connected'
       order by connected_at desc`,
      [user.id]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar contas conectadas."
      },
      { status: 500 }
    );
  }
}
