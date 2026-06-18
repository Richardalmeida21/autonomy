import { getSupabaseClient } from "@/lib/supabase-client";

export type ProfileInput = {
  email: string;
  fullName: string;
  document: string;
  phone: string;
};

export async function getProfile() {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/profile", { headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nao foi possivel carregar perfil.");
  }

  return data;
}

export async function saveProfile(profile: ProfileInput) {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/profile", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(profile)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nao foi possivel salvar perfil.");
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  let { data } = await supabase.auth.getSession();
  let token = data.session?.access_token;

  if (!token) {
    ({ data } = await supabase.auth.refreshSession());
    token = data.session?.access_token;
  }

  return token ? { Authorization: `Bearer ${token}` } : {};
}
