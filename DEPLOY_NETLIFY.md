# คู่มือการ Deploy Attendance PWA บน Netlify

คู่มือฉบับสมบูรณ์สำหรับการ deploy แอปพลิเคชัน Attendance Tracker PWA บน Netlify พร้อมคำแนะนำทีละขั้นตอน

---

## 📋 สารบัญ

1. [ข้อกำหนดเบื้องต้น](#ข้อกำหนดเบื้องต้น)
2. [เตรียมโปรเจค](#เตรียมโปรเจค)
3. [สร้าง Supabase Project](#สร้าง-supabase-project)
4. [เชื่อมต่อกับ Netlify](#เชื่อมต่อกับ-netlify)
5. [ตั้งค่า Environment Variables](#ตั้งค่า-environment-variables)
6. [Deploy ครั้งแรก](#deploy-ครั้งแรก)
7. [ตรวจสอบการทำงานของ PWA](#ตรวจสอบการทำงานของ-pwa)
8. [ตั้งค่า Custom Domain (ถ้าต้องการ)](#ตั้งค่า-custom-domain)
9. [การ Deploy อัตโนมัติ](#การ-deploy-อัตโนมัติ)
10. [Troubleshooting](#troubleshooting)
11. [Performance Optimization](#performance-optimization)

---

## ข้อกำหนดเบื้องต้น

### 1. บัญชีและเครื่องมือที่จำเป็น

- ✅ **Node.js** เวอร์ชัน 22.x หรือสูงกว่า ([ดาวน์โหลด](https://nodejs.org/))
- ✅ **npm** เวอร์ชัน 10.x หรือสูงกว่า (มาพร้อม Node.js)
- ✅ **Git** ([ดาวน์โหลด](https://git-scm.com/))
- ✅ **GitHub Account** สำหรับเก็บ source code ([สมัคร](https://github.com/))
- ✅ **Netlify Account** สำหรับ deploy ([สมัคร](https://www.netlify.com/))
- ✅ **Supabase Account** สำหรับ database และ storage ([สมัคร](https://supabase.com/))

### 2. ตรวจสอบเวอร์ชัน

เปิด Terminal/Command Prompt แล้วรันคำสั่ง:

```bash
node --version
# ควรแสดง v22.x.x

npm --version
# ควรแสดง 10.x.x

git --version
# ควรแสดงเวอร์ชันใดก็ได้
```

---

## เตรียมโปรเจค

### 1. ตรวจสอบโครงสร้างโปรเจค

ตรวจสอบว่าโปรเจคมีไฟล์สำคัญครบถ้วน:

```bash
cd /path/to/attendance-pwa

# ตรวจสอบไฟล์ที่จำเป็น
ls -la netlify.toml         # ไฟล์ config สำหรับ Netlify (เพิ่งสร้างใหม่)
ls -la next.config.ts       # Next.js configuration
ls -la package.json         # Dependencies
ls -la public/manifest.json # PWA manifest
ls -la data/app-data.json   # Data file
```

### 2. ติดตั้ง Dependencies

```bash
# ลบ node_modules เก่า (ถ้ามี)
rm -rf node_modules package-lock.json

# ติดตั้งใหม่
npm install
```

### 3. ทดสอบ Build ก่อน Deploy

```bash
# ทดสอบ production build
npm run build

# ถ้า build สำเร็จ ควรเห็นข้อความประมาณนี้:
#   ✓ Compiled successfully
#   ✓ Generating static pages
```

**หมายเหตุ:** ถ้ามี warnings เกี่ยวกับ unused variables ไม่เป็นไร ไม่ได้ทำให้ build ล้มเหลว

---

## สร้าง Supabase Project

### 1. สร้าง Project ใหม่

1. ไปที่ [Supabase Dashboard](https://supabase.com/dashboard)
2. คลิก **"New project"**
3. กรอกข้อมูล:
   - **Organization**: เลือกองค์กรของคุณ (หรือสร้างใหม่)
   - **Name**: `attendance-pwa` (หรือชื่อที่ต้องการ)
   - **Database Password**: สร้างรหัสผ่านที่แข็งแรง (เก็บไว้ดีๆ!)
   - **Region**: เลือก `Southeast Asia (Singapore)` เพื่อความเร็วในการเข้าถึง
   - **Pricing Plan**: เลือก `Free` สำหรับเริ่มต้น
4. คลิก **"Create new project"**
5. รอ 1-2 นาทีจนโปรเจคสร้างเสร็จ

### 2. สร้าง Storage Bucket สำหรับรูปภาพ

1. ในเมนูด้านซ้าย คลิก **Storage**
2. คลิก **"New bucket"**
3. กรอกข้อมูล:
   - **Name**: `attendance-photos`
   - **Public bucket**: เลือก **เปิด** (ติ๊กถูก)
   - คลิก **"Create bucket"**
4. คลิกที่ bucket ที่สร้าง แล้วไปที่แท็บ **Policies**
5. คลิก **"New policy"** และเลือก **"Allow public read access"**
6. ใส่ชื่อ Policy: `Public read access`
7. คลิก **"Review"** แล้ว **"Save policy"**

### 3. รัน Database Migrations

1. ในเมนูด้านซ้าย คลิก **SQL Editor**
2. คลิก **"New query"**
3. เปิดไฟล์ `migrations/001_create_user_pins.sql` จากโปรเจค
4. คัดลอกเนื้อหาทั้งหมดใน SQL Editor
5. คลิก **"Run"** (หรือกด `Ctrl/Cmd + Enter`)
6. ทำซ้ำสำหรับไฟล์ migration อื่นๆ ตามลำดับ:
   - `migrations/002_create_auth_security.sql`
   - และไฟล์อื่นๆ ใน folder `migrations/`

**หมายเหตุ:** ต้องรันไฟล์ migration ตามลำดับเลขที่ขึ้นต้น (001, 002, 003...)

### 4. เก็บ API Keys และ URL

1. ในเมนูด้านซ้าย คลิก **Settings** > **API**
2. คัดลอกค่าเหล่านี้ไว้ (จะใช้ในขั้นตอนถัดไป):
   - **Project URL** (เช่น `https://xxx.supabase.co`)
   - **anon/public** key (ยาวๆ เป็น JWT token)
   - **service_role** key (ยาวกว่า anon key)

⚠️ **คำเตือน:**
- **anon key** = ปลอดภัยสำหรับฝั่ง client (เปิดเผยได้)
- **service_role key** = **ต้องเก็บเป็นความลับ** ห้ามเปิดเผยในโค้ด หรือ commit ลง Git!

---

## เชื่อมต่อกับ Netlify

### 1. Push โปรเจคขึ้น GitHub (ถ้ายังไม่ได้ทำ)

```bash
# ไปที่ folder โปรเจค
cd /path/to/attendance-pwa

# เริ่มต้น Git (ถ้ายังไม่ได้ init)
git init

# เพิ่มไฟล์ทั้งหมด (ยกเว้นที่ระบุใน .gitignore)
git add .

# Commit
git commit -m "Initial commit: Ready for Netlify deployment"

# สร้าง repo ใหม่บน GitHub
# ไปที่ https://github.com/new
# ตั้งชื่อ repo เช่น "attendance-pwa"
# ห้ามเลือก "Initialize with README" (เพราะเรามีแล้ว)

# เชื่อมต่อกับ GitHub repo
git remote add origin https://github.com/YOUR_USERNAME/attendance-pwa.git

# Push ขึ้น GitHub
git branch -M main
git push -u origin main
```

### 2. เชื่อมต่อ Netlify กับ GitHub

1. ไปที่ [Netlify Dashboard](https://app.netlify.com/)
2. คลิก **"Add new site"** > **"Import an existing project"**
3. เลือก **"GitHub"**
4. อนุญาต Netlify เข้าถึง GitHub (ครั้งแรกเท่านั้น)
5. เลือก repository `attendance-pwa` จากรายการ
6. ตั้งค่า Build settings:
   - **Branch to deploy**: `main`
   - **Build command**: `npm run build` (ระบบจะเติมให้อัตโนมัติจาก `netlify.toml`)
   - **Publish directory**: `.next` (ระบบจะเติมให้อัตโนมัติจาก `netlify.toml`)
   - **Functions directory**: ปล่อยว่างไว้ (Netlify จะใช้ Next.js functions อัตโนมัติ)

7. **ยังไม่ต้องกด Deploy!** ไปที่ขั้นตอนถัดไปก่อน (ตั้งค่า Environment Variables)

---

## ตั้งค่า Environment Variables

### 1. เพิ่ม Environment Variables ใน Netlify

1. ในหน้า Site settings ที่เพิ่งสร้าง คลิกแท็บ **"Site configuration"**
2. ในเมนูด้านซ้าย คลิก **"Environment variables"**
3. คลิก **"Add a variable"** แล้วเพิ่มตัวแปรเหล่านี้:

#### ตัวแปรที่จำเป็น (Required):

| Key | Value | คำอธิบาย |
|-----|-------|----------|
| `SUPABASE_URL` | `https://xxx.supabase.co` | Project URL จาก Supabase |
| `SUPABASE_ANON_KEY` | `eyJhbG...` (ยาว) | Public anon key จาก Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` (ยาวกว่า) | **Secret** service role key จาก Supabase |
| `SUPABASE_ATTENDANCE_BUCKET` | `attendance-photos` | ชื่อ storage bucket ที่สร้างไว้ |

#### ตัวแปรที่เลือกได้ (Optional):

| Key | Value | คำอธิบาย |
|-----|-------|----------|
| `APP_TIMEZONE` | `Asia/Bangkok` | Timezone สำหรับรายงาน (default คือ Bangkok) |

### 2. ตัวอย่างการกรอก

```
Key: SUPABASE_URL
Value: https://mzfbxgxxtvvjuqvkjcqo.supabase.co
Scopes: All scopes (default)

Key: SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...
Scopes: All scopes (default)

Key: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...
⚠️ Sensitive variable: เปิดใช้งาน (ติ๊กถูก)
Scopes: All scopes (default)

Key: SUPABASE_ATTENDANCE_BUCKET
Value: attendance-photos
Scopes: All scopes (default)

Key: APP_TIMEZONE
Value: Asia/Bangkok
Scopes: All scopes (default)
```

### 3. ตรวจสอบและบันทึก

1. ตรวจสอบว่ากรอกครบทุก key และไม่มีช่องว่าง (space) เกิน
2. ตรวจสอบว่า `SUPABASE_SERVICE_ROLE_KEY` มีการทำเครื่องหมาย **Sensitive** ✅
3. คลิก **"Save"** สำหรับแต่ละตัวแปร

---

## Deploy ครั้งแรก

### 1. เริ่มต้น Deploy

1. ในหน้า Site overview คลิก **"Deploy site"**
2. Netlify จะเริ่มต้น build process:
   - ⏳ Cloning repository
   - ⏳ Installing dependencies
   - ⏳ Running build command
   - ⏳ Deploying

### 2. ติดตามความคืบหน้า

1. คลิกที่ **"Deploying"** เพื่อดู build logs
2. รอประมาณ 3-5 นาที (ครั้งแรกจะนานหน่อย)
3. ถ้าสำเร็จจะเห็น:
   ```
   ✓ Build completed successfully
   ✓ Site is live at https://xxx.netlify.app
   ```

### 3. ตรวจสอบ URL

1. Netlify จะสร้าง URL แบบสุ่มให้ เช่น:
   ```
   https://sparkling-cupcake-abc123.netlify.app
   ```
2. คลิกที่ URL หรือคลิกปุ่ม **"Open production deploy"**
3. เว็บไซต์ควรเปิดขึ้นมาและแสดงหน้า login

---

## ตรวจสอบการทำงานของ PWA

### 1. ทดสอบบนคอมพิวเตอร์

#### Chrome/Edge:
1. เปิด Developer Tools (`F12`)
2. ไปที่แท็บ **Application** > **Service Workers**
3. ตรวจสอบว่ามี Service Worker กำลังทำงาน (Status: Activated)
4. ไปที่ **Application** > **Manifest**
5. ตรวจสอบว่า manifest.json โหลดสำเร็จและแสดง icons ถูกต้อง

#### ติดตั้ง PWA บนเดสก์ท็อป:
1. คลิกไอคอน ➕ ในแถบ address bar (ขวาสุด)
2. หรือไปที่เมนู (⋮) > **Install Attendance Tracker**
3. แอปจะถูกติดตั้งและเปิดในหน้าต่างแยก

### 2. ทดสอบบนมือถือ (สำคัญมาก!)

#### Android (Chrome):
1. เปิด Chrome browser บนมือถือ Android
2. เข้าเว็บไซต์ `https://xxx.netlify.app`
3. คลิกเมนู (⋮) > **"Add to Home screen"** หรือ **"Install app"**
4. ตั้งชื่อแอป (หรือใช้ชื่อเดิม "Attendance Tracker")
5. คลิก **"Add"** หรือ **"Install"**
6. ไอคอนจะปรากฏบน Home screen
7. เปิดแอปจากไอคอน - ควรเปิดแบบ full screen (ไม่มีแถบ address bar)

#### iOS (Safari):
1. เปิด Safari browser บน iPhone/iPad
2. เข้าเว็บไซต์ `https://xxx.netlify.app`
3. คลิกปุ่ม Share (สี่เหลี่ยมลูกศรขึ้น)
4. เลื่อนลงหา **"Add to Home Screen"**
5. ตั้งชื่อแอป แล้วคลิก **"Add"**
6. ไอคอนจะปรากฏบน Home screen
7. เปิดแอปจากไอคอน

### 3. ทดสอบฟีเจอร์หลัก

#### ทดสอบกล้องและ GPS (บนมือถือ):
1. เปิดแอปที่ติดตั้ง
2. ทดสอบ login (สร้าง PIN ผ่าน Admin ก่อน)
3. หลัง login จะเข้าหน้าบันทึกเวลา
4. คลิกปุ่ม "ถ่ายรูป" - ควรเปิดกล้อง
5. ตรวจสอบว่าระบบขอ permission กล้อง
6. ถ่ายรูปแล้วบันทึก - ควรแสดง preview รูป
7. ตรวจสอบพิกัด GPS แสดงถูกต้อง
8. กด submit - ควรบันทึกสำเร็จ

#### ทดสอบ Offline Mode:
1. บันทึกข้อมูลอย่างน้อย 1 ครั้ง (เพื่อให้ cache ทำงาน)
2. ปิดอินเทอร์เน็ต/เปิด Airplane mode
3. เปิดแอป - ควรยังเปิดได้ (จาก cache)
4. หน้าที่เคยเปิดควรยังแสดงผลได้
5. ฟีเจอร์ที่ต้องใช้เน็ตจะไม่ทำงาน (ตามปกติ)

---

## ตั้งค่า Custom Domain

ถ้าต้องการใช้โดเมนของตัวเอง เช่น `attendance.yourcompany.com`

### 1. เพิ่ม Custom Domain

1. ใน Netlify Dashboard ไปที่ **Site configuration** > **Domain management**
2. คลิก **"Add a domain"**
3. ใส่โดเมนที่ต้องการ เช่น `attendance.yourcompany.com`
4. คลิก **"Verify"**

### 2. ตั้งค่า DNS Records

Netlify จะแสดงวิธีการตั้งค่า DNS ให้:

#### วิธีที่ 1: CNAME Record (แนะนำ)
- ไปที่ผู้ให้บริการโดเมนของคุณ (GoDaddy, Namecheap, Cloudflare, etc.)
- เพิ่ม CNAME record:
  ```
  Type: CNAME
  Name: attendance (หรือ subdomain ที่ต้องการ)
  Value: xxx.netlify.app
  TTL: 3600 (หรือค่าที่แนะนำ)
  ```

#### วิธีที่ 2: A Record (สำหรับ root domain)
- เพิ่ม A record:
  ```
  Type: A
  Name: @ (หรือ root)
  Value: 75.2.60.5 (IP address จาก Netlify)
  TTL: 3600
  ```

### 3. เปิดใช้งาน HTTPS

1. รอ DNS propagation (5-30 นาที)
2. Netlify จะออก SSL certificate อัตโนมัติ (ใช้ Let's Encrypt)
3. เมื่อเสร็จจะเห็นไอคอนกุญแจ 🔒 สีเขียว
4. HTTPS จะถูกบังคับใช้อัตโนมัติ (HTTP redirect ไป HTTPS)

### 4. อัพเดต PWA Manifest (ถ้าต้องการ)

ถ้าใช้ custom domain ควรอัพเดต `public/manifest.json`:

```json
{
  "name": "Attendance Tracker",
  "short_name": "Attendance",
  "start_url": "https://attendance.yourcompany.com/",
  "scope": "https://attendance.yourcompany.com/"
}
```

จากนั้น commit และ push เพื่อให้ Netlify deploy ใหม่.

---

## การ Deploy อัตโนมัติ

Netlify รองรับ Continuous Deployment (CD) โดยอัตโนมัติ!

### 1. Auto Deploy จาก Git Push

เมื่อคุณ push โค้ดใหม่ไปที่ GitHub:

```bash
# แก้ไขโค้ด
git add .
git commit -m "Update feature X"
git push origin main
```

Netlify จะ:
1. ตรวจจับการ push อัตโนมัติ
2. เริ่ม build ใหม่ทันที
3. Deploy เมื่อ build สำเร็จ
4. ส่งการแจ้งเตือนผ่านอีเมล (ถ้าตั้งค่าไว้)

### 2. Deploy Previews สำหรับ Pull Requests

ถ้าคุณสร้าง Pull Request บน GitHub:

1. Netlify จะสร้าง **Deploy Preview** อัตโนมัติ
2. คุณจะได้ URL ชั่วคราวสำหรับทดสอบ เช่น:
   ```
   https://deploy-preview-123--yoursite.netlify.app
   ```
3. ทดสอบการเปลี่ยนแปลงก่อนที่จะ merge เข้า main branch
4. เมื่อ merge เสร็จ production site จะ deploy อัตโนมัติ

### 3. Branch Deploys

ตั้งค่าให้ branch อื่นๆ มี URL แยก:

1. ไปที่ **Site configuration** > **Continuous deployment**
2. เลือก **"Branch deploys"**
3. เลือก branches ที่ต้องการ deploy (เช่น `develop`, `staging`)
4. แต่ละ branch จะได้ URL เช่น:
   ```
   https://develop--yoursite.netlify.app
   https://staging--yoursite.netlify.app
   ```

---

## Troubleshooting

### ปัญหา: Build ล้มเหลว

#### 1. Error: "Module not found"
```
Error: Cannot find module '@/lib/something'
```

**วิธีแก้:**
- ตรวจสอบว่า path alias `@/*` ทำงานถูกต้องใน `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "paths": {
        "@/*": ["./src/*"]
      }
    }
  }
  ```
- ลอง clear cache:
  ```bash
  rm -rf .next node_modules
  npm install
  npm run build
  ```

#### 2. Error: "Turbopack not supported"
```
Error: Turbopack is not supported on Netlify
```

**วิธีแก้:**
- อัพเดต `package.json` ให้ใช้ Turbopack แค่ dev mode:
  ```json
  {
    "scripts": {
      "dev": "next dev --turbopack",
      "build": "next build"
    }
  }
  ```
- **หมายเหตุ:** ไฟล์ปัจจุบันใช้ `--turbopack` ใน build แล้ว ถ้ามีปัญหาให้ลบ flag นี้ออก

#### 3. Error: Environment variables not defined
```
Error: SUPABASE_URL is not defined
```

**วิธีแก้:**
- ตรวจสอบว่าตั้งค่า environment variables ใน Netlify แล้ว
- ไปที่ **Site configuration** > **Environment variables**
- ตรวจสอบชื่อตัวแปรว่าสะกดถูกต้อง (case-sensitive)
- Clear deploy cache แล้ว deploy ใหม่:
  - **Site configuration** > **Build & deploy** > **Clear cache and retry deploy**

### ปัญหา: PWA ไม่ติดตั้งได้

#### 1. ไม่มีปุ่ม "Add to Home Screen"

**สาเหตุที่เป็นไปได้:**
- ไม่ได้เปิดผ่าน HTTPS (PWA ต้องใช้ HTTPS)
- Service Worker ยังไม่ทำงาน
- Manifest.json โหลดไม่สำเร็จ

**วิธีแก้:**
1. ตรวจสอบว่าใช้ HTTPS (ต้องมี 🔒 ในแถบ address)
2. เปิด DevTools > Application > Manifest
   - ต้องเห็น manifest.json โหลดสำเร็จ
   - Icons ต้องแสดงครบ (192x192, 512x512)
3. เปิด DevTools > Application > Service Workers
   - ต้องมี Service Worker status "Activated"
   - ถ้าไม่มี ให้ reload หน้าเว็บใหม่

#### 2. Icons ไม่แสดง

**วิธีแก้:**
- ตรวจสอบว่าไฟล์ icons มีอยู่จริงใน `public/icons/`:
  ```bash
  ls -la public/icons/
  # ต้องมี:
  # nextrack-192x192.png
  # nextrack-512x512.png
  ```
- ตรวจสอบว่า `manifest.json` path ถูกต้อง:
  ```json
  {
    "icons": [
      {
        "src": "/icons/nextrack-192x192.png",
        "sizes": "192x192",
        "type": "image/png"
      }
    ]
  }
  ```

### ปัญหา: กล้องไม่เปิด

#### 1. Camera permission denied

**วิธีแก้:**
- ตรวจสอบว่าเปิดผ่าน HTTPS (กล้องไม่ทำงานบน HTTP)
- ตรวจสอบ permission ใน browser settings:
  - **Chrome:** Settings > Privacy and security > Site Settings > Camera
  - **Safari iOS:** Settings > Safari > Camera
- ลอง reload หน้าเว็บแล้วอนุญาต permission ใหม่

#### 2. Camera เปิดแล้วแต่ไม่มีภาพ

**วิธีแก้:**
- ตรวจสอบว่าไม่มีแอปอื่นใช้กล้องอยู่
- ลอง restart browser/แอป
- ลองใช้กล้องหน้า/หลัง สลับกัน

### ปัญหา: GPS ไม่ทำงาน

#### 1. Geolocation permission denied

**วิธีแก้:**
- ตรวจสอบว่าเปิดผ่าน HTTPS
- ตรวจสอบ permission ใน browser settings:
  - **Chrome:** Settings > Privacy and security > Site Settings > Location
  - **Safari iOS:** Settings > Safari > Location Services
- บนมือถือ: ตรวจสอบว่า Location Services เปิดอยู่ในระบบ

#### 2. GPS ไม่แม่นยำ

**วิธีแก้:**
- ใช้งานในที่โล่ง (ไม่ใช่ในอาคารหรือใต้ดิน)
- รอให้ GPS lock สัญญาณ (อาจใช้เวลา 10-30 วินาที)
- ตรวจสอบว่า High Accuracy mode เปิดอยู่:
  - **Android:** Settings > Location > Location services > Google Location Accuracy

### ปัญหา: รูปภาพอัพโหลดไม่ได้

#### 1. Error: "Failed to upload photo"

**วิธีแก้:**
- ตรวจสอบว่า Supabase bucket ชื่อ `attendance-photos` มีอยู่
- ตรวจสอบว่า bucket เป็น **public** และมี read policy:
  - ไปที่ Supabase Dashboard > Storage > attendance-photos > Policies
  - ต้องมี policy "Public read access"
- ตรวจสอบว่าตั้งค่า environment variable ถูกต้อง:
  ```
  SUPABASE_ATTENDANCE_BUCKET=attendance-photos
  ```

#### 2. Error: "413 Payload Too Large"

**วิธีแก้:**
- รูปภาพขนาดใหญ่เกินไป (Netlify limit: 6MB per request)
- แก้โดยลดขนาดรูปก่อนอัพโหลด:
  - ในโค้ดมี image compression อยู่แล้ว
  - ถ้ายังใหญ่ ลด `maxWidth` หรือ `quality` ใน compression config

### ปัญหา: Database/API ไม่ทำงาน

#### 1. Error: "Invalid API key"

**วิธีแก้:**
- ตรวจสอบ environment variables ใน Netlify:
  - `SUPABASE_URL` ต้องขึ้นต้นด้วย `https://`
  - `SUPABASE_SERVICE_ROLE_KEY` ต้องเป็น service role key (ไม่ใช่ anon key)
- ลอง copy-paste key ใหม่จาก Supabase Dashboard
- ตรวจสอบว่าไม่มีช่องว่าง (space) หน้า/หลัง key

#### 2. Error: "Row Level Security policy violation"

**วิธีแก้:**
- API routes ใช้ `service_role` key ซึ่งข้าม RLS
- ถ้าใช้ `anon` key จะต้องมี RLS policies
- ตรวจสอบว่าใช้ `getSupabaseServiceClient()` ใน API routes:
  ```typescript
  import { getSupabaseServiceClient } from '@/lib/supabaseClient';
  const supabase = getSupabaseServiceClient();
  ```

### ปัญหา: Performance ช้า

#### 1. Initial load ช้า

**วิธีแก้:**
- เปิด Image Optimization ใน Next.js (เปิดอยู่แล้ว)
- ใช้ `next/image` component แทน `<img>` (มีแล้วส่วนใหญ่)
- Enable Compression ใน Netlify (เปิดอยู่ default)

#### 2. API response ช้า

**วิธีแก้:**
- ใช้ TanStack Query caching (มีอยู่แล้ว)
- ลดจำนวนข้อมูลที่ดึงมาใน query:
  ```typescript
  // แบบเก่า: ดึงทั้งหมด
  const { data } = await supabase.from('records').select('*');

  // แบบใหม่: ดึงเฉพาะที่ต้องการ
  const { data } = await supabase
    .from('records')
    .select('id, name, date')
    .limit(100);
  ```

---

## Performance Optimization

### 1. Enable CDN Caching

Netlify ใช้ CDN โดย default แต่สามารถปรับแต่งเพิ่มได้:

**ตั้งค่า Cache Headers ใน `netlify.toml`** (ทำไว้แล้ว):
```toml
[[headers]]
  for = "/icons/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/_next/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 2. Optimize Images

#### ใช้ Next.js Image Optimization:
```typescript
import Image from 'next/image';

// แทนที่ <img> ด้วย <Image>
<Image
  src="/path/to/image.jpg"
  alt="Description"
  width={400}
  height={300}
  loading="lazy"
/>
```

#### Compress รูปใน Supabase:
- ใช้ Supabase Image Transformation API:
  ```typescript
  const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}?width=800&quality=80`;
  ```

### 3. Code Splitting

Next.js ทำ code splitting อัตโนมัติ แต่สามารถเพิ่มได้:

```typescript
// Dynamic import สำหรับ component ขนาดใหญ่
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false // ไม่ render ฝั่ง server
});
```

### 4. Database Query Optimization

#### ใช้ Index:
```sql
-- สร้าง index สำหรับ query ที่ใช้บ่อย
CREATE INDEX idx_attendance_date ON attendance_records(date);
CREATE INDEX idx_attendance_employee ON attendance_records(employee_id);
```

#### ใช้ Pagination:
```typescript
const { data, count } = await supabase
  .from('attendance_records')
  .select('*', { count: 'exact' })
  .range(0, 49) // เอาแค่ 50 records แรก
  .order('date', { ascending: false });
```

### 5. Service Worker Caching Strategy

ใน `next.config.ts` มีการตั้งค่า `runtimeCaching` จาก `next-pwa` อยู่แล้ว ซึ่งจะ cache:
- Static assets (images, fonts, JS, CSS)
- API responses (แบบ network-first)
- Pages (แบบ stale-while-revalidate)

---

## Monitoring และ Analytics

### 1. Netlify Analytics

เปิดใช้งาน Netlify Analytics (เสียค่าบริการ $9/เดือน):

1. ไปที่ **Site configuration** > **Analytics**
2. คลิก **"Enable analytics"**
3. คุณจะได้ข้อมูล:
   - Page views
   - Unique visitors
   - Bandwidth usage
   - Top pages
   - Not found (404) pages

### 2. Google Analytics (ฟรี)

เพิ่ม Google Analytics 4:

1. สร้าง GA4 property ที่ [analytics.google.com](https://analytics.google.com)
2. คัดลอก Measurement ID (เช่น `G-XXXXXXXXXX`)
3. เพิ่มใน `src/app/layout.tsx`:

```typescript
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX`}
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-XXXXXXXXXX');
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 3. Error Tracking

ใช้ Sentry สำหรับ track errors (ฟรีสำหรับ small projects):

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

ตั้งค่าใน `sentry.client.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

---

## Security Best Practices

### 1. ตรวจสอบ Environment Variables

✅ **ต้องทำ:**
- เก็บ `SUPABASE_SERVICE_ROLE_KEY` เป็นความลับ
- ใช้ "Sensitive variable" ใน Netlify
- ไม่ commit `.env.local` ลง Git

❌ **ห้ามทำ:**
- ใส่ secret keys ใน client-side code
- Commit `.env.local` ลง GitHub
- Share service role key ในที่สาธารณะ

### 2. Enable Security Headers

Headers สำคัญใน `netlify.toml` (ตั้งค่าไว้แล้ว):

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### 3. CORS Configuration

ใน API routes ให้เพิ่ม CORS headers:

```typescript
export async function POST(request: Request) {
  // ตรวจสอบ origin
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'https://yoursite.netlify.app',
    'https://attendance.yourcompany.com'
  ];

  if (origin && !allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403 });
  }

  // ... rest of API logic
}
```

### 4. Rate Limiting

ใช้ Netlify Rate Limiting (ต้องใช้ Pro plan):

```toml
[[edge_functions]]
  path = "/api/*"
  function = "rate-limit"

[edge_functions.config]
  rate_limit_window = "10s"
  rate_limit_count = 50
```

---

## การ Rollback และ Version Control

### 1. Rollback Deploy

ถ้า deploy ใหม่มีปัญหา สามารถ rollback ได้:

1. ไปที่ **Deploys** tab
2. เลือก deploy เวอร์ชันเก่าที่ต้องการ
3. คลิก **"Publish deploy"**
4. Site จะกลับไปใช้เวอร์ชันเก่าทันที

### 2. Deploy Contexts

Netlify มี 3 deploy contexts:

- **Production**: Branch `main` (deploy อัตโนมัติ)
- **Deploy Preview**: Pull requests (สำหรับ review)
- **Branch deploys**: Branches อื่นๆ (ถ้าตั้งค่าไว้)

### 3. Environment Variables per Context

ตั้งค่า env vars แยกตาม context:

1. **Site configuration** > **Environment variables**
2. กด **"Add variable"** แล้วเลือก **Scopes**:
   - **Production**: ใช้สำหรับ production deploy
   - **Deploy Previews**: ใช้สำหรับ PR previews
   - **Branch deploys**: ใช้สำหรับ specific branches

ตัวอย่าง:
```
Key: SUPABASE_URL
Value (Production): https://prod.supabase.co
Value (Deploy Previews): https://staging.supabase.co
```

---

## สรุป Checklist ก่อน Deploy

ก่อน deploy ครั้งแรก ตรวจสอบให้ครบ:

- [ ] ✅ Node.js 22.x ติดตั้งแล้ว
- [ ] ✅ Project build สำเร็จด้วย `npm run build`
- [ ] ✅ Supabase project สร้างแล้ว
- [ ] ✅ Storage bucket `attendance-photos` สร้างแล้ว (public)
- [ ] ✅ Database migrations รันครบแล้ว
- [ ] ✅ API keys จาก Supabase คัดลอกไว้แล้ว
- [ ] ✅ Push code ขึ้น GitHub แล้ว
- [ ] ✅ เชื่อมต่อ Netlify กับ GitHub repo แล้ว
- [ ] ✅ ตั้งค่า environment variables ใน Netlify ครบ:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (ทำเครื่องหมาย Sensitive)
  - `SUPABASE_ATTENDANCE_BUCKET`
  - `APP_TIMEZONE`
- [ ] ✅ ไฟล์ `netlify.toml` มีอยู่ใน root directory
- [ ] ✅ ไฟล์ `.gitignore` ไม่ให้ commit `.env.local`

---

## คำถามที่พบบ่อย (FAQ)

### Q1: Deploy แล้วแต่แอปไม่ทำงาน?
**A:** ตรวจสอบ build logs ใน Netlify > Deploys > [Latest deploy] > Deploy log หา error messages

### Q2: ค่าใช้จ่ายเท่าไหร่?
**A:**
- Netlify Free tier: 100GB bandwidth/เดือน, 300 build minutes/เดือน (พอสำหรับ small teams)
- Supabase Free tier: 500MB database, 1GB storage, 50MB file upload
- เกินจ่ายค่าบริการเพิ่ม หรืออัพเกรด plan

### Q3: รองรับ offline mode ได้แค่ไหน?
**A:**
- Pages ที่เคยเปิดจะ cache ไว้
- Data ที่เคยดึงจะ cache ตาม TanStack Query config
- ฟีเจอร์ใหม่ (upload รูป, submit form) ต้องใช้เน็ต
- ถ้าต้องการ offline queue ต้องพัฒนาเพิ่ม

### Q4: สามารถใช้กับพนักงานกี่คน?
**A:**
- Netlify: ไม่จำกัดจำนวน users
- Supabase Free: 50,000 monthly active users
- แต่ bandwidth และ storage จำกัดตาม plan

### Q5: ข้อมูลเก็บที่ไหน?
**A:**
- Database: Supabase Postgres (Singapore region)
- Photos: Supabase Storage bucket
- Logs: บางส่วนเก็บใน JSON file (data/app-data.json)

### Q6: ปลอดภัยแค่ไหน?
**A:**
- HTTPS บังคับใช้ (Netlify auto SSL)
- PIN hashing ด้วย bcrypt (10 rounds)
- Rate limiting สำหรับ login (5 attempts/15min)
- Service role key เก็บเป็นความลับ
- RLS policies ใน Supabase

### Q7: อัพเดตโค้ดยังไง?
**A:**
```bash
git add .
git commit -m "Update message"
git push origin main
```
Netlify จะ deploy อัตโนมัติใน 2-5 นาที

### Q8: ลบ deploy เก่าได้ไหม?
**A:** Deploy previews จะถูกลบอัตโนมัติหลัง 30 วัน แต่ production deploys จะเก็บไว้ (เผื่อ rollback)

---

## แหล่งข้อมูลเพิ่มเติม

- **Netlify Documentation:** https://docs.netlify.com/
- **Next.js Documentation:** https://nextjs.org/docs
- **Supabase Documentation:** https://supabase.com/docs
- **PWA Best Practices:** https://web.dev/progressive-web-apps/
- **Next.js on Netlify:** https://docs.netlify.com/frameworks/next-js/

---

## การติดต่อและการสนับสนุน

ถ้ามีปัญหาหรือคำถาม:

1. **Build/Deploy Issues:** ดู build logs ใน Netlify Dashboard
2. **Database Issues:** ดู logs ใน Supabase Dashboard > Logs
3. **Code Issues:** ตรวจสอบ browser console (F12) หา error messages

---

**สำเร็จแล้ว!** 🎉

คุณได้ deploy Attendance Tracker PWA บน Netlify เรียบร้อยแล้ว พนักงานสามารถเข้าถึงแอปได้ทุกที่ทุกเวลาผ่านมือถือ พร้อม install เป็น PWA บน home screen!

หากมีคำถามเพิ่มเติม สามารถดูใน [Troubleshooting](#troubleshooting) หรือตรวจสอบ build logs ใน Netlify Dashboard

---

**เวอร์ชันเอกสาร:** 1.0.0
**อัพเดตล่าสุด:** 30 ตุลาคม 2025
**สถานะ:** Production Ready ✅
