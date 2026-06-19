## Produção Stripe

Para tirar o checkout do modo desenvolvimento, configure as variáveis de ambiente do deploy com os valores do Stripe em modo **Produção**:

- `STRIPE_SECRET_KEY`: chave secreta `sk_live_...`
- `STRIPE_WEBHOOK_SECRET`: segredo do endpoint webhook de produção
- `STRIPE_PRICE_STARTER`: price ID do plano Starter criado em produção
- `STRIPE_PRICE_PRO`: price ID do plano Pro criado em produção
- `STRIPE_PRICE_AGENCY`: price ID do plano Agency criado em produção
- `NEXT_PUBLIC_APP_URL`: domínio público do app, por exemplo `https://autonomyai.com.br`

No Dashboard Stripe, use **Alternar para conta de produção**, crie/recrie os produtos e preços no modo produção, e cadastre o webhook apontando para:

```text
https://seu-dominio.com/api/stripe/webhook
```

Eventos necessários:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Depois de atualizar as variáveis no provedor de deploy, faça um novo deploy. O app bloqueia `sk_test_...` quando `NODE_ENV=production` para evitar checkout de teste em produção.
