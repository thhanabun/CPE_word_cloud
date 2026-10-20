import { NextResponse } from "next/server";
import { failure } from "@/lib/api";
import { hasAdminSession, PAIR_SECONDS } from "@/lib/security";
import { speakerTable } from "@/lib/spotify";

export async function POST(request: Request) {
  if (!(await hasAdminSession())) return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 }); }
  const code = (body as { code?: unknown } | null)?.code;
  if (typeof code !== "string" || !/^[\w-]{22}$/.test(code)) return NextResponse.json({ error: "QR ไม่ถูกต้อง" }, { status: 400 });
  try {
    const { data, error } = await speakerTable().update({ pair_approved: true }).eq("pair_code", code)
      .gt("pair_created_at", new Date(Date.now() - PAIR_SECONDS * 1000).toISOString()).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "QR หมดอายุแล้ว กรุณากดเชื่อมลำโพงที่หน้าจออีกครั้ง" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) { return failure(error); }
}
