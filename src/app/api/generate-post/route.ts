import { NextResponse } from "next/server";
import { getAutonomyPrompt } from "@/lib/autonomy-prompt";
import { getGenerationModel, getImageModel, getOpenAIClient } from "@/lib/openai";
import {
  generatedPostSchema,
  generatedPostZodSchema,
  postInputSchema
} from "@/lib/post-schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
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
    }

    return NextResponse.json(generatedPost);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro inesperado ao gerar post.";
    const status = message.includes("OPENAI_API_KEY") ? 500 : 502;

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
