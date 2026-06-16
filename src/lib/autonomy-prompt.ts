import { readFile } from "node:fs/promises";
import path from "node:path";

const fallbackPrompt = `Voce e o motor de Inteligencia Artificial do Autonomy. Gere um post completo para Instagram, seguindo rigorosamente o modo recebido pelo usuario e retornando somente JSON valido.`;

export async function getAutonomyPrompt() {
  try {
    const promptPath = path.join(process.cwd(), "autonomy.txt");
    return await readFile(promptPath, "utf8");
  } catch {
    return fallbackPrompt;
  }
}
