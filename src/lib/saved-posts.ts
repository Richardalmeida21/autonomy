import type { GeneratedPost } from "@/lib/post-schema";

export type SavedPost = GeneratedPost & {
  id: string;
  createdAt: string;
};

export async function getSavedPosts() {
  const response = await fetch("/api/posts");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nao foi possivel carregar os posts.");
  }

  return data as SavedPost[];
}

export async function savePost(post: SavedPost) {
  const response = await fetch("/api/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(post)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nao foi possivel salvar o post.");
  }
}

export async function deletePost(id: string) {
  const response = await fetch(`/api/posts/${id}`, {
    method: "DELETE"
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nao foi possivel remover o post.");
  }
}
