import { NextResponse } from "next/server";
import { toFile } from "openai";
import { getAutonomyPrompt } from "@/lib/autonomy-prompt";
import { getDatabase } from "@/lib/db";
import { getGenerationModel, getImageModel, getOpenAIClient } from "@/lib/openai";
import { getPlan, plans } from "@/lib/plans";
import { uploadPostImages } from "@/lib/post-images";
import { checkRateLimit } from "@/lib/rate-limit";
import type { PoolClient, Pool } from "pg";
import {
  generatedPostSchema,
  generatedPostZodSchema,
  postInputSchema,
  type PostInput
} from "@/lib/post-schema";
import { getUserFromRequest } from "@/lib/supabase-server";

export const runtime = "nodejs";

type QueryableDatabase = Pick<Pool | PoolClient, "query">;
const STALE_RESERVATION_INTERVAL = "30 minutes";

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

      await reserveUsageEvent({
        database: transaction,
        creditCost,
        reservationId,
        metadata: {
          mode: parsedInput.data.modo,
          niche: parsedInput.data.nicho,
          theme: parsedInput.data.tema,
          visual_format:
            parsedInput.data.modo === "criativo"
              ? parsedInput.data.formato_visual
              : "contextual",
          status: "reserved",
          credits_before: usage.usedCredits,
          credits_after: usage.usedCredits + creditCost,
          credits_limit: usage.creditLimit
        },
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
            text: JSON.stringify(input, null, 2)
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
  try {
    const uploadedImage = await dataUrlToFile(input.imagem_do_usuario);
    const prompt = [
      "Create a polished square Instagram feed image based on the uploaded image.",
      "Preserve the uploaded image's main identity, logo, brand mark, objects, colors, and important visual features.",
      "Apply only the requested contextual social-media composition changes.",
      "",
      "POST CONTEXT:",
      input.contexto,
      "",
      "USER IMAGE DESCRIPTION:",
      input.analise_da_imagem_do_usuario,
      "",
      "OVERLAY AND DESIGN INSTRUCTIONS:",
      overlayInstructions || "Use a clean premium layout with balanced spacing.",
      "",
      `If text is needed, use only this Portuguese headline: "${headline}".`,
      "If the user asks for a logo placement, keep the uploaded logo recognizable and place it exactly as requested.",
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
    return image ? `data:image/png;base64,${image}` : null;
  } catch {
    return null;
  }
}

async function dataUrlToFile(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);

  if (!match) {
    throw new Error("Formato de imagem invalido para upload.");
  }

  const [, contentType, base64] = match;
  const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];

  return toFile(Buffer.from(base64, "base64"), `contextual-image.${extension}`, {
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
  if (input.modo === "contextual") {
    return 1;
  }

  if (input.formato_visual === "carrossel") {
    return input.quantidade_imagens || input.detalhes_carrossel?.length || 1;
  }

  return 1;
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
  const profile = await ensureProfile({
    database,
    email,
    metadata,
    planId: "pro",
    userId
  });

  if (!["active", "trialing"].includes(profile.subscription_status || "")) {
    throw new Error("Assinatura inativa. Atualize o pagamento para gerar posts.");
  }

  const usageResult = await database.query(
    `select coalesce(sum(credits_used), 0)::int as used_credits
     from usage_events
     where user_id = $1
       and created_at >= date_trunc('month', now())
       and not (
         metadata->>'status' = 'reserved'
         and created_at < now() - $2::interval
       )`,
    [userId, STALE_RESERVATION_INTERVAL]
  );
  const usedCredits = Number(usageResult.rows[0]?.used_credits || 0);
  const creditLimit = Number(profile.credits_limit || plans[1].creditLimit);

  if (usedCredits + creditCost > creditLimit) {
    throw new Error(
      `Creditos insuficientes. Este post usa ${creditCost} credito(s), voce tem ${Math.max(
        creditLimit - usedCredits,
        0
      )} restante(s).`
    );
  }

  if (
    input.modo === "criativo" &&
    input.formato_visual === "carrossel" &&
    creditCost > 4
  ) {
    throw new Error("Carrossel limitado a 4 imagens.");
  }

  return { creditLimit, usedCredits };
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
    `select id, email, plan, subscription_status, credits_limit
     from profiles
     where id = $1`,
    [userId]
  );

  if (currentProfile.rowCount && currentProfile.rows[0]) {
    return currentProfile.rows[0] as {
      id: string;
      email: string;
      plan: string;
      subscription_status: string | null;
      credits_limit: number;
    };
  }

  const plan = getPlan(planId) || plans[1];
  const insertedProfile = await database.query(
    `insert into profiles (id, email, full_name, document, phone, plan, credits_limit)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id, email, plan, subscription_status, credits_limit`,
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

  return insertedProfile.rows[0] as {
    id: string;
    email: string;
    plan: string;
    subscription_status: string | null;
    credits_limit: number;
  };
}

async function reserveUsageEvent({
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
  database,
  generatedImages,
  reservationId,
  userId
}: {
  database: QueryableDatabase;
  generatedImages: number;
  reservationId: string;
  userId: string;
}) {
  const result = await database.query(
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

  if (result.rowCount === 0) {
    throw new Error("Nao foi possivel confirmar o uso de creditos.");
  }
}

async function refundUsageReservation({
  database,
  reservationId,
  userId
}: {
  database: QueryableDatabase;
  reservationId: string;
  userId: string;
}) {
  await database.query(
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
