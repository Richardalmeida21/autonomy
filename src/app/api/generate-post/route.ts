import { NextResponse } from "next/server";
import { getAutonomyPrompt } from "@/lib/autonomy-prompt";
import { getDatabase } from "@/lib/db";
import { getGenerationModel, getImageModel, getOpenAIClient } from "@/lib/openai";
import { getPlan, plans } from "@/lib/plans";
import { uploadPostImages } from "@/lib/post-images";
import {
  generatedPostSchema,
  generatedPostZodSchema,
  postInputSchema,
  type PostInput
} from "@/lib/post-schema";
import { getUserFromRequest } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
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
    const usage = await assertGenerationAllowed({
      userId: user.id,
      email: user.email || "",
      metadata: user.user_metadata,
      input: parsedInput.data,
      creditCost
    });

    const client = getOpenAIClient();
    const systemPrompt = await getAutonomyPrompt();

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
              text: JSON.stringify(parsedInput.data, null, 2)
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
      return NextResponse.json(
        { error: "A IA nao retornou conteudo utilizavel." },
        { status: 502 }
      );
    }

    const parsedOutput = generatedPostZodSchema.safeParse(JSON.parse(outputText));

    if (!parsedOutput.success) {
      return NextResponse.json(
        {
          error: "A IA retornou um formato inesperado.",
          issues: parsedOutput.error.flatten().fieldErrors
        },
        { status: 502 }
      );
    }

    const generatedPost = parsedOutput.data;

    if (parsedInput.data.modo === "criativo") {
      generatedPost.formato_visual = parsedInput.data.formato_visual;

      if (parsedInput.data.formato_visual === "imagem_unica") {
        const image = await generateImageForOption({
          prompt: generatedPost.post.image_generation_prompt,
          headline: generatedPost.post.headline_da_imagem,
          visualDetail: parsedInput.data.detalhes_imagem || "",
          client
        });

        generatedPost.post.generated_image = image;
        generatedPost.post.generated_images = image ? [image] : [];
      }

      if (parsedInput.data.formato_visual === "carrossel") {
        const details = parsedInput.data.detalhes_carrossel || [];
        const totalSlides = details.length;
        const images = await Promise.all(
          details.map((visualDetail, index) =>
            generateImageForOption({
              prompt: generatedPost.post.image_generation_prompt,
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
          userId: user.id
        });

        generatedPost.post.generated_images = imageUrls;
        generatedPost.post.generated_image = imageUrls[0] || null;
      }
    }

    await recordUsageEvent({
      userId: user.id,
      creditCost,
      metadata: {
        mode: parsedInput.data.modo,
        niche: parsedInput.data.nicho,
        theme: parsedInput.data.tema,
        visual_format:
          parsedInput.data.modo === "criativo"
            ? parsedInput.data.formato_visual
            : "contextual",
        generated_images: generatedPost.post.generated_images.length,
        credits_before: usage.usedCredits,
        credits_limit: usage.creditLimit
      }
    });

    return NextResponse.json(generatedPost);
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
  if (!prompt) {
    return null;
  }

  const textRules = isCarousel
    ? [
        "CAROUSEL TEXT RULES:",
        "Do not use the overall post headline unless the user explicitly wrote it in this slide's mandatory requirements.",
        "Only include readable text that is explicitly requested in this slide's mandatory requirements.",
        "If the user asks for explanatory text without giving the exact words, write a short, accurate Portuguese explanation specifically for this slide.",
        "Never repeat text from another carousel slide unless this slide's mandatory requirements ask for it."
      ]
    : [
        "SINGLE IMAGE TEXT RULES:",
        `If text appears in the image, use only this exact Portuguese headline: "${headline}".`
      ];
  const layoutRule = isCarousel
    ? "Use a complete slide layout that matches only this slide's purpose. Do not make every slide look like a cover."
    : "Leave enough negative space for the headline and keep the main subject visible.";

  const finalPrompt = [
    "MANDATORY USER VISUAL REQUIREMENTS FOR THIS IMAGE:",
    visualDetail,
    "",
    "These mandatory requirements have priority over all other style directions. Follow them literally.",
    "Preserve the requested objects, scene, people, action, framing, colors, background, and composition whenever specified.",
    "Do not swap the requested subject for a generic substitute. Do not add unrelated concepts that contradict the mandatory requirements.",
    "",
    prompt,
    "",
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
    quality: "medium",
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
  email,
  input,
  metadata,
  userId
}: {
  creditCost: number;
  email: string;
  input: PostInput;
  metadata: Record<string, unknown>;
  userId: string;
}) {
  const database = getDatabase();
  const profile = await ensureProfile({
    database,
    email,
    metadata,
    planId: String(metadata.plan || "pro"),
    userId
  });

  if (
    profile.subscription_status &&
    !["active", "trialing"].includes(profile.subscription_status)
  ) {
    throw new Error("Assinatura inativa. Atualize o pagamento para gerar posts.");
  }

  const usageResult = await database.query(
    `select coalesce(sum(credits_used), 0)::int as used_credits
     from usage_events
     where user_id = $1
       and created_at >= date_trunc('month', now())`,
    [userId]
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

async function ensureProfile({
  database,
  email,
  metadata,
  planId,
  userId
}: {
  database: ReturnType<typeof getDatabase>;
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

async function recordUsageEvent({
  creditCost,
  metadata,
  userId
}: {
  creditCost: number;
  metadata: Record<string, unknown>;
  userId: string;
}) {
  const database = getDatabase();

  await database.query(
    `insert into usage_events (user_id, event_type, credits_used, metadata)
     values ($1, $2, $3, $4)`,
    [userId, "generate_post", creditCost, metadata]
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
