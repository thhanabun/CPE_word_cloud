"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type PlaybackState = {
  paused: boolean;
  position: number;
  duration: number;
  track_window: { current_track: { name: string; artists: { name: string }[] } };
};

type SpotifyPlayer = {
  addListener(event: "player_state_changed", callback: (state: PlaybackState | null) => void): void;
  addListener(event: string, callback: () => void): void;
  connect(): Promise<boolean>;
  disconnect(): void;
  activateElement?(): Promise<void>;
};

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: { Player: new (options: { name: string; volume: number; getOAuthToken: (callback: (token: string) => void) => void }) => SpotifyPlayer };
  }
}

type Track = { name: string; artists: string; position: number; duration: number; paused: boolean; at: number };

function clock(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

async function fetchToken() {
  const response = await fetch("/api/screen/spotify-token", { cache: "no-store" });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error ?? "ขอสิทธิ์ Spotify ไม่สำเร็จ");
  return value.access_token as string;
}

// Runs only on the paired screen: turns this tab into the "Word Cloud" Spotify Connect device.
export function SpotifySpeaker() {
  const [status, setStatus] = useState("กำลังเชื่อม Spotify…");
  const [needsClick, setNeedsClick] = useState(true);
  const [track, setTrack] = useState<Track | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let player: SpotifyPlayer | undefined;
    let retry: number | undefined;
    let cancelled = false;

    // Browsers block audio until the page is clicked once.
    const activate = () => {
      setNeedsClick(false);
      if (!player) return;
      void player.activateElement?.();
      document.removeEventListener("pointerdown", activate);
    };
    document.addEventListener("pointerdown", activate);

    const start = async () => {
      try { await fetchToken(); } catch (error) {
        setStatus(error instanceof Error ? error.message : "ขอสิทธิ์ Spotify ไม่สำเร็จ");
        retry = window.setTimeout(start, 30_000);
        return;
      }
      if (cancelled) return;
      window.onSpotifyWebPlaybackSDKReady = () => {
        if (cancelled || !window.Spotify) return;
        player = new window.Spotify.Player({
          name: "Word Cloud",
          volume: 0.8,
          getOAuthToken: (callback) => { fetchToken().then(callback, (error: Error) => setStatus(error.message)); },
        });
        player.addListener("ready", () => setStatus("พร้อม · เลือก “Word Cloud” ในแอป Spotify"));
        // The SDK only reports changes, so the position is extrapolated from the last report.
        player.addListener("player_state_changed", (state) => setTrack(state && {
          name: state.track_window.current_track.name,
          artists: state.track_window.current_track.artists.map((artist) => artist.name).join(", "),
          position: state.position,
          duration: state.duration,
          paused: state.paused,
          at: Date.now(),
        }));
        player.addListener("not_ready", () => setStatus("ลำโพงหลุด กำลังเชื่อมใหม่…"));
        player.addListener("initialization_error", () => setStatus("เบราว์เซอร์นี้เล่น Spotify ไม่ได้"));
        player.addListener("authentication_error", () => setStatus("สิทธิ์ Spotify หมดอายุ · เชื่อมใหม่ที่หน้า Admin"));
        player.addListener("account_error", () => setStatus("ต้องใช้บัญชี Spotify Premium"));
        void player.connect();
      };
      if (window.Spotify) window.onSpotifyWebPlaybackSDKReady();
      else if (!document.querySelector("script[data-spotify-sdk]")) {
        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.dataset.spotifySdk = "";
        script.onerror = () => setStatus("โหลด Spotify ไม่สำเร็จ");
        document.body.append(script);
      }
    };
    void start();

    return () => {
      cancelled = true;
      window.clearTimeout(retry);
      document.removeEventListener("pointerdown", activate);
      player?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!track || track.paused) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [track]);

  const clickHint = needsClick ? " · คลิกหน้าจอหนึ่งครั้งเพื่อเปิดเสียง" : "";
  if (!track) return <div className="speaker-badge" role="status"><span>♫</span>{status}{clickHint}</div>;

  const position = Math.min(track.duration, track.position + (track.paused ? 0 : Math.max(0, now - track.at)));
  return (
    <div className="speaker-badge speaker-playing" role="status">
      <span>{track.paused ? "⏸" : "♫"}</span>
      <div className="speaker-track">
        <strong>{track.name}</strong>
        <small>{track.artists} · {clock(position)} / {clock(track.duration)}{clickHint}</small>
        <b className="speaker-progress"><i style={{ width: `${track.duration ? (position / track.duration) * 100 : 0}%` }} /></b>
      </div>
    </div>
  );
}

// Shown on unpaired screens: the admin scans the QR on their phone and approves.
export function PairSpeaker() {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    const timer = window.setInterval(async () => {
      const value = await fetch("/api/screen/pair", { cache: "no-store" }).then((response) => response.json()).catch(() => null);
      if (value?.paired) window.location.reload();
      else if (value?.expired) setCode(null);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [code]);

  async function start() {
    const response = await fetch("/api/screen/pair", { method: "POST" });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) return window.alert(value.error ?? "เริ่มเชื่อมลำโพงไม่สำเร็จ");
    setCode(value.code);
  }

  return (
    <>
      <button className="speaker-badge speaker-pair" onClick={start}><span>♫</span>เชื่อมลำโพง</button>
      {code && (
        <div className="announcement-backdrop" onClick={() => setCode(null)}>
          <section className="announcement-card pair-card" role="dialog" aria-modal="true" aria-labelledby="pair-title" onClick={(event) => event.stopPropagation()}>
            <div className="eyebrow" id="pair-title">เชื่อมลำโพง Spotify</div>
            <div className="pair-qr"><QRCodeSVG value={`${window.location.origin}/admin?pair=${code}`} size={240} level="M" marginSize={3} title="สแกนเพื่อเชื่อมลำโพง" /></div>
            <p>สแกนด้วยมือถือผู้ดูแล แล้วกด “อนุญาต” ในหน้า Admin</p>
            <button className="quiet-button" onClick={() => setCode(null)}>ยกเลิก</button>
          </section>
        </div>
      )}
    </>
  );
}
