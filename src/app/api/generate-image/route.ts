import { NextResponse } from "next/server";
import { z } from "zod";
import { getImageModel, getOpenAIClient } from "@/lib/openai";

const imageInputSchema = z.object({
  prompt: z.string().trim().min(20, "Prompt visual muito curto."),
  headline: z.string().trim().min(2, "Headline obrigatoria.")
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedInput = imageInputSchema.safeParse(body);

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
    const { headline, prompt } = parsedInput.data;

    const finalPrompt = [
      prompt,
      "",
      "Create a polished square Instagram feed post image in 1:1 aspect ratio.",
      "The image must look clean, premium, commercial, and native to social media.",
      "Do not include watermarks, logos, fake UI, extra random words, misspellings, or distorted text.",
      `If text appears in the image, use only this exact Portuguese headline: "${headline}".`,
      "Leave enough negative space for the headline and keep the main subject visible."
    ].join("\n");

    const result = await client.images.generate({
      model: getImageModel(),
      prompt: finalPrompt,
      size: "1024x1024",
      quality: "medium",
      n: 1
    });

    const image = result.data?.[0]?.b64_json;

    if (!image) {
      return NextResponse.json(
        { error: "A IA nao retornou a imagem." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      image: `data:image/png;base64,${image}`
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro inesperado ao gerar imagem.";
    const status = message.includes("OPENAI_API_KEY") ? 500 : 502;

    return NextResponse.json(
      {
        error: message
      },
      { status }
    );
  }
}
