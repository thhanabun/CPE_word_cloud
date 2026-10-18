"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Archive, BoardPayload } from "@/lib/types";

type AdminData = BoardPayload;

async function readResponse(response: Response) {
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error ?? "ดำเนินการไม่สำเร็จ");
  return value;
}

function date(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
}

export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [data, setData] = useState<AdminData | null>(null);
  const [archives, setArchives] = useState<Archive[]>([]);
  const [question, setQuestion] = useState("");
  const [duty, setDuty] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cloudUrl, setCloudUrl] = useState("");

  const loadData = useCallback(async () => {
    const boardResponse = await fetch("/api/admin/board", { cache: "no-store" });
    if (boardResponse.status === 401) {
      setLoggedIn(false);
      setData(null);
      return;
    }
    const boardData: AdminData = await readResponse(boardResponse);
    const archiveData = await readResponse(await fetch("/api/admin/archives", { cache: "no-store" }));
    setData(boardData);
    setQuestion(boardData.board?.question ?? "");
    setDuty(boardData.board?.duty_name ?? "");
    setArchives(archiveData.archives ?? []);
    setLoggedIn(true);
  }, []);

  useEffect(() => {
    setCloudUrl(`${window.location.origin}/`);
    void loadData().catch((loadError) => setError(loadError.message)).finally(() => setReady(true));
  }, [loadData]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await readResponse(await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }));
      setPassword("");
      await loadData();
    } catch (loginError) { setError(loginError instanceof Error ? loginError.message : "เข้าสู่ระบบไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  async function saveBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      await readResponse(await fetch("/api/admin/board", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, duty_name: duty }) }));
      setMessage("บันทึกการเปลี่ยนแปลงแล้ว");
      await loadData();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "บันทึกไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  async function removeWord(id: string, text: string) {
    if (!window.confirm(`ลบ “${text}” ออกจากบอร์ดหรือไม่?`)) return;
    setError("");
    try {
      await readResponse(await fetch(`/api/admin/words/${id}`, { method: "DELETE" }));
      setData((current) => current ? { ...current, words: current.words.filter((word) => word.id !== id) } : current);
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "ลบคำไม่สำเร็จ"); }
  }

  async function resetBoard() {
    if (!window.confirm("เก็บบอร์ดปัจจุบันไว้ใน Archive แล้วเริ่มบอร์ดใหม่ด้วยคำถามและชื่อเวรเดิมหรือไม่?")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await readResponse(await fetch("/api/admin/reset", { method: "POST" }));
      setMessage("บอร์ดเดิมถูกเก็บใน Archive แล้ว");
      await loadData();
    } catch (resetError) { setError(resetError instanceof Error ? resetError.message : "รีเซ็ตไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setLoggedIn(false); setData(null);
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(cloudUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setError("คัดลอกไม่ได้ กรุณาคัดลอกจาก URL ของหน้าเว็บ"); }
  }

  if (!ready) return <main className="admin-shell"><div className="admin-loading">กำลังเปิดหน้าจัดการ…</div></main>;

  if (!loggedIn) return (
    <main className="admin-shell login-shell">
      <a className="admin-back" href="/">← กลับไปหน้า Cloud</a>
      <section className="login-card">
        <span className="admin-logo">ร</span>
        <div className="eyebrow">READING ROOM · ADMIN</div>
        <h1>จัดการบอร์ด</h1>
        <p>กรอกรหัสผ่านผู้ดูแลเพื่อจัดการคำถามและคำตอบ</p>
        <form onSubmit={login} className="login-form">
          <label htmlFor="admin-password">รหัสผ่าน</label>
          <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button className="primary-button full-button" disabled={busy}>{busy ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}<span>↗</span></button>
        </form>
        {error && <p className="admin-error" role="alert">{error}</p>}
      </section>
    </main>
  );

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <a className="brand" href="/"><span className="brand-mark">ร</span><span><strong>ห้องอ่านหนังสือ</strong><small>BOARD CONTROL</small></span></a>
        <div className="admin-header-actions"><a href="/" target="_blank" rel="noreferrer">ดูหน้า Cloud ↗</a><button className="quiet-button" onClick={logout}>ออกจากระบบ</button></div>
      </header>
      <section className="admin-intro">
        <div><div className="eyebrow">ADMIN CONSOLE</div><h1>จัดการ Word Cloud</h1><p>ตั้งคำถาม ดูคำตอบ และเก็บบอร์ดที่จบแล้วไว้ย้อนหลัง</p></div>
        <span className="live-pill"><i /> บอร์ดเดียว · LIVE</span>
      </section>
      {error && <div className="admin-alert" role="alert">{error}</div>}
      {message && <div className="admin-success" role="status">{message}</div>}

      <div className="admin-grid">
        <section className="admin-panel board-settings">
          <div className="panel-heading"><div><span className="panel-number">01</span><div><h2>ตั้งค่าบอร์ด</h2><p>เปลี่ยนคำถามและชื่อผู้เข้าเวร</p></div></div><span className="panel-status">กำลังใช้งาน</span></div>
          <form onSubmit={saveBoard} className="settings-form">
            <label htmlFor="board-question">คำถามบนหน้า Cloud</label>
            <textarea id="board-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={240} rows={3} required />
            <div className="field-hint">ไม่เกิน 240 ตัวอักษร</div>
            <label htmlFor="duty-name">ชื่อคนเข้าเวร</label>
            <input id="duty-name" value={duty} onChange={(event) => setDuty(event.target.value)} maxLength={80} placeholder="เช่น พี่ฟ้า · เวรบ่าย" />
            <button className="primary-button" disabled={busy}>บันทึกการเปลี่ยนแปลง <span>↗</span></button>
          </form>
          <div className="reset-box"><div><strong>เริ่มรอบใหม่</strong><small>เก็บคำตอบปัจจุบันใน Archive ก่อนล้างบอร์ด</small></div><button className="danger-button" onClick={resetBoard} disabled={busy}>Reset board</button></div>
        </section>

        <section className="admin-panel share-panel">
          <div className="panel-heading"><div><span className="panel-number">02</span><div><h2>แชร์หน้า Cloud</h2><p>เปิดลิงก์หรือสแกน QR เพื่อส่งคำตอบ</p></div></div></div>
          <div className="share-content">
            <div className="qr-frame">{cloudUrl && <QRCodeSVG value={cloudUrl} size={164} level="M" marginSize={4} title="QR สำหรับเปิดหน้า Word Cloud" />}</div>
            <div className="share-url"><span>ลิงก์สำหรับนักอ่าน</span><code>{cloudUrl || "กำลังโหลด…"}</code><button className="copy-button" onClick={copyLink}>{copied ? "คัดลอกแล้ว ✓" : "คัดลอกลิงก์ ↗"}</button></div>
          </div>
          <div className="share-note"><span>✳</span> ผู้ตอบไม่ต้องเข้าสู่ระบบ และไม่ต้องระบุชื่อ</div>
        </section>
      </div>

      <section className="admin-panel responses-panel">
        <div className="panel-heading"><div><span className="panel-number">03</span><div><h2>คำบนบอร์ด</h2><p>ลบคำหรือวลีที่ไม่เหมาะสมออกจากบอร์ดปัจจุบัน</p></div></div><span className="response-total">{data?.words.reduce((sum, word) => sum + word.count, 0) ?? 0} คำตอบ</span></div>
        {!data?.words.length ? <div className="admin-empty">ยังไม่มีคำตอบในบอร์ดนี้</div> : (
          <div className="word-table"><div className="word-table-head"><span>คำหรือวลี</span><span>จำนวน</span><span>จัดการ</span></div>
            {data.words.map((word) => <div className="word-row" key={word.id}><span>{word.display_text}</span><strong>{word.count}</strong><button className="remove-button" onClick={() => void removeWord(word.id, word.display_text)} aria-label={`ลบ ${word.display_text}`}>ลบ</button></div>)}
          </div>
        )}
      </section>

      <section className="admin-panel archive-panel">
        <div className="panel-heading"><div><span className="panel-number">04</span><div><h2>Archive</h2><p>บอร์ดเก่าพร้อมยอดคำรวม ดาวน์โหลดเป็น CSV ได้</p></div></div><span className="archive-count">{archives.length} บอร์ด</span></div>
        {!archives.length ? <div className="admin-empty">ยังไม่มี Archive · เมื่อ Reset บอร์ดเก่าจะปรากฏที่นี่</div> : (
          <div className="archive-list">{archives.map((archive) => <details className="archive-item" key={archive.id}>
            <summary><span className="archive-date">{date(archive.archived_at)}</span><strong>{archive.question}</strong><span className="archive-words">{archive.words.reduce((sum, word) => sum + word.count, 0)} คำตอบ</span></summary>
            <div className="archive-detail"><p>เริ่ม {date(archive.created_at)} · เวร {archive.duty_name || "ไม่ระบุ"}</p><div className="archive-tags">{archive.words.map((word) => <span key={word.id}>{word.display_text}<b>{word.count}</b></span>)}</div><a className="csv-link" href={`/api/admin/archives/${archive.id}/csv`}>ดาวน์โหลด CSV ↓</a></div>
          </details>)}</div>
        )}
      </section>
      <footer className="admin-footer"><span>READING ROOM · WORD CLOUD</span><a href="/">กลับหน้า Cloud ↗</a></footer>
    </main>
  );
}
