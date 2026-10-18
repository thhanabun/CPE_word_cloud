import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/security";
import { getAdminSupabase } from "@/lib/supabase-admin";

const csvCell = (value: string | number) => {
  const text = String(value);
  const safeText = /^[\t\r ]*[=+\-@]/u.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasAdminSession())) return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  const { id } = await params;
  const supabase = getAdminSupabase();
  const { data: board, error } = await supabase.from("boards").select("*").eq("id", id).not("archived_at", "is", null).maybeSingle();
  if (error || !board) return NextResponse.json({ error: "ไม่พบ Archive" }, { status: 404 });
  const { data: words, error: wordError } = await supabase.from("words").select("display_text,count").eq("board_id", id).order("count", { ascending: false });
  if (wordError) return NextResponse.json({ error: "ดาวน์โหลด CSV ไม่สำเร็จ" }, { status: 503 });
  const rows = [["คำถาม", "วันที่เริ่ม", "วันที่เก็บ", "คำหรือวลี", "จำนวน"], ...((words ?? []).map((word) => [board.question, board.created_at, board.archived_at ?? "", word.display_text, word.count]))];
  const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="word-cloud-${id}.csv"`, "Cache-Control": "no-store" } });
}
