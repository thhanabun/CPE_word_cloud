import "server-only";
import { getAdminSupabase } from "@/lib/supabase-admin";

export const SPOTIFY_SCOPES = "streaming user-read-email user-read-private";
export const PKCE_COOKIE = "wc_spotify_pkce";

type TokenResponse = { access_token: string; expires_in: number; refresh_token?: string };

export function spotifyClientId() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  if (!id) throw new Error("SPOTIFY_CLIENT_ID is not configured");
  return id;
}

// request.url can report the bind host (e.g. localhost) instead of the one the browser used,
// and the redirect URI must match what's registered in the Spotify dashboard exactly.
export function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const protocol = request.headers.get("x-forwarded-proto") ?? url.protocol.slice(0, -1);
  return `${protocol}://${host}`;
}

export function speakerTable() {
  return getAdminSupabase().from("speaker");
}

export async function requestToken(params: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: spotifyClientId(), ...params }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Spotify token request failed: ${data.error_description ?? data.error ?? response.status}`);
  return data;
}

export async function saveTokens(tokens: TokenResponse, extra: Record<string, unknown> = {}) {
  const { error } = await speakerTable().upsert({
    id: true,
    access_token: tokens.access_token,
    access_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
    ...extra,
  });
  if (error) throw error;
}

// ponytail: no lock around the refresh; only one screen asks for tokens. Add a row lock if several screens share the account.
export async function getAccessToken() {
  const { data, error } = await speakerTable().select("refresh_token, access_token, access_expires_at").maybeSingle();
  if (error) throw error;
  if (!data?.refresh_token) return null;
  if (data.access_token && new Date(data.access_expires_at).getTime() - Date.now() > 60_000) return data.access_token as string;
  const tokens = await requestToken({ grant_type: "refresh_token", refresh_token: data.refresh_token });
  await saveTokens(tokens);
  return tokens.access_token;
}
