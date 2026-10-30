import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { failure } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const secret = process.env.HEARTBEAT_SECRET;
  if (!secret || secret.length < 32) return NextResponse.json({ error: "Heartbeat is not configured" }, { status: 503 });

  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { error } = await getAdminSupabase().rpc("touch_project_keepalive");
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error, "ยังเชื่อมต่อฐานข้อมูลไม่ได้");
  }
}
