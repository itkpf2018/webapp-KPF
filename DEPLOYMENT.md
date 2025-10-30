# 🚀 คู่มือ Deploy ขึ้น Vercel

## ขั้นตอนที่ต้องทำเอง (ใช้เวลา 10 นาที)

### 1️⃣ เตรียม GitHub Account
- ไปที่ https://github.com (login หรือสมัครใหม่)

### 2️⃣ สร้าง GitHub Repository
1. คลิก "+" มุมบนขวา → "New repository"
2. ตั้งชื่อ: `attendance-pwa`
3. เลือก **Private**
4. **ไม่ต้อง** tick "Initialize this repository with README"
5. คลิก "Create repository"

### 3️⃣ Push โค้ดขึ้น GitHub

เปิด Command Prompt (Windows) หรือ Terminal (Mac/Linux):

```bash
cd /mnt/d/Desktop/DEV/attendance-pwa

# Initialize Git (ถ้ายังไม่มี)
git init
git add .
git commit -m "Initial commit - Ready for production"

# เชื่อมกับ GitHub (แทน YOUR-USERNAME ด้วยชื่อ GitHub จริง)
git remote add origin https://github.com/YOUR-USERNAME/attendance-pwa.git
git branch -M main
git push -u origin main
```

**หมายเหตุ:** Git อาจจะถาม username/password:
- Username: ชื่อ GitHub ของคุณ
- Password: ใช้ **Personal Access Token** แทน (ไม่ใช่รหัสผ่านปกติ)
  - สร้างที่: GitHub → Settings → Developer settings → Personal access tokens → Generate new token
  - เลือก scope: `repo` (full control)

### 4️⃣ สร้าง Vercel Account
1. ไปที่ https://vercel.com/signup
2. คลิก **"Continue with GitHub"**
3. Authorize Vercel เข้าถึง GitHub

### 5️⃣ Deploy บน Vercel

1. **Import Project:**
   - Vercel Dashboard → "Add New..." → "Project"
   - เลือก repository `attendance-pwa`
   - คลิก "Import"

2. **Configure Build:**
   - Framework: Next.js (เลือกอัตโนมัติ)
   - Build Command: `npm run build` (default)
   - ไม่ต้องแก้อะไร

3. **ตั้งค่า Environment Variables (สำคัญมาก!):**

   คลิกแท็บ "Environment Variables" เพิ่มตัวแปรเหล่านี้:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `SUPABASE_URL` | ดูจาก Supabase Dashboard | Production, Preview, Development |
   | `SUPABASE_SERVICE_ROLE_KEY` | ดูจาก Supabase Dashboard | **Production only** ⚠️ |
   | `SUPABASE_ANON_KEY` | ดูจาก Supabase Dashboard | Production, Preview, Development |
   | `SUPABASE_ATTENDANCE_BUCKET` | `attendance-photos` | All |
   | `APP_TIMEZONE` | `Asia/Bangkok` | All |

   **หา Supabase Keys:**
   - Supabase Dashboard → Project Settings → API
   - URL: Project URL
   - anon key: `anon` `public`
   - service_role key: `service_role` (ใช้ Production only!)

4. **Deploy:**
   - คลิก "Deploy"
   - รอ 2-5 นาที
   - เสร็จแล้วจะได้ URL เช่น `https://attendance-pwa-xxx.vercel.app`

### 6️⃣ ตั้งค่า Supabase
1. Supabase Dashboard → Authentication → URL Configuration
2. เพิ่ม **Site URL**: `https://attendance-pwa-xxx.vercel.app`
3. เพิ่ม **Redirect URLs**: `https://attendance-pwa-xxx.vercel.app/**`

### 7️⃣ ทดสอบ
- เปิด URL ที่ได้จาก Vercel
- ทดสอบ login, upload รูป, ดูรายงาน
- ทดสอบบนมือถือ → Add to Home Screen

---

## 🔄 Update โค้ดครั้งต่อไป

หลังจาก deploy แล้ว ทุกครั้งที่ push GitHub จะ deploy อัตโนมัติ:

```bash
# แก้โค้ด
git add .
git commit -m "Update feature X"
git push origin main

# Vercel deploy อัตโนมัติใน 2-3 นาที
```

---

## ❓ มีปัญหา?

### Build Failed
1. ตรวจสอบว่า `npm run build` ทำงานบน local ได้
2. ดู error logs ใน Vercel Dashboard → Deployments → [Latest] → Build Logs

### Cannot connect to Supabase
1. ตรวจสอบ Environment Variables ว่าใส่ถูกต้อง
2. ตรวจสอบว่า `SUPABASE_SERVICE_ROLE_KEY` เลือก "Production only"
3. Redeploy: Vercel Dashboard → Deployments → [...] → Redeploy

### Photo upload failed
1. ตรวจสอบ Supabase Storage → Buckets → attendance-photos
2. ตรวจสอบ Storage policies (RLS)
3. ตรวจสอบว่า service role key ถูกต้อง

---

## 📱 Custom Domain (Optional)

ถ้ามีโดเมนของตัวเอง:

1. Vercel Dashboard → Settings → Domains
2. Add Domain: `attendance.yourcompany.com`
3. ตั้งค่า DNS:
   ```
   Type: CNAME
   Name: attendance
   Value: cname.vercel-dns.com
   ```

---

## 🎉 เสร็จแล้ว!

ระบบของคุณออนไลน์แล้วที่: `https://attendance-pwa-xxx.vercel.app`

สามารถ Install เป็น App บนมือถือได้เลย!
