import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const database = getDatabase();
    const result = await database.query(
      "select count(*)::int as saved_posts from saved_posts"
    );

    return NextResponse.json({
      ok: true,
      saved_posts: result.rows[0]?.saved_posts ?? 0
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error && error.message
            ? error.message
            : "Falha ao conectar no banco."
      },
      { status: 500 }
    );
  }
}
