import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Word Cloud | ห้องอ่านหนังสือ",
  description: "พื้นที่แบ่งปันคำและความคิดสำหรับห้องอ่านหนังสือ",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
