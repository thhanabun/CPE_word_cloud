import { NextResponse } from "next/server";
import { failure } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase-admin";
import type { Board, Word } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getAdminSupabase();
    const { data: board, error: boardError } = await supabase
      .from("boards")
      .select("*, words(*)")
      .eq("is_active", true)
      .order("count", { referencedTable: "words", ascending: false })
      .maybeSingle();
    if (boardError) throw boardError;
    if (!board) return NextResponse.json({ board: null, words: [] });
    const { words = [], ...boardData } = board as Board & { words: Word[] };
    return NextResponse.json({ board: boardData, words });
  } catch (error) {
    return failure(error, "ยังเชื่อมต่อบอร์ดไม่ได้ กรุณาตรวจการตั้งค่าระบบ");
  }
}
