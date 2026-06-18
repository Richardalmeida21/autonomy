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
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  return token ? { Authorization: `Bearer ${token}` } : {};
}
