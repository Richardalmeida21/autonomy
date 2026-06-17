import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db";
import { getPlan } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";
import { getUserFromRequest } from "@/lib/supabase-server";

const checkoutSchema = z.object({
  plan: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  document: z.string().optional(),
  phone: z.string().optional()
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const parsedCheckout = checkoutSchema.safeParse(body);

    if (!parsedCheckout.success) {
      return NextResponse.json(
        {
          error: "Dados invalidos.",
          issues: parsedCheckout.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const plan = getPlan(parsedCheckout.data.plan);

    if (!plan) {
      return NextResponse.json({ error: "Plano invalido." }, { status: 400 });
    }

    const priceId = process.env[plan.stripeEnvKey];

    if (!priceId) {
      return NextResponse.json(
        { error: `Preco Stripe nao configurado para o plano ${plan.name}.` },
        { status: 500 }
      );
    }

    const origin =
      request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "";
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
        parsedCheckout.data.email,
        parsedCheckout.data.name || "",
        parsedCheckout.data.document || "",
        parsedCheckout.data.phone || "",
        plan.id,
        plan.creditLimit
      ]
    );

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: parsedCheckout.data.email,
      client_reference_id: user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      metadata: {
        user_id: user.id,
        plan: plan.id,
        name: parsedCheckout.data.name || "",
        document: parsedCheckout.data.document || "",
        phone: parsedCheckout.data.phone || ""
      },
      success_url: `${origin}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancelado`
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel iniciar o checkout."
      },
      { status: 500 }
    );
  }
}
