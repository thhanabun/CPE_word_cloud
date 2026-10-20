import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { failure } from "@/lib/api";
import { clearPairCookie, createScreenSession, getPairCode, setPairCookie } from "@/lib/security";
import { speakerTable } from "@/lib/spotify";

export const dynamic = "force-dynamic";

// ponytail: one pending pairing at a time; a new request replaces the old one.
export async function POST() {
  const code = randomBytes(16).toString("base64url");
  try {
    const { error } = await speakerTable().upsert({ id: true, pair_code: code, pair_approved: false, pair_created_at: new Date().toISOString() });
    if (error) throw error;
    await setPairCookie(code);
    return NextResponse.json({ code });
  } catch (error) { return failure(error); }
}

// Polled by the screen while its QR is shown.
export async function GET() {
  const code = await getPairCode();
  if (!code) return NextResponse.json({ paired: false, expired: true });
  try {
    const { data, error } = await speakerTable().select("pair_code, pair_approved").maybeSingle();
    if (error) throw error;
    if (data?.pair_code !== code) return NextResponse.json({ paired: false, expired: true });
    if (!data.pair_approved) return NextResponse.json({ paired: false });
    const { error: clearError } = await speakerTable().update({ pair_code: null, pair_approved: false, pair_created_at: null }).eq("pair_code", code);
    if (clearError) throw clearError;
    await clearPairCookie();
    await createScreenSession();
    return NextResponse.json({ paired: true });
  } catch (error) { return failure(error); }
}
