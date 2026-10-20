import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "wc_admin";
const COOLDOWN_COOKIE = "wc_last_submit";
const SCREEN_COOKIE = "wc_screen";
const PAIR_COOKIE = "wc_pair";
const SESSION_SECONDS = 8 * 60 * 60;
const SCREEN_SECONDS = 365 * 24 * 60 * 60;
export const PAIR_SECONDS = 10 * 60;

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters");
  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function passwordMatches(candidate: string) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD is not configured");
  return safeEqual(
    createHmac("sha256", "admin-password-comparison").update(candidate).digest("hex"),
    createHmac("sha256", "admin-password-comparison").update(password).digest("hex"),
  );
}

export async function createAdminSession() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, `${expires}.${sign(`admin:${expires}`)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

async function hasSession(name: string, purpose: string) {
  const token = (await cookies()).get(name)?.value;
  if (!token) return false;
  const [expiresText, signature, extra] = token.split(".");
  if (!expiresText || !signature || extra) return false;
  const expires = Number(expiresText);
  if (!Number.isSafeInteger(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  return safeEqual(signature, sign(`${purpose}:${expires}`));
}

export const hasAdminSession = () => hasSession(ADMIN_COOKIE, "admin");

// The display box: lax so it survives normal navigation, long-lived so the screen stays paired.
export const hasScreenSession = () => hasSession(SCREEN_COOKIE, "screen");

export async function createScreenSession() {
  const expires = Math.floor(Date.now() / 1000) + SCREEN_SECONDS;
  (await cookies()).set(SCREEN_COOKIE, `${expires}.${sign(`screen:${expires}`)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SCREEN_SECONDS,
  });
}

// Binds a pairing code to the browser that requested it, so someone who photographs
// the QR can't claim the screen session once the admin approves.
export async function setPairCookie(code: string) {
  (await cookies()).set(PAIR_COOKIE, `${code}.${sign(`pair:${code}`)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PAIR_SECONDS,
  });
}

export async function getPairCode() {
  const token = (await cookies()).get(PAIR_COOKIE)?.value;
  if (!token) return null;
  const [code, signature, extra] = token.split(".");
  if (!code || !signature || extra) return null;
  return safeEqual(signature, sign(`pair:${code}`)) ? code : null;
}

export async function clearPairCookie() {
  (await cookies()).delete(PAIR_COOKIE);
}

export async function getCooldownSeconds() {
  const token = (await cookies()).get(COOLDOWN_COOKIE)?.value;
  if (!token) return 0;
  const [timestampText, signature, extra] = token.split(".");
  if (!timestampText || !signature || extra) return 0;
  const timestamp = Number(timestampText);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(timestamp) || timestamp > now || now - timestamp > 60) return 0;
  if (!safeEqual(signature, sign(`submit:${timestamp}`))) return 0;
  return Math.max(0, 5 - (now - timestamp));
}

export async function setSubmissionCooldown() {
  const timestamp = Math.floor(Date.now() / 1000);
  (await cookies()).set(COOLDOWN_COOKIE, `${timestamp}.${sign(`submit:${timestamp}`)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60,
  });
}
