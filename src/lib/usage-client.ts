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
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  return token ? { Authorization: `Bearer ${token}` } : {};
}
