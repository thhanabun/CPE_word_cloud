import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "wc_admin";
const COOLDOWN_COOKIE = "wc_last_submit";
const SESSION_SECONDS = 8 * 60 * 60;

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

export async function hasAdminSession() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const [expiresText, signature, extra] = token.split(".");
  if (!expiresText || !signature || extra) return false;
  const expires = Number(expiresText);
  if (!Number.isSafeInteger(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  return safeEqual(signature, sign(`admin:${expires}`));
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
