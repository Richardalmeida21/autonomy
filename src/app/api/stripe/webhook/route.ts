import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getDatabase } from "@/lib/db";
import { getPlan, plans } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook Stripe nao configurado." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const payload = await request.text();
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Assinatura do webhook invalida."
      },
      { status: 400 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object);
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await handleSubscriptionChanged(event.data.object);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel processar webhook Stripe."
      },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id || session.client_reference_id;
  const planId = session.metadata?.plan || "pro";
  const plan = getPlan(planId) || plans[1];

  if (!userId) {
    return;
  }

  const database = getDatabase();
  await database.query(
    `update profiles
     set stripe_customer_id = $2,
         stripe_subscription_id = $3,
         subscription_status = $4,
         plan = $5,
         credits_limit = $6
     where id = $1`,
    [
      userId,
      getStripeId(session.customer),
      getStripeId(session.subscription),
      "active",
      plan.id,
      plan.creditLimit
    ]
  );
}

async function handleSubscriptionChanged(subscription: Stripe.Subscription) {
  const database = getDatabase();
  await database.query(
    `update profiles
     set subscription_status = $2
     where stripe_subscription_id = $1`,
    [subscription.id, subscription.status]
  );
}

function getStripeId(
  value:
    | string
    | Stripe.Customer
    | Stripe.DeletedCustomer
    | Stripe.Subscription
    | null
) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}
