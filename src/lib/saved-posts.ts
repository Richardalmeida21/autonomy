import type { GeneratedPost } from "@/lib/post-schema";
import { getSupabaseClient } from "@/lib/supabase-client";

export type SavedPost = GeneratedPost & {
  id: string;
  createdAt: string;
  isFavorite?: boolean;
};

export async function getSavedPosts() {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/posts", { headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nao foi possivel carregar os posts.");
  }

  return data as SavedPost[];
}

export async function savePost(post: SavedPost) {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/posts", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(post)
  });
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || "Nao foi possivel salvar o post.");
  }
}

export async function deletePost(id: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/posts/${id}`, {
    method: "DELETE",
    headers
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nao foi possivel remover o post.");
  }
}

export async function updatePostFavorite(id: string, isFavorite: boolean) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/posts/${id}`, {
    method: "PATCH",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ isFavorite })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nao foi possivel favoritar o post.");
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return {
      error:
        response.status === 413
          ? "Imagem muito grande para salvar. Gere novamente para salvar em formato otimizado."
          : "Resposta inesperada do servidor."
    };
  }
}
