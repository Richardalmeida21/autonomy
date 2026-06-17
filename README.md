# Autonomy SaaS

SaaS full-stack para gerar um post completo de Instagram a partir do prompt em `autonomy.txt`.

## Stack

- Next.js com App Router
- TypeScript
- OpenAI Responses API
- Structured Outputs com JSON Schema
- Validacao de input com Zod

## Rodando localmente

1. Instale as dependencias:

```bash
npm install
```

2. Crie um arquivo `.env` local:

```bash
New-Item .env
```

3. Configure sua chave:

```bash
OPENAI_API_KEY=sk-proj...
OPENAI_MODEL=gpt-5.4-mini
OPENAI_IMAGE_MODEL=gpt-image-2
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_AGENCY=price_...
META_APP_ID=...
META_APP_SECRET=...
META_REDIRECT_URI=https://useautonomy.com.br/api/meta/oauth/callback
META_GRAPH_VERSION=v23.0
SOCIAL_TOKEN_ENCRYPTION_KEY=base64_com_32_bytes
SUPABASE_POST_IMAGES_BUCKET=post-images
CRON_SECRET=senha_aleatoria_com_16_ou_mais_caracteres
```

4. Rode:

```bash
npm run dev
```

Abra `http://localhost:3000`.

## Rotas principais

- `/` -> landing page com planos
- `/cadastro` -> cadastro e checkout
- `/login` -> login
- `/dashboard` -> gerador de posts
- `/sucesso` -> retorno de checkout aprovado
- `/cancelado` -> checkout cancelado
- `/api/stripe/webhook` -> webhook da Stripe para atualizar assinatura
- `/api/meta/oauth/start` -> inicia conexao Facebook/Instagram
- `/api/meta/oauth/callback` -> callback OAuth da Meta
- `/api/cron/publish-scheduled` -> publica posts agendados

## Como funciona

O backend le `autonomy.txt` e envia esse conteudo como instrucao principal para a OpenAI. O endpoint `POST /api/generate-post` aceita dois modos:

### Criativo

```json
{
  "modo": "criativo",
  "nicho": "Clinica de estetica",
  "tema": "Tratamentos faciais que parecem naturais",
  "formato_visual": "imagem_unica",
  "detalhes_imagem": "Mulher em uma clinica moderna, pele natural e iluminada, segurando um espelho pequeno, fundo limpo em tons claros."
}
```

Para carrossel:

```json
{
  "modo": "criativo",
  "nicho": "Nutricionista",
  "tema": "Como calcular macros diarios",
  "formato_visual": "carrossel",
  "quantidade_imagens": 3,
  "detalhes_carrossel": [
    "Slide 1 com fundo verde claro, frutas, verduras, carnes, ovos e folhas. Texto exato: \"O que sao macronutrientes?\"",
    "Slide 2 com fundo verde claro e texto exato: \"Macronutrientes sao proteinas, carboidratos e gorduras: eles dao energia e estrutura ao corpo.\"",
    "Slide 3 com fundo verde claro e texto exato: \"Calcule seus macros usando objetivo, peso, rotina e nivel de atividade.\""
  ]
}
```

Para carrossel, cada item de `detalhes_carrossel` e usado isoladamente no prompt da respectiva imagem. Se quiser texto no slide, escreva a frase final entre aspas para reduzir repeticao ou interpretacao errada.

### Contextual

```json
{
  "modo": "contextual",
  "nicho": "Salao de beleza",
  "tema": "Cores de cabelo tendencia 2026",
  "contexto": "Como escolher a cor que valoriza o tom de pele",
  "possui_imagem_propria": true,
  "analise_da_imagem_do_usuario": "Foto de uma mulher de perfil mostrando cabelo loiro platinado."
}
```

## Proximos blocos para vender como SaaS

- Autenticacao: Clerk, Auth.js ou Supabase Auth.
- Banco de dados: Postgres com Prisma para salvar posts, marcas, usuarios e historico.
- Pagamentos: Stripe Checkout e portal de assinatura.
- Fila: Inngest, Trigger.dev ou BullMQ para geracoes longas.
- Storage: S3, Cloudflare R2 ou Supabase Storage para imagens enviadas.
- Visao automatica: endpoint separado para analisar imagem antes de chamar o gerador principal.

## Geracao de imagem

No modo criativo, o clique em `Gerar posts completos` gera automaticamente:

- 1 copy completa
- 1 headline
- 1 conjunto de hashtags
- 1 imagem final ou ate 4 imagens de carrossel

O app primeiro gera a estrategia/copy com `POST /api/generate-post` e, dentro do mesmo fluxo, gera as imagens a partir dos prompts visuais retornados pela IA e dos detalhes visuais informados pelo usuario.

Por padrao, a imagem usa:

- Modelo: `gpt-image-2`
- Tamanho: `1024x1024`
- Qualidade: `medium`

Esse fluxo reduz custo porque gera apenas uma imagem por clique.

## Biblioteca local

A aba `Meus posts` salva posts no banco Postgres/Supabase usando `DATABASE_URL`.

Para criar a tabela:

```bash
npm run db:init
```

Se a conexao direta do Supabase falhar por DNS/IPv6, copie o conteudo de `supabase-schema.sql` e rode no SQL Editor do Supabase, ou use a connection string do Transaction Pooler no `DATABASE_URL`.

## Seguranca e billing

As rotas de geracao, perfil, biblioteca e checkout exigem token Supabase no header `Authorization: Bearer ...`.

O consumo de creditos e registrado no banco em `usage_events`. A API recalcula o custo no servidor antes de chamar a OpenAI, entao alterar o frontend nao libera geracoes extras.

No Stripe, crie um endpoint de webhook apontando para:

```bash
https://seu-dominio.vercel.app/api/stripe/webhook
```

Eventos recomendados:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copie o `Signing secret` do webhook para `STRIPE_WEBHOOK_SECRET` na Vercel.

## Publicacao automatica no Instagram

O Autonomy usa a Instagram Graph API oficial. O fluxo implementado e:

1. Usuario conecta Facebook/Instagram pelo OAuth da Meta.
2. O backend salva o Page Access Token criptografado em `social_accounts`.
3. Ao agendar, as imagens base64 sao enviadas para o bucket publico `post-images` no Supabase Storage.
4. O post entra em `scheduled_posts` com status `pending`.
5. A Vercel Cron chama `/api/cron/publish-scheduled` a cada 5 minutos.
6. O backend cria o media container no Instagram, espera ficar pronto e publica.

No painel da Meta, configure o OAuth redirect URI:

```bash
https://useautonomy.com.br/api/meta/oauth/callback
```

Permissoes usadas:

- `pages_show_list`
- `instagram_business_basic`
- `instagram_business_content_publish`

Para gerar `SOCIAL_TOKEN_ENCRYPTION_KEY` localmente:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Na Vercel, adicione `CRON_SECRET`. A Vercel envia esse valor automaticamente no header `Authorization` quando chama o cron.

Observacao: a conta do Instagram precisa ser profissional (Business ou Creator) e vinculada a uma Pagina do Facebook administrada pelo usuario.

## Referencias oficiais usadas

- OpenAI recomenda a Responses API para novos projetos.
- Structured Outputs garante aderencia a JSON Schema quando suportado pelo modelo.
