import { NextResponse } from "next/server";
import { failure } from "@/lib/api";
import { hasScreenSession } from "@/lib/security";
import { getAccessToken } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasScreenSession())) return NextResponse.json({ error: "หน้าจอนี้ยังไม่ได้เชื่อมลำโพง" }, { status: 401 });
  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "ยังไม่ได้เชื่อม Spotify ที่หน้า Admin" }, { status: 404 });
    return NextResponse.json({ access_token: token });
  } catch (error) { return failure(error, "ขอสิทธิ์ Spotify ไม่สำเร็จ"); }
}
