import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let publicClient: SupabaseClient | undefined;

export function getPublicSupabase() {
  if (publicClient) return publicClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase public environment is not configured");
  publicClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return publicClient;
}
