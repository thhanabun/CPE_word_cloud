import { NextResponse } from "next/server";
import { failure } from "@/lib/api";
import { hasAdminSession } from "@/lib/security";
import { getAdminSupabase } from "@/lib/supabase-admin";

export async function GET() {
  if (!(await hasAdminSession())) return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  try {
    const supabase = getAdminSupabase();
    const { data: boards, error } = await supabase.from("boards").select("*").not("archived_at", "is", null).order("archived_at", { ascending: false });
    if (error) throw error;
    const ids = (boards ?? []).map((board) => board.id);
    const { data: words, error: wordError } = ids.length ? await supabase.from("words").select("*").in("board_id", ids).order("count", { ascending: false }) : { data: [], error: null };
    if (wordError) throw wordError;
    return NextResponse.json({ archives: (boards ?? []).map((board) => ({ ...board, words: (words ?? []).filter((word) => word.board_id === board.id) })) });
  } catch (error) { return failure(error); }
}
