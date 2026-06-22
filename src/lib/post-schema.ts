import { z } from "zod";

const imageDataUrlSchema = z
  .string()
  .regex(
    /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/,
    "Envie uma imagem valida em PNG, JPG ou WebP."
  )
  .max(8 * 1024 * 1024, "A imagem enviada deve ter no maximo 8MB.");

const creativeInputSchema = z
  .object({
    modo: z.literal("criativo"),
    nicho: z.string().trim().min(2, "Informe um nicho."),
    tema: z.string().trim().min(3, "Informe um tema."),
    formato_visual: z.enum(["imagem_unica", "carrossel"]),
    detalhes_imagem: z.string().trim().optional(),
    quantidade_imagens: z.number().int().min(2).max(4).optional(),
    detalhes_carrossel: z.array(z.string().trim()).max(4).optional()
  })
  .superRefine((data, context) => {
    if (data.formato_visual === "imagem_unica") {
      if (!data.detalhes_imagem || data.detalhes_imagem.length < 10) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["detalhes_imagem"],
          message: "Descreva a imagem com pelo menos 10 caracteres."
        });
      }
    }

    if (data.formato_visual === "carrossel") {
      if (!data.quantidade_imagens) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["quantidade_imagens"],
          message: "Escolha a quantidade de imagens do carrossel."
        });
      }

      if (
        !data.detalhes_carrossel ||
        data.detalhes_carrossel.length !== data.quantidade_imagens
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["detalhes_carrossel"],
          message: "Preencha um detalhe para cada imagem do carrossel."
        });
      }

      data.detalhes_carrossel?.forEach((detail, index) => {
        if (detail.length < 10) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["detalhes_carrossel", index],
            message: "Descreva cada imagem com pelo menos 10 caracteres."
          });
        }
      });
    }
  });

export const postInputSchema = z.union([
  creativeInputSchema,
  z.object({
    modo: z.literal("contextual"),
    nicho: z.string().trim().min(2, "Informe um nicho."),
    tema: z.string().trim().min(3, "Informe um tema."),
    contexto: z.string().trim().min(5, "Explique o contexto da campanha."),
    possui_imagem_propria: z.literal(true),
    imagem_do_usuario: imageDataUrlSchema,
    analise_da_imagem_do_usuario: z
      .string()
      .trim()
      .min(10, "Descreva a imagem enviada pelo usuario.")
  }),
  z.object({
    modo: z.literal("produto"),
    nicho: z.string().trim().min(2, "Informe um nicho."),
    tema: z.string().trim().min(3, "Informe um tema."),
    produto_imagens: z
      .array(imageDataUrlSchema)
      .min(1, "Envie pelo menos uma imagem do produto.")
      .max(3, "Envie no maximo 3 imagens do produto."),
    fundo_do_post: z
      .string()
      .trim()
      .min(5, "Descreva como deve ser o fundo do post."),
    detalhes_adicionais: z.string().trim().optional().default("")
  })
]);

export type PostInput = z.infer<typeof postInputSchema>;

export const generatedPostSchema = {
  type: "object",
  additionalProperties: false,
  required: ["modo_executado", "nicho", "formato_visual", "post"],
  properties: {
    modo_executado: {
      type: "string",
      enum: ["criativo", "contextual", "produto"]
    },
    nicho: {
      type: "string"
    },
    formato_visual: {
      type: ["string", "null"],
      enum: ["imagem_unica", "carrossel", null]
    },
    post: {
      $ref: "#/$defs/post"
    }
  },
  $defs: {
    post: {
      type: "object",
      additionalProperties: false,
      required: [
        "headline_da_imagem",
        "image_generation_prompt",
        "overlay_instructions",
        "generated_image",
        "generated_images",
        "caption",
        "hashtags"
      ],
      properties: {
        headline_da_imagem: {
          type: "string"
        },
        image_generation_prompt: {
          type: ["string", "null"]
        },
        overlay_instructions: {
          type: ["string", "null"]
        },
        generated_image: {
          type: ["string", "null"]
        },
        generated_images: {
          type: "array",
          items: {
            type: "string"
          }
        },
        caption: {
          type: "string"
        },
        hashtags: {
          type: "array",
          minItems: 5,
          maxItems: 10,
          items: {
            type: "string"
          }
        }
      }
    }
  }
} as const;

const generatedOptionZodSchema = z.object({
  headline_da_imagem: z.string(),
  image_generation_prompt: z.string().nullable(),
  overlay_instructions: z.string().nullable(),
  generated_image: z.string().nullable().optional().default(null),
  generated_images: z.array(z.string()).optional().default([]),
  caption: z.string(),
  hashtags: z.array(z.string()).min(3)
});

export const generatedPostZodSchema = z.object({
  modo_executado: z.enum(["criativo", "contextual", "produto"]),
  nicho: z.string(),
  formato_visual: z.enum(["imagem_unica", "carrossel"]).nullable().optional().default(null),
  post: generatedOptionZodSchema
});

export type GeneratedPost = z.infer<typeof generatedPostZodSchema>;
