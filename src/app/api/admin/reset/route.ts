import { NextResponse } from "next/server";
import { failure } from "@/lib/api";
import { hasAdminSession } from "@/lib/security";
import { getAdminSupabase } from "@/lib/supabase-admin";

export async function POST() {
  if (!(await hasAdminSession())) return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  try {
    const { error } = await getAdminSupabase().rpc("reset_board");
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return failure(error, "รีเซ็ตบอร์ดไม่สำเร็จ"); }
}
