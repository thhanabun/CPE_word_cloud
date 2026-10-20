import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/security";
import { PKCE_COOKIE, requestOrigin, SPOTIFY_SCOPES, spotifyClientId } from "@/lib/spotify";

export async function GET(request: Request) {
  const origin = requestOrigin(request);
  if (!(await hasAdminSession())) return NextResponse.redirect(new URL("/admin", origin));
  let clientId: string;
  try { clientId = spotifyClientId(); } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL("/admin?spotify=error", origin));
  }
  const verifier = randomBytes(32).toString("base64url");
  const state = randomBytes(16).toString("base64url");
  const response = NextResponse.redirect(`https://accounts.spotify.com/authorize?${new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: `${origin}/api/admin/spotify/callback`,
    code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    state,
    scope: SPOTIFY_SCOPES,
  })}`);
  // Lax, not strict: it has to come back on the cross-site redirect from Spotify.
  response.cookies.set(PKCE_COOKIE, `${state}.${verifier}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/admin/spotify",
    maxAge: 600,
  });
  return response;
}
