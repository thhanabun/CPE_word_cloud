// ponytail: throwaway feasibility check for the Spotify Web Playback SDK on the screen's browser. Delete once decided.
export const dynamic = "force-dynamic";

export function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) return new Response("SPOTIFY_CLIENT_ID is not set", { status: 500 });
  return new Response(page(JSON.stringify(clientId)), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

const page = (clientIdJson: string) => String.raw`
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Spotify SDK test</title>
<style>
  body { font: 18px system-ui, sans-serif; padding: 24px; max-width: 720px; margin: auto; }
  button { font-size: 20px; padding: 12px 20px; margin: 4px 8px 4px 0; }
  #log { white-space: pre-wrap; background: #f3f3f3; padding: 12px; font: 15px ui-monospace, monospace; }
</style>
</head>
<body>
<h1>Spotify Web Playback SDK test</h1>
<button id="login">1. Log in with Spotify</button>
<button id="play" disabled>2. Play here</button>
<div id="log"></div>
<script>
const CLIENT_ID = ${clientIdJson};
const REDIRECT_URI = location.origin + location.pathname;
const SCOPES = "streaming user-read-email user-read-private user-modify-playback-state";

const logEl = document.getElementById("log");
const playBtn = document.getElementById("play");
const log = (...parts) => { logEl.textContent += parts.join(" ") + "\n"; };
const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

let token = sessionStorage.getItem("spotify_token");
let deviceId = null;
let player = null;

log("User agent:", navigator.userAgent);
log("EME available:", typeof navigator.requestMediaKeySystemAccess === "function" ? "yes" : "NO");

document.getElementById("login").onclick = async () => {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  sessionStorage.setItem("spotify_verifier", verifier);
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  location = "https://accounts.spotify.com/authorize?" + new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    code_challenge_method: "S256",
    code_challenge: challenge,
    scope: SCOPES,
  });
};

playBtn.onclick = async () => {
  await player.activateElement?.(); // mobile browsers need a user gesture before audio
  const res = await fetch("https://api.spotify.com/v1/me/player", {
    method: "PUT",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ device_ids: [deviceId], play: true }),
  });
  log("Transfer playback:", res.status, res.ok ? "OK" : await res.text());
};

async function exchangeCode(code) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: sessionStorage.getItem("spotify_verifier"),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error);
  sessionStorage.setItem("spotify_token", data.access_token);
  return data.access_token;
}

function startPlayer() {
  window.onSpotifyWebPlaybackSDKReady = () => {
    player = new Spotify.Player({ name: "Word Cloud (test)", getOAuthToken: (cb) => cb(token), volume: 0.8 });
    for (const name of ["initialization_error", "authentication_error", "account_error", "playback_error"]) {
      player.addListener(name, ({ message }) => log("✗", name + ":", message));
    }
    player.addListener("ready", ({ device_id }) => {
      deviceId = device_id;
      playBtn.disabled = false;
      log("✓ READY — 'Word Cloud (test)' should now appear in your phone's Spotify device list");
    });
    player.addListener("not_ready", () => log("✗ Device went offline"));
    player.addListener("player_state_changed", (state) => {
      if (state) log(state.paused ? "⏸" : "▶", state.track_window.current_track.name);
    });
    player.connect().then((ok) => log("connect():", ok));
  };
  const script = document.createElement("script");
  script.src = "https://sdk.scdn.co/spotify-player.js";
  script.onerror = () => log("✗ Could not load the SDK script");
  document.body.append(script);
}

(async () => {
  const params = new URLSearchParams(location.search);
  if (params.get("error")) log("✗ Login refused:", params.get("error"));
  if (params.get("code")) {
    history.replaceState(null, "", REDIRECT_URI);
    try {
      token = await exchangeCode(params.get("code"));
    } catch (err) {
      log("✗ Token exchange failed:", err.message);
    }
  }
  if (token) {
    log("Logged in, starting player…");
    startPlayer();
  }
})();
</script>
</body>
</html>
`;
