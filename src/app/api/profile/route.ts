import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db";
import { plans } from "@/lib/plans";
import { getUserFromRequest } from "@/lib/supabase-server";

const profileInputSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  document: z.string().min(5),
  phone: z.string().min(8),
  plan: z.string()
});

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const database = getDatabase();
    const result = await database.query(
      `select id, email, full_name, document, phone, plan, stripe_customer_id,
              stripe_subscription_id, subscription_status, credits_limit,
              created_at, updated_at
       from profiles
       where id = $1`,
      [user.id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({
        id: user.id,
        email: user.email || "",
        full_name: user.user_metadata.full_name || "",
        document: user.user_metadata.document || "",
        phone: user.user_metadata.phone || "",
        plan: user.user_metadata.plan || "pro",
        credits_limit: plans[1].creditLimit,
        subscription_status: null
      });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Nao foi possivel carregar perfil."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const parsedProfile = profileInputSchema.safeParse(body);

    if (!parsedProfile.success) {
      return NextResponse.json(
        {
          error: "Perfil invalido.",
          issues: parsedProfile.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const plan =
      plans.find((candidate) => candidate.id === parsedProfile.data.plan) ||
      plans[1];
    const database = getDatabase();

    await database.query(
      `insert into profiles (id, email, full_name, document, phone, plan, credits_limit)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (id)
       do update set
         email = excluded.email,
         full_name = excluded.full_name,
         document = excluded.document,
         phone = excluded.phone,
         plan = excluded.plan,
         credits_limit = excluded.credits_limit`,
      [
        user.id,
        parsedProfile.data.email,
        parsedProfile.data.fullName,
        parsedProfile.data.document,
        parsedProfile.data.phone,
        plan.id,
        plan.creditLimit
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Nao foi possivel salvar perfil."
      },
      { status: 500 }
    );
  }
}
