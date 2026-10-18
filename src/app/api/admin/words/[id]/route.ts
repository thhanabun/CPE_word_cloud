import { NextResponse } from "next/server";
import { failure } from "@/lib/api";
import { hasAdminSession } from "@/lib/security";
import { getAdminSupabase } from "@/lib/supabase-admin";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminSession())) return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  const { id } = await params;
  try {
    const supabase = getAdminSupabase();
    const { data: board, error: boardError } = await supabase.from("boards").select("id").eq("is_active", true).maybeSingle();
    if (boardError) throw boardError;
    if (!board) return NextResponse.json({ error: "ไม่พบบอร์ดปัจจุบัน" }, { status: 404 });
    const { error, count } = await supabase.from("words").delete({ count: "exact" }).eq("id", id).eq("board_id", board.id);
    if (error) throw error;
    if (!count) return NextResponse.json({ error: "ไม่พบคำนี้บนบอร์ดปัจจุบัน" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) { return failure(error); }
}
