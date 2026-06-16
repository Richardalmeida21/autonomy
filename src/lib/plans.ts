export const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "R$ 59",
    description: "Para criadores e profissionais solo.",
    credits: "50 creditos/mês",
    creditLimit: 50,
    instagramAccounts: "1 conta Instagram",
    featured: false,
    features: [
      "Posts com imagem unica ou carrossel",
      "Biblioteca de posts",
      "Descricao, hashtags e headline inclusas",
      "Download das imagens"
    ],
    stripeEnvKey: "STRIPE_PRICE_STARTER"
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 119",
    description: "Para social medias e negocios em crescimento.",
    credits: "150 creditos/mês",
    creditLimit: 150,
    instagramAccounts: "3 contas Instagram",
    featured: true,
    features: [
      "Tudo do Starter",
      "Mais creditos para carrosseis",
      "Fluxo de aprovacao e biblioteca",
      "Preparado para agendamento"
    ],
    stripeEnvKey: "STRIPE_PRICE_PRO"
  },
  {
    id: "agency",
    name: "Agency",
    price: "R$ 249",
    description: "Para operacoes com varios clientes.",
    credits: "400 creditos/mês",
    creditLimit: 400,
    instagramAccounts: "10 contas Instagram",
    featured: false,
    features: [
      "Tudo do Pro",
      "Volume alto de criativos",
      "Multiplas marcas/clientes",
      "Base para publicacao automatica"
    ],
    stripeEnvKey: "STRIPE_PRICE_AGENCY"
  }
] as const;

export type PlanId = (typeof plans)[number]["id"];

export function getPlan(planId: string) {
  return plans.find((plan) => plan.id === planId);
}
