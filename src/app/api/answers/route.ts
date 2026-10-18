import { NextResponse } from "next/server";
import { failure } from "@/lib/api";
import { getCooldownSeconds, setSubmissionCooldown } from "@/lib/security";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { normalizeAnswer } from "@/lib/validation";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8192) return NextResponse.json({ error: "ข้อมูลยาวเกินกำหนด" }, { status: 413 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 }); }
  const text = normalizeAnswer((body as { text?: unknown } | null)?.text);
  if (!text) return NextResponse.json({ error: "กรุณาส่งคำหรือวลีไม่เกิน 80 ตัวอักษร" }, { status: 400 });
  try {
    const remaining = await getCooldownSeconds();
    if (remaining > 0) return NextResponse.json({ error: `ลองส่งอีกครั้งใน ${remaining} วินาที` }, { status: 429 });
    const { error } = await getAdminSupabase().rpc("submit_word", {
      p_text: text.displayText,
      p_normalized: text.normalizedText,
    });
    if (error) throw error;
    await setSubmissionCooldown();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error, "ส่งคำตอบไม่สำเร็จ กรุณาลองใหม่");
  }
}
