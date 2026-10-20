import { NextResponse } from "next/server";
import { failure } from "@/lib/api";
import { hasAdminSession } from "@/lib/security";
import { speakerTable } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasAdminSession())) return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  try {
    const { data, error } = await speakerTable().select("refresh_token, display_name").maybeSingle();
    if (error) throw error;
    return NextResponse.json({ connected: Boolean(data?.refresh_token), name: data?.display_name ?? null });
  } catch (error) { return failure(error); }
}

export async function DELETE() {
  if (!(await hasAdminSession())) return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  try {
    const { error } = await speakerTable().update({ refresh_token: null, access_token: null, access_expires_at: null, display_name: null }).eq("id", true);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return failure(error); }
}
