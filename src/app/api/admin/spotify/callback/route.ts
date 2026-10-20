import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PKCE_COOKIE, requestOrigin, requestToken, saveTokens } from "@/lib/spotify";

// The strict admin cookie isn't sent on Spotify's cross-site redirect; the PKCE cookie,
// only set for a logged-in admin, plus the matching state stands in for it.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = requestOrigin(request);
  const [state, verifier] = (await cookies()).get(PKCE_COOKIE)?.value.split(".") ?? [];
  const back = (status: string) => {
    const response = NextResponse.redirect(new URL(`/admin?spotify=${status}`, origin));
    response.cookies.set(PKCE_COOKIE, "", { path: "/api/admin/spotify", maxAge: 0 });
    return response;
  };
  const code = url.searchParams.get("code");
  if (!code || !state || !verifier || url.searchParams.get("state") !== state) return back("error");
  try {
    const tokens = await requestToken({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${origin}/api/admin/spotify/callback`,
      code_verifier: verifier,
    });
    const meResponse = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: "no-store" });
    const me = meResponse.ok ? await meResponse.json() : null;
    if (me?.product && me.product !== "premium") return back("premium");
    await saveTokens(tokens, { display_name: me?.display_name || me?.id || null });
    return back("connected");
  } catch (error) {
    console.error(error);
    return back("error");
  }
}
