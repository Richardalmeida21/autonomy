import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY nao configurada.");
  }

  if (process.env.NODE_ENV === "production" && stripeSecretKey.startsWith("sk_test_")) {
    throw new Error("STRIPE_SECRET_KEY esta em modo teste. Use uma chave sk_live em producao.");
  }

  if (!stripe) {
    stripe = new Stripe(stripeSecretKey);
  }

  return stripe;
}
