import { NextResponse } from "next/server";

export function failure(error: unknown, fallback = "เกิดข้อผิดพลาด กรุณาลองใหม่") {
  console.error(error);
  return NextResponse.json({ error: fallback }, { status: 503 });
}
