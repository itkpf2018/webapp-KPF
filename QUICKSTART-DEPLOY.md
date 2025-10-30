# ⚡ Quick Start: Deploy ใน 3 ขั้นตอน (10 นาที)

## ✅ สิ่งที่ผมเตรียมให้แล้ว

- ✅ `.env.example` - Template สำหรับ environment variables
- ✅ `vercel.json` - Vercel configuration
- ✅ `.gitignore` - ป้องกันไม่ให้ไฟล์ลับถูก commit
- ✅ `DEPLOYMENT.md` - คู่มือฉบับเต็ม
- ✅ `deploy-setup.sh` / `deploy-setup.bat` - Scripts ช่วย setup Git

## 🚀 ขั้นตอน Deploy

### 1️⃣ Run Setup Script

**Windows (Command Prompt):**
```cmd
cd D:\Desktop\DEV\attendance-pwa
deploy-setup.bat
```

**Mac/Linux/WSL:**
```bash
cd /mnt/d/Desktop/DEV/attendance-pwa
chmod +x deploy-setup.sh
./deploy-setup.sh
```

Script จะถาม GitHub username และ setup Git ให้อัตโนมัติ

---

### 2️⃣ Create GitHub Repository

1. ไปที่ https://github.com/new
2. ตั้งชื่อ: `attendance-pwa`
3. เลือก **Private**
4. **อย่า** tick "Initialize with README"
5. คลิก "Create repository"

---

### 3️⃣ Push to GitHub

```bash
git push -u origin main
```

**หมายเหตุ:** Git จะถาม username/password:
- Username: ชื่อ GitHub ของคุณ
- Password: ใช้ **Personal Access Token** (ไม่ใช่รหัสผ่านปกติ)
  - สร้าง Token: https://github.com/settings/tokens
  - คลิก "Generate new token (classic)"
  - เลือก scope: `repo` (full control of private repositories)
  - Copy token ไว้ใช้แทน password

---

### 4️⃣ Deploy on Vercel

1. **สร้าง Vercel Account:**
   - ไปที่ https://vercel.com/signup
   - คลิก "Continue with GitHub"
   - Authorize Vercel

2. **Import Project:**
   - Dashboard → "Add New..." → "Project"
   - เลือก `attendance-pwa` repository
   - คลิก "Import"

3. **ตั้งค่า Environment Variables:**

   คลิกแท็บ "Environment Variables" เพิ่มตัวแปร:

   ```
   SUPABASE_URL = https://your-project.supabase.co
   SUPABASE_ANON_KEY = eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY = eyJhbGc... (Production only!)
   SUPABASE_ATTENDANCE_BUCKET = attendance-photos
   APP_TIMEZONE = Asia/Bangkok
   ```

   **หา Supabase Keys:**
   - Supabase Dashboard → Project Settings → API

4. **Deploy:**
   - คลิก "Deploy"
   - รอ 2-5 นาที
   - เสร็จแล้วได้ URL: `https://attendance-pwa-xxx.vercel.app`

---

### 5️⃣ ตั้งค่า Supabase

Supabase Dashboard → Authentication → URL Configuration:

```
Site URL: https://attendance-pwa-xxx.vercel.app
Redirect URLs: https://attendance-pwa-xxx.vercel.app/**
```

---

## 🎉 เสร็จแล้ว!

ทดสอบเว็บไซต์:
- ✅ เปิด URL
- ✅ Login admin
- ✅ Upload รูป
- ✅ ดูรายงาน
- ✅ Install PWA บนมือถือ

---

## 🔄 Update ครั้งต่อไป

```bash
git add .
git commit -m "Update feature X"
git push origin main
# Vercel จะ deploy อัตโนมัติ
```

---

## 📚 อ่านเพิ่มเติม

- คู่มือฉบับเต็ม: `DEPLOYMENT.md`
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs

---

## ❓ มีปัญหา?

### Build Failed
```bash
# ทดสอบ build local ก่อน
npm run build

# ดู error logs
# Vercel Dashboard → Deployments → [Latest] → Build Logs
```

### Cannot connect to Supabase
1. ตรวจสอบ Environment Variables ใน Vercel
2. ตรวจสอบว่า `SUPABASE_SERVICE_ROLE_KEY` เลือก "Production only"
3. Redeploy: Vercel Dashboard → [...] → Redeploy

### Photo upload failed
1. ตรวจสอบ Supabase Storage bucket: `attendance-photos`
2. ตรวจสอบ Storage RLS policies
3. ตรวจสอบว่า service role key ถูกต้อง

---

## 🎯 Checklist

- [ ] สร้าง GitHub repo
- [ ] Push code ขึ้น GitHub
- [ ] สร้าง Vercel account
- [ ] Import project to Vercel
- [ ] ตั้งค่า Environment Variables
- [ ] Deploy
- [ ] อัปเดต Supabase Redirect URLs
- [ ] ทดสอบเว็บไซต์
- [ ] Install PWA บนมือถือ

---

ขอให้โชคดีกับการ deploy! 🚀
