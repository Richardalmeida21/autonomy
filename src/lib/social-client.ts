import type { GeneratedPost } from "@/lib/post-schema";
import { getSupabaseClient } from "@/lib/supabase-client";

export type SocialAccount = {
  id: string;
  provider: string;
  page_id: string;
  page_name: string;
  instagram_business_account_id: string;
  instagram_username: string | null;
  token_expires_at: string | null;
  status: string;
  connected_at: string;
};

export type ScheduledPost = {
  id: string;
  saved_post_id: string | null;
  caption: string;
  media_urls: string[];
  scheduled_for: string;
  status: "pending" | "publishing" | "published" | "failed" | "canceled";
  provider_media_id: string | null;
  error_message: string | null;
  created_at: string;
  instagram_username: string | null;
  page_name: string;
};

export async function startMetaConnection() {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/meta/oauth/start", { headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nao foi possivel conectar Instagram.");
  }

  return data.url as string;
}

export async function getSocialAccounts() {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/meta/accounts", { headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nao foi possivel carregar contas.");
  }

  return data as SocialAccount[];
}

export async function disconnectSocialAccount(id: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/meta/accounts/${id}`, {
    method: "DELETE",
    headers
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nao foi possivel desconectar conta.");
  }
}

export async function getScheduledPosts() {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/scheduled-posts", { headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nao foi possivel carregar agendamentos.");
  }

  return data as ScheduledPost[];
}

export async function schedulePost({
  post,
  savedPostId,
  scheduledFor,
  socialAccountId
}: {
  post: GeneratedPost;
  savedPostId?: string;
  scheduledFor: string;
  socialAccountId: string;
}) {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/scheduled-posts", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      post,
      savedPostId,
      scheduledFor,
      socialAccountId
    })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nao foi possivel agendar post.");
  }
}

export async function cancelScheduledPost(id: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/scheduled-posts/${id}`, {
    method: "DELETE",
    headers
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nao foi possivel cancelar agendamento.");
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  return token ? { Authorization: `Bearer ${token}` } : {};
}
