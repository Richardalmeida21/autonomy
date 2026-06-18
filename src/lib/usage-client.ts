import { getSupabaseClient } from "@/lib/supabase-client";

export type UsageSummary = {
  creditsLimit: number;
  usedCredits: number;
  remainingCredits: number;
  usagePercent: number;
};

export async function getUsageSummary() {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/usage", { headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nao foi possivel carregar o uso.");
  }

  return data as UsageSummary;
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
