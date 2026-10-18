import { NextResponse } from "next/server";
import { failure } from "@/lib/api";
import { createAdminSession, passwordMatches } from "@/lib/security";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 }); }
  const password = (body as { password?: unknown } | null)?.password;
  if (typeof password !== "string" || !password) return NextResponse.json({ error: "กรุณากรอกรหัสผ่าน" }, { status: 400 });
  try {
    if (!passwordMatches(password)) return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    await createAdminSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error, "ยังเข้าสู่ระบบไม่ได้ กรุณาตรวจการตั้งค่าระบบ");
  }
}
