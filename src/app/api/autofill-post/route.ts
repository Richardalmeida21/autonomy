import { NextResponse } from "next/server";
import type { ResponseInputMessageContentList } from "openai/resources/responses/responses";
import { z } from "zod";
import { getGenerationModel, getOpenAIClient } from "@/lib/openai";
import { checkRateLimit } from "@/lib/rate-limit";
import { getUserFromRequest } from "@/lib/supabase-server";

export const runtime = "nodejs";

const autofillRequestSchema = z.object({
  description: z.string().trim().min(8, "Descreva um pouco melhor o post."),
  mode: z.enum(["criativo", "contextual", "produto"]),
  visualFormat: z.enum(["imagem_unica", "carrossel"]).optional(),
  carouselCount: z.number().int().min(2).max(4).optional(),
  language: z.enum(["pt", "en"]).optional(),
  image: z.string().startsWith("data:image/").nullable().optional(),
  productImages: z.array(z.string().startsWith("data:image/")).max(3).optional()
});

const autofillResponseSchema = z.object({
  niche: z.string().trim().min(2),
  theme: z.string().trim().min(3),
  singleImageDetail: z.string().trim().min(10),
  carouselDetails: z.array(z.string().trim().min(10)).min(2).max(4),
  context: z.string().trim().min(10),
  imageAnalysis: z.string().trim().min(10),
  productBackground: z.string().trim().min(10),
  productDetails: z.string().trim().min(10)
});

const autofillJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "niche",
    "theme",
    "singleImageDetail",
    "carouselDetails",
    "context",
    "imageAnalysis",
    "productBackground",
    "productDetails"
  ],
  properties: {
    niche: { type: "string" },
    theme: { type: "string" },
    singleImageDetail: { type: "string" },
    carouselDetails: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: { type: "string" }
    },
    context: { type: "string" },
    imageAnalysis: { type: "string" },
    productBackground: { type: "string" },
    productDetails: { type: "string" }
  }
} as const;

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const rateLimit = checkRateLimit({
      identifier: `autofill:${user.id}`,
      limit: 20,
      windowMs: 60 * 1000
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente em instantes." },
        {
          headers: { "Retry-After": String(rateLimit.retryAfter) },
          status: 429
        }
      );
    }

    const body = await request.json();
    const parsedBody = autofillRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Dados invalidos.",
          issues: parsedBody.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const {
      carouselCount = 3,
      description,
      image,
      language = "pt",
      mode,
      productImages = [],
      visualFormat = "imagem_unica"
    } = parsedBody.data;
    const client = getOpenAIClient();
    const content: ResponseInputMessageContentList = [
      {
        type: "input_text",
        text: JSON.stringify(
          {
            carouselCount,
            description,
            hasContextualImage: Boolean(image),
            productImageCount: productImages.length,
            language,
            mode,
            visualFormat
          },
          null,
          2
        )
      },
      ...(image
        ? [
            {
              type: "input_image" as const,
              image_url: image,
              detail: "high" as const
            }
          ]
        : []),
      ...productImages.map((productImage) => ({
        type: "input_image" as const,
        image_url: productImage,
        detail: "high" as const
      }))
    ];
    const response = await client.responses.create({
      model: getGenerationModel(),
      store: false,
      instructions: [
        "You fill a form for generating Instagram posts in Autonomy.",
        "Return concise, practical field values only. Do not generate the final post.",
        "Follow the user's brief faithfully. Do not reinterpret, replace, or ignore specific requirements, objects, colors, visual style, audience, offer, text, or composition requested by the user.",
        "Infer a business niche, a clear post topic, and visual instructions from the user's brief and the uploaded image references when present.",
        "For contextual mode, use the brief plus the uploaded image as the source of truth for context and imageAnalysis. Preserve the relevant identity, subject, colors, product, logo, people, and composition details from that image unless the brief explicitly asks for changes.",
        "For product mode, use the brief plus all uploaded product images as the source of truth. The productDetails must explicitly preserve the product exactly while applying the requested background, model, props, or composition.",
        "Write all returned strings in the requested language.",
        "For carouselDetails, return exactly the requested carousel count. Each item must be a complete prompt for one image/slide, ordered from slide 1 to the final slide, and each prompt must reflect the user's reference text faithfully."
      ].join(" "),
      input: [
        {
          role: "user",
          content
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "autonomy_post_autofill",
          strict: true,
          schema: autofillJsonSchema
        }
      }
    });

    if (!response.output_text) {
      throw new Error("A IA nao retornou sugestoes utilizaveis.");
    }

    const parsedOutput = autofillResponseSchema.safeParse(
      JSON.parse(response.output_text)
    );

    if (!parsedOutput.success) {
      throw new Error("A IA retornou um formato inesperado.");
    }

    return NextResponse.json(parsedOutput.data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel preencher automaticamente."
      },
      { status: 500 }
    );
  }
}
