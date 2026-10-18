import { NextResponse } from "next/server";
import { failure } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase-admin";
import type { Board, Word } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getAdminSupabase();
    const { data: board, error: boardError } = await supabase.from("boards").select("*").eq("is_active", true).maybeSingle();
    if (boardError) throw boardError;
    if (!board) return NextResponse.json({ board: null, words: [] });
    const { data: words, error: wordsError } = await supabase.from("words").select("*").eq("board_id", board.id).order("count", { ascending: false });
    if (wordsError) throw wordsError;
    return NextResponse.json({ board: board as Board, words: (words ?? []) as Word[] });
  } catch (error) {
    return failure(error, "ยังเชื่อมต่อบอร์ดไม่ได้ กรุณาตรวจการตั้งค่าระบบ");
  }
}
