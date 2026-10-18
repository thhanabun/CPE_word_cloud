import { NextResponse } from "next/server";
import { failure } from "@/lib/api";
import { hasAdminSession } from "@/lib/security";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { isText } from "@/lib/validation";

export async function GET() {
  if (!(await hasAdminSession())) return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  try {
    const supabase = getAdminSupabase();
    const { data: board, error } = await supabase.from("boards").select("*").eq("is_active", true).maybeSingle();
    if (error) throw error;
    if (!board) return NextResponse.json({ board: null, words: [] });
    const { data: words, error: wordError } = await supabase.from("words").select("*").eq("board_id", board.id).order("count", { ascending: false });
    if (wordError) throw wordError;
    return NextResponse.json({ board, words: words ?? [] });
  } catch (error) { return failure(error); }
}

export async function PUT(request: Request) {
  if (!(await hasAdminSession())) return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 }); }
  const { question, duty_name: dutyName } = (body ?? {}) as { question?: unknown; duty_name?: unknown };
  if (!isText(question, 240) || typeof dutyName !== "string" || dutyName.length > 80) {
    return NextResponse.json({ error: "คำถามต้องไม่เกิน 240 ตัวอักษร และชื่อเวรไม่เกิน 80 ตัวอักษร" }, { status: 400 });
  }
  try {
    const { data, error } = await getAdminSupabase().from("boards").update({ question: question.trim(), duty_name: dutyName.trim() }).eq("is_active", true).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "ไม่พบบอร์ดปัจจุบัน" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) { return failure(error); }
}
