import { NextResponse } from "next/server";
import { toFile } from "openai";
import { getAutonomyPrompt } from "@/lib/autonomy-prompt";
import { ensureCreditsSchema } from "@/lib/credits";
import { getDatabase } from "@/lib/db";
import { getGenerationModel, getImageModel, getOpenAIClient } from "@/lib/openai";
import { getPlan, plans } from "@/lib/plans";
import { uploadPostImages } from "@/lib/post-images";
import { checkRateLimit } from "@/lib/rate-limit";
import type { PoolClient, Pool } from "pg";
import type Stripe from "stripe";
import {
  generatedPostSchema,
  generatedPostZodSchema,
  postInputSchema,
  type PostInput
} from "@/lib/post-schema";
import { getStripe } from "@/lib/stripe";
import { getUserFromRequest } from "@/lib/supabase-server";

export const runtime = "nodejs";

type QueryableDatabase = Pick<Pool | PoolClient, "query">;

const SIMPLE_POST_CREDIT_COST = 2;
const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"] as const;

type Profile = {
  id: string;
  email: string;
  plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  credits_limit: number;
};

type TextOnlyPostInput =
  | Extract<PostInput, { modo: "criativo" }>
  | Omit<Extract<PostInput, { modo: "contextual" }>, "imagem_do_usuario">
  | Omit<Extract<PostInput, { modo: "produto" }>, "produto_imagens">;

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const rateLimit = checkRateLimit({
      identifier: `generate:${user.id}`,
      limit: 8,
      windowMs: 60 * 1000
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Muitas geracoes em pouco tempo. Tente novamente em instantes." },
        {
          headers: { "Retry-After": String(rateLimit.retryAfter) },
          status: 429
        }
      );
    }

    const body = await request.json();
    const parsedInput = postInputSchema.safeParse(body);

    if (!parsedInput.success) {
      return NextResponse.json(
        {
          error: "Dados invalidos.",
          issues: parsedInput.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const creditCost = getGenerationCreditCost(parsedInput.data);
    const database = getDatabase();
    await ensureCreditsSchema(database);
    const client = getOpenAIClient();
    const systemPrompt = await getAutonomyPrompt();
    const reservationId = crypto.randomUUID();
    const startedAt = Date.now();
    const transaction = await database.connect();
    let usage: { creditLimit: number; usedCredits: number };

    try {
      await transaction.query("begin");
      await lockUserCredits({ database: transaction, userId: user.id });

      usage = await assertGenerationAllowed({
        database: transaction,
        userId: user.id,
        email: user.email || "",
        metadata: user.user_metadata,
        input: parsedInput.data,
        creditCost
      });

      await reserveCredits({
        database: transaction,
        creditCost,
        metadata: {
          mode: parsedInput.data.modo,
          niche: parsedInput.data.nicho,
          theme: parsedInput.data.tema,
          visual_format:
            parsedInput.data.modo === "criativo"
              ? parsedInput.data.formato_visual
              : parsedInput.data.modo,
          status: "reserved",
          credits_before: usage.usedCredits,
          credits_after: usage.usedCredits + creditCost,
          credits_limit: usage.creditLimit
        },
        reservationId,
        userId: user.id
      });

      await transaction.query("commit");
    } catch (error) {
      await transaction.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      transaction.release();
    }

    try {
      const generatedPost = await generatePost({
        client,
        input: parsedInput.data,
        systemPrompt,
        userId: user.id
      });

      await completeUsageReservation({
        database,
        creditCost,
        generatedImages: generatedPost.post.generated_images.length,
        reservationId,
        userId: user.id
      });

      console.info("generate-post completed", {
        duration_ms: Date.now() - startedAt,
        images: generatedPost.post.generated_images.length,
        mode: parsedInput.data.modo,
        reservation_id: reservationId,
        user_id: user.id
      });

      return NextResponse.json(generatedPost);
    } catch (error) {
      await refundUsageReservation({
        creditCost,
        database,
        reservationId,
        userId: user.id
      }).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro inesperado ao gerar post.";
    const status = getErrorStatus(message);

    return NextResponse.json(
      {
        error: message
      },
      { status }
    );
  }
}

async function generatePost({
  client,
  input,
  systemPrompt,
  userId
}: {
  client: ReturnType<typeof getOpenAIClient>;
  input: PostInput;
  systemPrompt: string;
  userId: string;
}) {
  const textOnlyInput = getTextOnlyInput(input);

  const response = await client.responses.create({
    model: getGenerationModel(),
    store: false,
    instructions: systemPrompt,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify(textOnlyInput, null, 2)
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "autonomy_instagram_post_options",
        strict: true,
        schema: generatedPostSchema
      }
    }
  });

  const outputText = response.output_text;

  if (!outputText) {
    throw new Error("A IA nao retornou conteudo utilizavel.");
  }

  const parsedOutput = generatedPostZodSchema.safeParse(JSON.parse(outputText));

  if (!parsedOutput.success) {
    throw new Error("A IA retornou um formato inesperado.");
  }

  const generatedPost = parsedOutput.data;

  if (input.modo === "criativo") {
    generatedPost.formato_visual = input.formato_visual;

    if (input.formato_visual === "imagem_unica") {
      const image = await generateImageForOption({
        prompt: generatedPost.post.image_generation_prompt,
        headline: generatedPost.post.headline_da_imagem,
        visualDetail: input.detalhes_imagem || "",
        client
      });

      generatedPost.post.generated_image = image;
      generatedPost.post.generated_images = image ? [image] : [];
    }

    if (input.formato_visual === "carrossel") {
      const details = input.detalhes_carrossel || [];
      const totalSlides = details.length;
      const images = await Promise.all(
        details.map((visualDetail, index) =>
          generateImageForOption({
            prompt: null,
            headline: generatedPost.post.headline_da_imagem,
            visualDetail,
            carouselPosition: index + 1,
            carouselTotal: totalSlides,
            isCarousel: true,
            client
          })
        )
      );

      generatedPost.post.generated_images = images.filter(
        (image): image is string => Boolean(image)
      );
      generatedPost.post.generated_image =
        generatedPost.post.generated_images[0] || null;
    }

    if (generatedPost.post.generated_images.length > 0) {
      const imageUrls = await uploadPostImages({
        images: generatedPost.post.generated_images,
        postId: crypto.randomUUID(),
        userId
      });

      generatedPost.post.generated_images = imageUrls;
      generatedPost.post.generated_image = imageUrls[0] || null;
    }
  }

  if (input.modo === "contextual") {
    generatedPost.formato_visual = null;

    const contextualImage =
      (await generateContextualImageFromUpload({
        client,
        input,
        overlayInstructions: generatedPost.post.overlay_instructions,
        headline: generatedPost.post.headline_da_imagem
      })) || input.imagem_do_usuario;

    const imageUrls = await uploadPostImages({
      images: [contextualImage],
      postId: crypto.randomUUID(),
      userId
    });

    generatedPost.post.generated_images = imageUrls;
    generatedPost.post.generated_image = imageUrls[0] || null;
  }

  if (input.modo === "produto") {
    generatedPost.formato_visual = null;

    const productImage = await generateProductImageFromUploads({
      client,
      headline: generatedPost.post.headline_da_imagem,
      input,
      overlayInstructions: generatedPost.post.overlay_instructions
    });

    const imageUrls = await uploadPostImages({
      images: [productImage],
      postId: crypto.randomUUID(),
      userId
    });

    generatedPost.post.generated_images = imageUrls;
    generatedPost.post.generated_image = imageUrls[0] || null;
  }

  return generatedPost;
}

async function generateContextualImageFromUpload({
  client,
  headline,
  input,
  overlayInstructions
}: {
  client: ReturnType<typeof getOpenAIClient>;
  headline: string;
  input: Extract<PostInput, { modo: "contextual" }>;
  overlayInstructions: string | null;
}) {
  const uploadedImage = await dataUrlToFile(input.imagem_do_usuario);
  const prompt = [
    "Create a polished square Instagram feed image based on the uploaded image.",
    "Follow the user's requested edits literally. The uploaded image is the source of truth.",
    "Preserve the uploaded image's main identity, logo, brand mark, people, hair, face, pose, objects, colors, and important visual features unless the user explicitly asks to change one of them.",
    "When the uploaded image is a logo, keep the logo recognizable and place it exactly where the user requested within the final social-media composition.",
    "When the uploaded image is a person, do not alter the person's appearance, face, hairstyle, hair color, hair texture, makeup, clothing, or pose unless explicitly requested.",
    "Apply only the requested contextual social-media composition changes, such as neutral background, background replacement, crop, spacing, lighting polish, or logo placement.",
    "",
    "BUSINESS NICHE:",
    input.nicho,
    "",
    "POST THEME:",
    input.tema,
    "",
    "POST CONTEXT:",
    input.contexto,
    "",
    "USER'S EXACT IMAGE EDIT REQUEST:",
    input.analise_da_imagem_do_usuario,
    "",
    "OVERLAY AND DESIGN INSTRUCTIONS:",
    overlayInstructions || "Use a clean premium layout with balanced spacing.",
    "",
    `If text is needed, use only this Portuguese headline: "${headline}".`,
    "Do not add fake UI, random words, watermarks, misspellings, or unrelated decorative elements.",
    "Output a clean 1:1 Instagram-ready image."
  ].join("\n");

  const result = await client.images.edit({
    model: getImageModel(),
    image: uploadedImage,
    prompt,
    size: "1024x1024",
    quality: getImageQuality(),
    n: 1
  });

  const image = result.data?.[0]?.b64_json;

  if (!image) {
    throw new Error("Nao foi possivel gerar a imagem contextual.");
  }

  return `data:image/png;base64,${image}`;
}

async function generateProductImageFromUploads({
  client,
  headline,
  input,
  overlayInstructions
}: {
  client: ReturnType<typeof getOpenAIClient>;
  headline: string;
  input: Extract<PostInput, { modo: "produto" }>;
  overlayInstructions: string | null;
}) {
  const uploadedImages = await Promise.all(
    input.produto_imagens.map((image, index) =>
      dataUrlToFile(image, `product-reference-${index + 1}`)
    )
  );
  const prompt = [
    "Create one polished square Instagram product post image using the uploaded product reference image(s).",
    "The uploaded product is the source of truth. Preserve the product exactly.",
    "Do not alter, redesign, restyle, recolor, simplify, replace, or hallucinate any product detail.",
    "Preserve the exact product shape, proportions, material, color, texture, pattern, print, logo, label, stitching, buttons, packaging, typography, and visible defects or unique details.",
    "Use the additional reference images only to understand the same product from multiple angles and preserve its details more accurately.",
    "If the user asks for a model wearing or holding the product, place the exact product from the references on that model without changing the product's design, print, color, fit-defining details, or brand marks.",
    "If the product is clothing, keep the exact garment color, cut, print, fabric texture, seams, collar, sleeves, and visible design details from the uploaded references.",
    "If the product is not clothing, keep its exact industrial design, packaging, labels, proportions, color, texture, and identifying marks from the uploaded references.",
    "",
    "BUSINESS NICHE:",
    input.nicho,
    "",
    "POST THEME:",
    input.tema,
    "",
    "REQUESTED BACKGROUND:",
    input.fundo_do_post,
    "",
    "ADDITIONAL USER DETAILS:",
    input.detalhes_adicionais || "No additional details.",
    "",
    "OVERLAY AND DESIGN INSTRUCTIONS:",
    overlayInstructions || "Use a clean premium layout with balanced spacing.",
    "",
    `If text is needed, use only this Portuguese headline: "${headline}".`,
    "The background, model, props, lighting, and composition may change only to match the user's request.",
    "The product itself must remain visually identical to the uploaded references.",
    "Do not add fake UI, random words, watermarks, misspellings, or unrelated decorative elements.",
    "Output a clean 1:1 Instagram-ready image."
  ].join("\n");

  const result = await client.images.edit({
    model: getImageModel(),
    image: uploadedImages,
    prompt,
    size: "1024x1024",
    quality: getImageQuality(),
    n: 1
  });

  const image = result.data?.[0]?.b64_json;

  if (!image) {
    throw new Error("Nao foi possivel gerar a imagem do produto.");
  }

  return `data:image/png;base64,${image}`;
}

function getTextOnlyInput(input: PostInput): TextOnlyPostInput {
  if (input.modo === "contextual") {
    const { imagem_do_usuario: _image, ...textOnlyInput } = input;
    return textOnlyInput;
  }

  if (input.modo === "produto") {
    const { produto_imagens: _images, ...textOnlyInput } = input;
    return textOnlyInput;
  }

  return input;
}

async function dataUrlToFile(dataUrl: string, basename = "contextual-image") {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);

  if (!match) {
    throw new Error("Formato de imagem invalido para upload.");
  }

  const [, contentType, base64] = match;
  const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];

  return toFile(Buffer.from(base64, "base64"), `${basename}.${extension}`, {
    type: contentType
  });
}

async function generateImageForOption({
  client,
  carouselPosition,
  carouselTotal,
  headline,
  isCarousel = false,
  prompt,
  visualDetail
}: {
  client: ReturnType<typeof getOpenAIClient>;
  carouselPosition?: number;
  carouselTotal?: number;
  headline: string;
  isCarousel?: boolean;
  prompt: string | null;
  visualDetail: string;
}) {
  if (!prompt && !visualDetail.trim()) {
    return null;
  }

  const textRules = isCarousel
    ? [
        "CAROUSEL TEXT RULES:",
        "Do not use the overall post headline unless the user explicitly wrote it in this slide's mandatory requirements.",
        "Only include readable text that is explicitly requested in this slide's mandatory requirements.",
        "If the user asks for explanatory text without giving the exact words, write a short, accurate Portuguese explanation specifically for this slide.",
        "Never repeat text from another carousel slide unless this slide's mandatory requirements ask for it.",
        "If this slide asks for a solid/plain background, do not add border objects, food, decorations, photos, icons, patterns, or extra visual elements."
      ]
    : [
        "SINGLE IMAGE TEXT RULES:",
        `If text appears in the image, use only this exact Portuguese headline: "${headline}".`
      ];
  const layoutRule = isCarousel
    ? "Use a complete slide layout that matches only this slide's purpose. Do not make every slide look like a cover."
    : "Leave enough negative space for the headline and keep the main subject visible.";
  const globalPromptBlock =
    prompt && !isCarousel
      ? [
          "GLOBAL IMAGE DIRECTION:",
          prompt,
          "",
          "Use the global direction only when it does not conflict with the mandatory user requirements above."
        ]
      : [];

  const finalPrompt = [
    isCarousel
      ? "You are generating exactly one square Instagram carousel slide."
      : "You are generating exactly one square Instagram feed image.",
    "The slide-specific requirements below are the source of truth.",
    isCarousel
      ? "Do not infer requirements from any other slide."
      : "Use the mandatory user requirements as the source of truth.",
    "",
    "MANDATORY USER VISUAL REQUIREMENTS FOR THIS IMAGE:",
    visualDetail,
    "",
    "These mandatory requirements have priority over all other style directions. Follow them literally.",
    "If the user specifies a background color, use that background color.",
    "If the user specifies exact text in quotes, render only that exact text, preserving Portuguese spelling and meaning.",
    "If the user says there should be no visual elements, keep the slide minimal and do not add objects.",
    "Preserve the requested objects, scene, people, action, framing, colors, background, and composition whenever specified.",
    "Do not swap the requested subject for a generic substitute. Do not add unrelated concepts that contradict the mandatory requirements.",
    "",
    ...globalPromptBlock,
    "Create a polished square Instagram feed post image in 1:1 aspect ratio.",
    carouselPosition && carouselTotal
      ? `This is carousel slide ${carouselPosition} of ${carouselTotal}. Generate only this slide.`
      : "This is a single standalone Instagram feed image.",
    "The image must look clean, premium, commercial, and native to social media.",
    ...textRules,
    "Do not include watermarks, logos, fake UI, extra random words, misspellings, or distorted text.",
    layoutRule
  ].join("\n");

  const result = await client.images.generate({
    model: getImageModel(),
    prompt: finalPrompt,
    size: "1024x1024",
    quality: getImageQuality(),
    n: 1
  });

  const image = result.data?.[0]?.b64_json;
  return image ? `data:image/png;base64,${image}` : null;
}

function getGenerationCreditCost(input: PostInput) {
  if (input.modo === "contextual" || input.modo === "produto") {
    return SIMPLE_POST_CREDIT_COST;
  }

  if (input.formato_visual === "carrossel") {
    const carouselImageCount = getCarouselImageCount(input);
    return SIMPLE_POST_CREDIT_COST + Math.max(carouselImageCount - 1, 0);
  }

  return SIMPLE_POST_CREDIT_COST;
}

function getCarouselImageCount(input: Extract<PostInput, { modo: "criativo" }>) {
  return input.quantidade_imagens || input.detalhes_carrossel?.length || 1;
}

async function assertGenerationAllowed({
  creditCost,
  database,
  email,
  input,
  metadata,
  userId
}: {
  creditCost: number;
  database: QueryableDatabase;
  email: string;
  input: PostInput;
  metadata: Record<string, unknown>;
  userId: string;
}) {
  let profile = await ensureProfile({
    database,
    email,
    metadata,
    planId: "pro",
    userId
  });

  if (!isActiveSubscriptionStatus(profile.subscription_status)) {
    profile =
      (await syncActiveStripeSubscription({
        database,
        email,
        profile,
        userId
      })) || profile;
  }

  if (!isActiveSubscriptionStatus(profile.subscription_status)) {
    throw new Error("Assinatura inativa. Atualize o pagamento para gerar posts.");
  }

  const usageResult = await database.query(
    `select
       coalesce(credits_used, 0)::int as used_credits,
       coalesce(credits_reserved, 0)::int as reserved_credits,
       coalesce(credits_limit, $2)::int as credits_limit
     from profiles
     where id = $1`,
    [userId, plans[1].creditLimit]
  );
  const usedCredits = Number(usageResult.rows[0]?.used_credits || 0);
  const reservedCredits = Number(usageResult.rows[0]?.reserved_credits || 0);
  const creditLimit = Number(
    usageResult.rows[0]?.credits_limit || profile.credits_limit || plans[1].creditLimit
  );

  if (usedCredits + reservedCredits + creditCost > creditLimit) {
    throw new Error(
      `Creditos insuficientes. Este post usa ${creditCost} credito(s), voce tem ${Math.max(
        creditLimit - usedCredits - reservedCredits,
        0
      )} restante(s).`
    );
  }

  if (
    input.modo === "criativo" &&
    input.formato_visual === "carrossel" &&
    getCarouselImageCount(input) > 4
  ) {
    throw new Error("Carrossel limitado a 4 imagens.");
  }

  return { creditLimit, usedCredits: usedCredits + reservedCredits };
}

function getImageQuality() {
  const quality = process.env.OPENAI_IMAGE_QUALITY;

  if (
    quality === "medium" ||
    quality === "high" ||
    quality === "auto" ||
    quality === "standard"
  ) {
    return quality;
  }

  return "low";
}

async function lockUserCredits({
  database,
  userId
}: {
  database: QueryableDatabase;
  userId: string;
}) {
  await database.query("select pg_advisory_xact_lock(hashtext($1))", [
    `credits:${userId}`
  ]);
}

async function ensureProfile({
  database,
  email,
  metadata,
  planId,
  userId
}: {
  database: QueryableDatabase;
  email: string;
  metadata: Record<string, unknown>;
  planId: string;
  userId: string;
}) {
  const currentProfile = await database.query(
    `select id, email, plan, stripe_customer_id, stripe_subscription_id,
            subscription_status, credits_limit
     from profiles
     where id = $1`,
    [userId]
  );

  if (currentProfile.rowCount && currentProfile.rows[0]) {
    return currentProfile.rows[0] as Profile;
  }

  const plan = getPlan(planId) || plans[1];
  const insertedProfile = await database.query(
    `insert into profiles (id, email, full_name, document, phone, plan, credits_limit)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id, email, plan, stripe_customer_id, stripe_subscription_id,
               subscription_status, credits_limit`,
    [
      userId,
      email,
      String(metadata.full_name || ""),
      String(metadata.document || ""),
      String(metadata.phone || ""),
      plan.id,
      plan.creditLimit
    ]
  );

  return insertedProfile.rows[0] as Profile;
}

async function syncActiveStripeSubscription({
  database,
  email,
  profile,
  userId
}: {
  database: QueryableDatabase;
  email: string;
  profile: Profile;
  userId: string;
}) {
  try {
    const stripe = getStripe();
    const subscription =
      (await getActiveSubscriptionById(stripe, profile.stripe_subscription_id)) ||
      (await findActiveSubscriptionByEmail(stripe, email || profile.email));

    if (!subscription) {
      return null;
    }

    const plan = getPlanFromSubscription(subscription) || getPlan(profile.plan) || plans[1];
    const updatedProfile = await database.query(
      `update profiles
       set stripe_customer_id = $2,
           stripe_subscription_id = $3,
           subscription_status = $4,
           plan = $5,
           credits_limit = $6
       where id = $1
       returning id, email, plan, stripe_customer_id, stripe_subscription_id,
                 subscription_status, credits_limit`,
      [
        userId,
        getStripeId(subscription.customer),
        subscription.id,
        subscription.status,
        plan.id,
        plan.creditLimit
      ]
    );

    return (updatedProfile.rows[0] as Profile | undefined) || null;
  } catch (error) {
    console.warn("Nao foi possivel sincronizar assinatura Stripe", {
      error: error instanceof Error ? error.message : "Erro desconhecido",
      userId
    });
    return null;
  }
}

async function getActiveSubscriptionById(
  stripe: Stripe,
  subscriptionId: string | null
) {
  if (!subscriptionId) {
    return null;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return isActiveSubscriptionStatus(subscription.status) ? subscription : null;
  } catch {
    return null;
  }
}

async function findActiveSubscriptionByEmail(stripe: Stripe, email: string) {
  if (!email) {
    return null;
  }

  const customers = await stripe.customers.list({ email, limit: 10 });

  for (const customer of customers.data) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 100,
      status: "all"
    });
    const activeSubscription = subscriptions.data.find((subscription) =>
      isActiveSubscriptionStatus(subscription.status)
    );

    if (activeSubscription) {
      return activeSubscription;
    }
  }

  return null;
}

function getPlanFromSubscription(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id;
  return plans.find((plan) => process.env[plan.stripeEnvKey] === priceId);
}

function isActiveSubscriptionStatus(status: string | null | undefined) {
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(
    status as (typeof ACTIVE_SUBSCRIPTION_STATUSES)[number]
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

async function reserveCredits({
  creditCost,
  database,
  metadata,
  reservationId,
  userId
}: {
  creditCost: number;
  database: QueryableDatabase;
  metadata: Record<string, unknown>;
  reservationId: string;
  userId: string;
}) {
  await database.query(
    `update profiles
     set credits_reserved = credits_reserved + $2
     where id = $1`,
    [userId, creditCost]
  );

  await database.query(
    `insert into usage_events (user_id, event_type, credits_used, metadata)
     values ($1, $2, $3, $4)`,
    [
      userId,
      "generate_post",
      creditCost,
      {
        ...metadata,
        reservation_id: reservationId
      }
    ]
  );
}

async function completeUsageReservation({
  creditCost,
  database,
  generatedImages,
  reservationId,
  userId
}: {
  creditCost: number;
  database: Pool;
  generatedImages: number;
  reservationId: string;
  userId: string;
}) {
  const transaction = await database.connect();

  try {
    await transaction.query("begin");
    await lockUserCredits({ database: transaction, userId });

    const profileUpdate = await transaction.query(
      `update profiles
       set credits_reserved = greatest(credits_reserved - $2, 0),
           credits_used = credits_used + $2
       where id = $1`,
      [userId, creditCost]
    );

    const eventUpdate = await transaction.query(
      `update usage_events
       set metadata = coalesce(metadata, '{}'::jsonb) || $3::jsonb
       where user_id = $1
         and metadata->>'reservation_id' = $2`,
      [
        userId,
        reservationId,
        JSON.stringify({
          completed_at: new Date().toISOString(),
          generated_images: generatedImages,
          status: "completed"
        })
      ]
    );

    if (profileUpdate.rowCount === 0 || eventUpdate.rowCount === 0) {
      throw new Error("Nao foi possivel confirmar o uso de creditos.");
    }

    await transaction.query("commit");
  } catch (error) {
    await transaction.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    transaction.release();
  }
}

async function refundUsageReservation({
  creditCost,
  database,
  reservationId,
  userId
}: {
  creditCost: number;
  database: Pool;
  reservationId: string;
  userId: string;
}) {
  const transaction = await database.connect();

  try {
    await transaction.query("begin");
    await lockUserCredits({ database: transaction, userId });

    await transaction.query(
      `update profiles
       set credits_reserved = greatest(credits_reserved - $2, 0)
       where id = $1`,
      [userId, creditCost]
    );

    await transaction.query(
      `update usage_events
       set credits_used = 0,
           metadata = coalesce(metadata, '{}'::jsonb) || $3::jsonb
       where user_id = $1
         and metadata->>'reservation_id' = $2
         and metadata->>'status' = 'reserved'`,
      [
        userId,
        reservationId,
        JSON.stringify({
          refunded_at: new Date().toISOString(),
          status: "refunded"
        })
      ]
    );

    await transaction.query("commit");
  } catch (error) {
    await transaction.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    transaction.release();
  }
}

function getErrorStatus(message: string) {
  if (
    message.includes("Nao autenticado") ||
    message.includes("OPENAI_API_KEY")
  ) {
    return message.includes("Nao autenticado") ? 401 : 500;
  }

  if (
    message.includes("Creditos insuficientes") ||
    message.includes("Assinatura inativa")
  ) {
    return 402;
  }

  if (message.includes("Carrossel limitado")) {
    return 400;
  }

  return 502;
}
