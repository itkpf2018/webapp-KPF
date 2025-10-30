## Attendance Tracker PWA

แอปพลิเคชันเว็บสำหรับบันทึกเวลาเข้า-ออกงาน รองรับมือถือ 100% สามารถติดตั้งเป็น PWA และซิงก์ข้อมูลทั้งหมดกับ Supabase (Postgres + Storage) พร้อมบังคับถ่ายรูปและเก็บพิกัดก่อนส่งข้อมูลทุกครั้ง

### คุณสมบัติหลัก
- ฟอร์มลงเวลาเก็บวันที่ เวลา สถานะ ชื่อพนักงาน ร้านค้า หมายเหตุ พิกัด และรูปภาพ
- ฟอร์มบันทึกยอดขาย (หน้า `/sales`) พร้อม dropdown สินค้าและคำนวณยอดรวมอัตโนมัติ
- รูปภาพถูกอัปโหลดเข้า Supabase Storage และแนบ URL สาธารณะไว้กับเรคอร์ด
- ระบบรายงานและแดชบอร์ดฝั่ง `/admin` อ่านข้อมูลตรงจาก Supabase จึงแสดงผลได้ทันที
- ซิงก์ข้อมูลทั้งหมดใน Supabase เพียงระบบเดียว
- รองรับ PWA/Offline-first เบื้องต้น

---

## เตรียมค่าใช้งาน Supabase

1. **สร้างโปรเจ็กต์ Supabase**
   - ไปที่ [Supabase Dashboard](https://app.supabase.com) → สร้างโปรเจ็กต์ใหม่ → เลือก `Region` ใกล้ผู้ใช้
   - คัดลอก `Project URL`, `anon` key และ `service_role` key ในหน้า Project Settings → API

2. **สร้างตารางฐานข้อมูล** (รันใน SQL Editor)

   ```sql
   create extension if not exists "uuid-ossp";
   create extension if not exists pgcrypto;

   create table if not exists public.attendance_records (
     id uuid primary key default gen_random_uuid(),
     recorded_date date not null,
     recorded_time text not null,
     status text not null check (status in ('check-in','check-out')),
     employee_name text not null,
     store_name text,
     note text,
     latitude double precision,
     longitude double precision,
     accuracy double precision,
     location_display text,
     photo_public_url text,
     storage_path text,
     submitted_at timestamptz default now(),
     created_at timestamptz default now()
   );

   create table if not exists public.sales_records (
     id uuid primary key default gen_random_uuid(),
     recorded_date date not null,
     recorded_time text not null,
     employee_name text not null,
     store_name text,
     product_code text not null,
     product_name text not null,
     quantity numeric not null,
     unit_price numeric not null,
     total numeric not null,
     submitted_at timestamptz default now(),
     created_at timestamptz default now()
   );
   ```

3. **สร้าง Storage bucket สำหรับรูปเวลาเข้างาน**
   - ไปที่ Storage → Create bucket → ตั้งชื่อเช่น `attendance-photos`
   - เปิด Public Bucket เพื่อให้ระบบขอ `publicUrl` ได้ทันที หรือกำหนด Storage Policy ให้ role `anon` อ่านไฟล์ใน bucket นี้ได้

4. **ตั้งค่าตัวแปรสิ่งแวดล้อม**
   - คัดลอกไฟล์ตัวอย่าง
     ```bash
     cp .env.local.example .env.local
     ```
   - กรอกค่าให้ครบ: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ATTENDANCE_BUCKET`
   - `APP_TIMEZONE` ใช้ควบคุมการประมวลผลวันที่ในรายงาน (ดีฟอลต์ `Asia/Bangkok`)

> หมายเหตุ: ตัวแปร `SUPABASE_SERVICE_ROLE_KEY` ใช้เฉพาะฝั่งเซิร์ฟเวอร์ (API Routes) อย่า expose ให้ฝั่งไคลเอนต์

---

## Admin CMS & ข้อมูลเสริม

- เข้าหน้าจัดการได้ที่ `/admin`
- รายชื่อพนักงาน/ร้านค้า/สินค้า/แบรนด์ ยังคงเก็บในไฟล์ `data/app-data.json` เพื่อให้แก้ไขได้ง่ายและจัดเวอร์ชันด้วย Git
- Logs ถูกเก็บใน `data/logs/*.json`
- หากต้องการรีเซ็ตข้อมูล CMS ให้ลบเนื้อหาในไฟล์เหล่านี้แล้วเซฟใหม่ (อย่าลบไฟล์ทิ้ง)

---

## เริ่มต้นพัฒนา

```bash
npm install
npm run dev
```

เปิดเบราว์เซอร์ที่ [http://localhost:3000](http://localhost:3000)

---

## โครงสร้างข้อมูลใน Supabase

### ตาราง attendance_records
| คอลัมน์ | ประเภท | รายละเอียด |
|---------|--------|-------------|
| recorded_date | date | วันที่บันทึก |
| recorded_time | text | เวลา HH:mm |
| status | text | `check-in` หรือ `check-out` |
| employee_name | text | ชื่อพนักงาน |
| store_name | text | ชื่อร้าน/สาขา (nullable) |
| note | text | หมายเหตุ (nullable) |
| latitude / longitude / accuracy | double precision | พิกัด GPS |
| location_display | text | คำอธิบายตำแหน่ง |
| photo_public_url | text | URL รูปใน Supabase Storage |
| storage_path | text | path ใน bucket |
| submitted_at | timestamptz | เวลาที่ผู้ใช้กดบันทึก |
| created_at | timestamptz | เวลาที่เซิร์ฟเวอร์บันทึก |

### ตาราง sales_records
| คอลัมน์ | ประเภท | รายละเอียด |
|---------|--------|-------------|
| recorded_date | date | วันที่บันทึกยอดขาย |
| recorded_time | text | เวลา HH:mm:ss |
| employee_name | text | ผู้บันทึก |
| store_name | text | ร้าน/สาขา (nullable) |
| product_code / product_name | text | รายการสินค้า |
| quantity | numeric | จำนวน |
| unit_price | numeric | ราคาต่อหน่วย |
| total | numeric | ยอดรวม |
| submitted_at / created_at | timestamptz | เวลาอ้างอิง |

แดชบอร์ดและรายงานใน `/admin` จะอ่านข้อมูลจากสองตารางนี้โดยตรง (ผ่าน `src/lib/supabaseData.ts`)

---

## การ Build และ Deploy

```bash
npm run build
npm run start
```

ก่อน deploy ควรตรวจสอบว่า environment ของปลายทางตั้งค่า `SUPABASE_*` ครบ และ Storage bucket มีสิทธิ์เข้าถึงตามต้องการ

---

## ฟีเจอร์เพิ่มเติมที่สามารถต่อยอด
1. เพิ่ม Geofencing หรือ Reverse Geocode สำหรับการแจ้งเตือนตำแหน่งผิดปกติ
2. ใช้ Supabase Edge Functions เพื่อทำ Slack/LINE Notify เมื่อมีการลงเวลาใหม่
3. ตั้ง Row Level Security บน Postgres พร้อม Policy แยกตามทีม/พื้นที่
4. สร้าง Materialized View สำหรับรายงานความถี่เข้างานเพื่อเร่งความเร็วแดชบอร์ด
