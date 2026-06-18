import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const database = getDatabase();
    await database.query("select 1");

    return NextResponse.json({
      ok: true
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Falha ao conectar no banco."
      },
      { status: 500 }
    );
  }
}
