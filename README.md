# ห้องอ่านหนังสือ · Word Cloud

เว็บ Word Cloud ภาษาไทย มีบอร์ดปัจจุบันชุดเดียว นักอ่านส่งคำตอบได้โดยไม่ล็อกอิน ส่วนผู้ดูแลเข้าที่ `/admin` ด้วยรหัสผ่านที่ตั้งไว้ใน environment variables

## เริ่มใช้งาน

1. สร้างโปรเจกต์ Supabase โดยเลือก region Singapore แล้วรัน [`supabase/schema.sql`](supabase/schema.sql) ใน SQL Editor
2. คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ URL, anon/publishable key, service role key, รหัสผ่าน และ secret สำหรับ session
3. ติดตั้งและรันด้วย `npm install` และ `npm run dev`
4. เปิด `/admin` เพื่อเปลี่ยนคำถาม/ชื่อเวร หรือแชร์ URL หน้า `/` และ QR ให้ผู้ตอบ

สร้าง secret ได้ด้วย `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` แล้วนำผลลัพธ์ไปใส่ใน `ADMIN_SESSION_SECRET` แยกจากรหัสผ่านผู้ดูแล

## ลำโพง Spotify

หน้าจอ Cloud เป็นลำโพง Spotify Connect ชื่อ “Word Cloud” ได้ โดยไม่ต้องล็อกอิน Spotify บนหน้าจอ (ต้องใช้ Spotify Premium)

1. สร้างแอปที่ developer.spotify.com เลือก Web API และ Web Playback SDK แล้วนำ Client ID ไปใส่ใน `SPOTIFY_CLIENT_ID`
2. เพิ่ม Redirect URI `https://<โดเมน>/api/admin/spotify/callback` และ `http://127.0.0.1:3000/api/admin/spotify/callback` สำหรับเครื่อง dev (Spotify ไม่รับ `localhost` จึงต้องเปิด dev ผ่าน `127.0.0.1`)
3. บนมือถือ: `/admin` → ลำโพง Spotify → เชื่อม Spotify
4. บนหน้าจอ: กด “เชื่อมลำโพง” มุมซ้ายล่าง แล้วสแกน QR ด้วยมือถือที่เข้า `/admin` อยู่และกดอนุญาต จากนั้นคลิกหน้าจอหนึ่งครั้งเพื่อให้เบราว์เซอร์ยอมเล่นเสียง
5. เลือก “Word Cloud” ในรายการอุปกรณ์ของแอป Spotify

Refresh token เก็บในตาราง `speaker` ฝั่ง server เท่านั้น หน้าจอได้รับเฉพาะ access token อายุ 1 ชั่วโมงผ่าน cookie ที่จับคู่ไว้ (อายุ 1 ปี) และกด “ยกเลิกการเชื่อม” ที่หน้า Admin ได้ตลอด

## Deploy บน Vercel

- เพิ่ม environment variables ทั้ง 6 รายการจาก `.env.example` ใน Vercel Project Settings → Environment Variables โดยกำหนดให้ Production ใช้งานได้
- เชื่อม GitHub repository กับ Vercel หรือ deploy จากโฟลเดอร์นี้ด้วย `npx vercel` แล้วใช้ `npx vercel --prod` สำหรับ Production
- ใช้ URL และ key จาก Supabase โปรเจกต์ที่เลือก region Singapore; QR ใช้ domain ที่เปิดหน้า Admin อยู่โดยอัตโนมัติ
- ใช้ `SUPABASE_SERVICE_ROLE_KEY` เฉพาะฝั่ง server; ห้ามเปลี่ยนชื่อให้ขึ้นต้นด้วย `NEXT_PUBLIC_`

Supabase Free มีโควตาและอาจพักโปรเจกต์เมื่อไม่มีการใช้งานตามเงื่อนไขของผู้ให้บริการ อีกทั้งไม่มี automatic backups; ควรดาวน์โหลด CSV ในหน้า Archive มาเก็บไว้เป็นระยะ

## ขอบเขตข้อมูลและการป้องกัน

- เด็กไม่ต้องล็อกอินหรือระบุชื่อ ระบบเก็บเฉพาะคำ/วลีที่รวมยอดแล้ว
- บอร์ดเก่าถูกเก็บพร้อมยอดคำเมื่อ Reset; Reset สร้างบอร์ดว่างใหม่โดยคงคำถามและชื่อเวรเดิม
- RLS เปิดให้ `anon` อ่านเฉพาะบอร์ดปัจจุบันและคำบนบอร์ดนั้น; การเขียนใช้ service role จาก Route Handlers เท่านั้น
- Admin ใช้ signed, HTTP-only session cookie อายุ 8 ชั่วโมง
- จำกัดคำตอบ 80 graphemes และใช้ signed cookie หน่วงคำตอบซ้ำ 5 วินาทีต่อเบราว์เซอร์; เป็นการกันสแปมเบื้องต้น ผู้ใช้ล้าง cookie หรือเปลี่ยนอุปกรณ์เพื่อข้ามได้
- Realtime ใช้ Supabase Postgres Changes; ต้องรัน schema เพื่อเปิดตารางใน publication และตั้ง public Supabase URL/anon key ให้ถูกต้อง
