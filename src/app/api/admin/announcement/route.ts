import { NextResponse } from "next/server";
import { failure } from "@/lib/api";
import { hasAdminSession } from "@/lib/security";
import { getAdminSupabase } from "@/lib/supabase-admin";

export async function PUT(request: Request) {
  if (!(await hasAdminSession())) return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 }); }
  const { announcement } = (body ?? {}) as { announcement?: unknown };
  if (typeof announcement !== "string" || announcement.length > 500) {
    return NextResponse.json({ error: "ประกาศต้องไม่เกิน 500 ตัวอักษร" }, { status: 400 });
  }
  try {
    const { data, error } = await getAdminSupabase().from("boards").update({ announcement: announcement.trim() || null }).eq("is_active", true).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "ไม่พบบอร์ดปัจจุบัน" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) { return failure(error); }
}
