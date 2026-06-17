import { getSupabaseServerClient } from "@/lib/supabase-server";

const dataUrlPattern = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/;

export async function uploadPostImages({
  images,
  postId,
  userId
}: {
  images: string[];
  postId: string;
  userId: string;
}) {
  const uploadedUrls = [];

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];

    if (!image.startsWith("data:")) {
      uploadedUrls.push(image);
      continue;
    }

    uploadedUrls.push(
      await uploadDataUrlImage({
        dataUrl: image,
        path: `${userId}/${postId}/${index + 1}.png`
      })
    );
  }

  return uploadedUrls;
}

async function uploadDataUrlImage({
  dataUrl,
  path
}: {
  dataUrl: string;
  path: string;
}) {
  const match = dataUrl.match(dataUrlPattern);

  if (!match) {
    throw new Error("Formato de imagem invalido para upload.");
  }

  const [, contentType, base64] = match;
  const bucket = process.env.SUPABASE_POST_IMAGES_BUCKET || "post-images";
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, Buffer.from(base64, "base64"), {
      contentType,
      upsert: true
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return data.publicUrl;
}
