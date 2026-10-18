"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import dynamic from "next/dynamic";
import { QRCodeSVG } from "qrcode.react";
import { getPublicSupabase } from "@/lib/supabase";
import type { BoardPayload } from "@/lib/types";

const WordCloud = dynamic(() => import("./word-cloud"), { ssr: false });

const empty: BoardPayload = { board: null, words: [] };
const graphemes = new Intl.Segmenter("th", { granularity: "grapheme" });

export default function CloudPage() {
  const [data, setData] = useState(empty);
  const [answer, setAnswer] = useState("");
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [time, setTime] = useState("");
  const [cloudUrl, setCloudUrl] = useState("");
  const answerLength = [...graphemes.segment(answer)].length;

  const refresh = useCallback(async () => {
    const response = await fetch("/api/board", { cache: "no-store" });
    if (response.ok) setData(await response.json());
  }, []);

  useEffect(() => {
    void refresh();
    try {
      const supabase = getPublicSupabase();
      const channel = supabase.channel("live-word-cloud")
        .on("postgres_changes", { event: "*", schema: "public", table: "boards" }, () => void refresh())
        .on("postgres_changes", { event: "*", schema: "public", table: "words" }, () => void refresh())
        .subscribe((status) => { if (status === "SUBSCRIBED") void refresh(); });
      return () => { void supabase.removeChannel(channel); };
    } catch {
      return;
    }
  }, [refresh]);

  useEffect(() => {
    setCloudUrl(`${window.location.origin}/`);
  }, []);

  useEffect(() => {
    const update = () => setTime(new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hourCycle: "h23", numberingSystem: "latn" }).format(new Date()));
    update();
    const timer = window.setInterval(update, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answer.trim() || answerLength > 80 || sending) return;
    setSending(true);
    setNotice("");
    try {
      const response = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: answer }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "ส่งคำตอบไม่สำเร็จ");
      setAnswer("");
      setNotice("รับคำของคุณแล้ว ขอบคุณที่แบ่งปันนะ");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "ส่งคำตอบไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="cloud-shell">
      <aside className="cloud-qr" aria-label="QR สำหรับเปิดหน้า Word Cloud">
        {cloudUrl && <QRCodeSVG value={cloudUrl} size={132} level="M" marginSize={3} title="สแกนเพื่อเปิดหน้า Word Cloud" />}
      </aside>
      <section className="cloud-heading">
        <h1>{data.board?.question ?? "กำลังเตรียมคำถาม…"}</h1>
      </section>

      <section className="cloud-stage" aria-label="Word cloud">
        <div className="stage-label"><span>{data.words.reduce((sum, word) => sum + word.count, 0)} คำตอบ</span></div>
        <WordCloud words={data.words} />
      </section>

      <form className="answer-form" onSubmit={submit}>
        <label htmlFor="answer-input">คำของคุณ</label>
        <div className="answer-input-row">
          <input
            id="answer-input"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="เช่น ความสงบ, แรงบันดาลใจ…"
          maxLength={1024}
            autoComplete="off"
            disabled={!data.board || sending}
          />
          <button type="submit" disabled={!data.board || sending || !answer.trim() || answerLength > 80}>{sending ? "กำลังส่ง…" : "ส่งคำตอบ"}<span>↗</span></button>
        </div>
        <div className="form-foot"><span>ไม่ต้องระบุชื่อ · {answerLength}/80 ตัวอักษร</span><span className="notice" aria-live="polite">{answerLength > 80 ? "คำตอบยาวเกิน 80 ตัวอักษร" : notice}</span></div>
      </form>

      <aside className="duty-clock" aria-label="เวรดูแลและเวลา">
        <span className="duty-icon">✦</span><span><small>เวรดูแลวันนี้</small><strong>{data.board?.duty_name || "ยังไม่ระบุ"}</strong></span>
        <i className="clock-divider" /><time>{time || "--:--"}</time>
      </aside>
    </main>
  );
}
