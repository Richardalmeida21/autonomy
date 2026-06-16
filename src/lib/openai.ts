import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY nao configurada.");
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  return client;
}

export function getGenerationModel() {
  return process.env.OPENAI_MODEL || "gpt-5.4-mini";
}

export function getImageModel() {
  return process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
}
