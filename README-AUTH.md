# PIN Authentication System - คู่มือการใช้งาน

ระบบการยืนยันตัวตนด้วย PIN สำหรับ Attendance Tracker PWA

## 📋 สารบัญ

1. [ภาพรวมระบบ](#ภาพรวมระบบ)
2. [การติดตั้งและเริ่มต้นใช้งาน](#การติดตั้งและเริ่มต้นใช้งาน)
3. [บทบาทผู้ใช้งาน (User Roles)](#บทบาทผู้ใช้งาน-user-roles)
4. [การจัดการ PIN](#การจัดการ-pin)
5. [การเข้าสู่ระบบ](#การเข้าสู่ระบบ)
6. [การออกจากระบบ](#การออกจากระบบ)
7. [ความปลอดภัย](#ความปลอดภัย)
8. [การแก้ไขปัญหา](#การแก้ไขปัญหา)

---

## ภาพรวมระบบ

ระบบ PIN Authentication เป็นระบบยืนยันตัวตนที่ออกแบบมาเพื่อความสะดวกและปลอดภัย โดยผู้ใช้งานสามารถเข้าสู่ระบบได้ด้วย PIN 4-6 หลัก แทนการใช้ username/password แบบเดิม

### คุณสมบัติหลัก

- ✅ **ง่ายต่อการใช้งาน**: เข้าสู่ระบบด้วย PIN แค่ 4-6 หลัก
- ✅ **ปลอดภัย**: PIN ถูกเข้ารหัสด้วย bcrypt (10 salt rounds)
- ✅ **Rate Limiting**: Lock account 15 นาทีหลังผิด 5 ครั้ง
- ✅ **Audit Logging**: บันทึกทุก login attempt พร้อม IP/User Agent
- ✅ **Role-Based Access Control**: จำกัดสิทธิ์การเข้าถึงตามบทบาทผู้ใช้
- ✅ **Session Management**: จดจำผู้ใช้งานเป็นเวลา 24 ชั่วโมง
- ✅ **Admin UI**: จัดการ PIN ผ่าน web interface (ไม่ต้องใช้ SQL)
- ✅ **Type-Safe**: ตรวจสอบ TypeScript ครบทุก API

---

## การติดตั้งและเริ่มต้นใช้งาน

### ขั้นตอนที่ 1: รัน Database Migrations

เปิด Supabase SQL Editor และรัน migration files ตามลำดับ:

#### Migration 1: User PINs Table
```bash
# ไฟล์: migrations/001_create_user_pins.sql
```

**สิ่งที่ migration จะสร้าง:**
- ตาราง `user_pins` สำหรับเก็บข้อมูล PIN ของผู้ใช้
- Default admin PIN: `9999` (⚠️ **ต้องเปลี่ยนทันทีหลังติดตั้ง**)
- Indexes สำหรับ performance
- Trigger สำหรับอัปเดต `updated_at` อัตโนมัติ

#### Migration 2: Security Features
```bash
# ไฟล์: migrations/002_create_auth_security.sql
```

**สิ่งที่ migration จะสร้าง:**
- ตาราง `auth_audit_logs` สำหรับบันทึก login attempts
- ตาราง `auth_rate_limits` สำหรับ rate limiting
- Helper functions: `is_account_locked()`, `reset_rate_limit()`, `cleanup_old_audit_logs()`
- Indexes สำหรับ query performance

### ขั้นตอนที่ 2: ตรวจสอบ Environment Variables

ตรวจสอบว่าไฟล์ `.env.local` มี Supabase credentials:

```env
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_ATTENDANCE_BUCKET=your_bucket_name
```

### ขั้นตอนที่ 3: Build และทดสอบ

```bash
# ติดตั้ง dependencies (ถ้ายังไม่ได้ทำ)
npm install

# ทดสอบ build
npm run build

# รัน development server
npm run dev
```

### ขั้นตอนที่ 4: เข้าสู่ระบบครั้งแรกด้วย Admin PIN

1. เปิดเบราว์เซอร์ไปที่ `http://localhost:3000/login`
2. กรอก PIN: `9999`
3. ระบบจะเข้าสู่หน้าหลักด้วยสิทธิ์ Admin

⚠️ **สำคัญ:** เปลี่ยน PIN ของ Admin ทันทีหลังจากเข้าสู่ระบบครั้งแรก!

---

## บทบาทผู้ใช้งาน (User Roles)

ระบบมี 3 บทบาทหลัก แต่ละบทบาทมีสิทธิ์การเข้าถึงที่แตกต่างกัน:

### 1. Employee (พนักงาน)

**สิทธิ์การเข้าถึง:**
- ✅ หน้าลงเวลา (`/`)
- ✅ หน้าบันทึกยอดขาย (`/sales`)
- ✅ หน้าจัดการสต็อก (`/stock`)
- ❌ Dashboard และ Reports
- ❌ Settings และการตั้งค่าระบบ

**การใช้งาน:**
```
พนักงานทั่วไปที่ต้องการ:
- ลงเวลาเข้า-ออกงาน
- บันทึกยอดขาย
- จัดการสต็อกสินค้า
```

### 2. Sales (ฝ่ายขาย)

**สิทธิ์การเข้าถึง:**
- ✅ ทุกอย่างที่ Employee เข้าถึงได้
- ✅ Dashboard (`/admin`)
- ✅ Reports ทุกประเภท (`/admin/reports/*`)
- ❌ Settings และการจัดการระบบ

**การใช้งาน:**
```
หัวหน้าทีมขาย / Sales Manager ที่ต้องการ:
- ดู Dashboard และ KPIs
- ดูรายงานยอดขาย
- วิเคราะห์ประสิทธิภาพทีม
```

### 3. Admin (ผู้ดูแลระบบ)

**สิทธิ์การเข้าถึง:**
- ✅ เข้าถึงได้ทุกหน้า
- ✅ จัดการพนักงาน (`/admin/settings?section=employees`)
- ✅ จัดการร้านค้า (`/admin/settings?section=stores`)
- ✅ จัดการสินค้า (`/admin/settings?section=products`)
- ✅ จัดการการลา (`/admin/settings?section=leaves`)
- ✅ ดู System Logs (`/admin/logs`)

**การใช้งาน:**
```
ผู้ดูแลระบบที่มีสิทธิ์เต็ม:
- จัดการผู้ใช้งานทั้งหมด
- ตั้งค่าระบบ
- สร้าง/ลบ PIN
- ดู audit logs
```

---

## การจัดการ PIN

### ✨ Admin UI (แนะนำ)

ตั้งแต่เวอร์ชัน 1.1.0 เป็นต้นไป สามารถจัดการ PIN ผ่าน Web Interface ได้แล้ว!

**เข้าถึง:** `http://localhost:3000/admin/user-pins` (Admin เท่านั้น)

#### ฟีเจอร์หลัก:
- ✅ **Dashboard**: แสดงสถิติผู้ใช้งาน (ทั้งหมด, Active, Inactive)
- ✅ **ตารางข้อมูล**: แสดงรายชื่อ PIN ทั้งหมดพร้อม role badges
- ✅ **สร้าง PIN**: กรอกรหัสพนักงาน, ชื่อ, PIN (4-6 หลัก), และเลือก role
- ✅ **แก้ไข PIN**: เปลี่ยนชื่อ, PIN ใหม่, หรือเปลี่ยน role
- ✅ **Toggle Status**: เปิด/ปิดการใช้งาน PIN แบบ inline
- ✅ **ลบ PIN**: ลบถาวร (มี confirmation dialog)
- ✅ **Real-time Updates**: ใช้ React Query สำหรับ data synchronization

#### วิธีใช้งาน:

**1. สร้าง PIN ใหม่:**
```
1. คลิกปุ่ม "สร้าง PIN ใหม่"
2. กรอกข้อมูล:
   - รหัสพนักงาน (เช่น EMP001)
   - ชื่อ-สกุล
   - PIN 4-6 หลัก (ตัวเลขเท่านั้น)
   - เลือก role (employee/sales/admin)
3. คลิก "สร้าง"
```

**2. แก้ไข PIN:**
```
1. คลิกปุ่ม แก้ไข (ไอคอน Edit) ในแถวที่ต้องการ
2. แก้ไขข้อมูล:
   - ชื่อ-สกุล
   - PIN ใหม่ (ถ้าต้องการเปลี่ยน)
   - Role
3. คลิก "บันทึก"
```

**3. เปิด/ปิดการใช้งาน:**
```
1. คลิกที่ badge Active/Inactive ในคอลัมน์ "สถานะ"
2. ระบบจะ toggle สถานะทันที
```

**4. ลบ PIN:**
```
1. คลิกปุ่ม ลบ (ไอคอน Trash) ในแถวที่ต้องการ
2. ยืนยันการลบใน dialog
3. ระบบจะลบถาวร (ไม่สามารถกู้คืนได้)
```

### 🔧 วิธีขั้นสูง (SQL/Script)

#### สร้าง PIN ผ่าน SQL

```sql
-- สร้าง PIN สำหรับพนักงานใหม่
-- ⚠️ PIN จะถูกเข้ารหัสโดย API - ไม่ควรใช้วิธีนี้
-- แนะนำให้ใช้ Admin UI แทน
```

#### สร้าง PIN ผ่าน Node.js Script

สร้างไฟล์ `scripts/create-pin.ts`:

```typescript
import { hashPin } from '@/lib/pinAuth';

async function createPin() {
  const pin = '1234'; // PIN ที่ต้องการสร้าง
  const hash = await hashPin(pin);
  console.log('Hashed PIN (bcrypt):', hash);
}

createPin();
```

รัน script:

```bash
npx tsx scripts/create-pin.ts
```

---

## การเข้าสู่ระบบ

### ขั้นตอนการ Login

1. เปิดแอป → ระบบจะ redirect ไปหน้า `/login` อัตโนมัติ
2. กรอก PIN (4-6 หลัก)
3. กดปุ่ม "เข้าสู่ระบบ"
4. ระบบจะตรวจสอบ PIN และ redirect ไปหน้าหลัก

### ตัวอย่าง PIN

```
Admin:    9999 (default - ต้องเปลี่ยนทันที!)
Employee: 1234, 5678, etc.
Sales:    3456, 7890, etc.
```

### Session Management

- ✅ Session อยู่ได้ 24 ชั่วโมง
- ✅ จดจำการ login แม้ปิดแอป (httpOnly cookie)
- ✅ Auto-redirect ถ้ายังไม่ได้ login
- ✅ Auto-redirect ถ้า session หมดอายุ

### ตัวอย่างการใช้งาน useAuth Hook

```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, hasRole, logout } = useAuth();

  if (!isAuthenticated) {
    return <p>กรุณาเข้าสู่ระบบ</p>;
  }

  return (
    <div>
      <p>สวัสดี {user?.employeeName}</p>
      <p>บทบาท: {user?.role}</p>

      {hasRole(['admin', 'sales']) && (
        <p>คุณสามารถดู Dashboard ได้</p>
      )}

      <button onClick={logout}>ออกจากระบบ</button>
    </div>
  );
}
```

---

## การออกจากระบบ

### วิธีที่ 1: ใช้ปุ่ม Logout ใน Navigation

- Desktop: คลิกปุ่ม "ออกจากระบบ" ที่มุมขวาบน
- Mobile: เปิดเมนู → เลื่อนลงล่าง → คลิก "ออกจากระบบ"

### วิธีที่ 2: ใช้ useAuth Hook

```typescript
const { logout } = useAuth();

await logout();
```

### สิ่งที่เกิดขึ้นเมื่อ Logout

1. ✅ ลบ session cookies ทั้งหมด
2. ✅ Clear auth state
3. ✅ Redirect ไปหน้า `/login`

---

## ความปลอดภัย

### การเข้ารหัส PIN

ระบบใช้ **bcrypt** สำหรับเข้ารหัส PIN (10 salt rounds):

```typescript
// src/lib/pinAuth.ts
import bcrypt from 'bcryptjs';

async function hashPin(pin: string): Promise<string> {
  // Validation: 4-6 หลัก, ตัวเลขเท่านั้น
  if (!pin || pin.length < 4 || pin.length > 6) {
    throw new Error('PIN must be 4-6 digits');
  }
  if (!/^\d+$/.test(pin)) {
    throw new Error('PIN must contain only digits');
  }

  // Hash with bcrypt (10 salt rounds)
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
}

async function verifyPin(pin: string, hash: string): Promise<boolean> {
  // Backward compatibility: Legacy SHA-256 hashes
  if (hash.startsWith('$sha256$')) {
    const legacyHash = createHash('sha256')
      .update(pin + (process.env.PIN_SALT || 'default-salt'))
      .digest('hex');
    return hash === `$sha256$${legacyHash}`;
  }

  // Modern bcrypt verification
  return bcrypt.compare(pin, hash);
}
```

✅ **ความปลอดภัย:**
- bcrypt ถูกออกแบบมาเพื่อป้องกัน brute-force attacks
- 10 salt rounds = balance ระหว่างความปลอดภัยและ performance
- รองรับ legacy SHA-256 hashes สำหรับ backward compatibility

### Rate Limiting & Account Lockout

ระบบจำกัดการพยายาม login เพื่อป้องกัน brute-force attacks:

**กลไก:**
- ❌ **5 ครั้งผิด** = บัญชีถูกล็อค 15 นาที
- ✅ **Login สำเร็จ** = reset ตัวนับ failed attempts
- 🔒 **ขณะล็อค** = HTTP 429 Too Many Requests

**Implementation:**
```typescript
// src/lib/authSecurity.ts
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Check before authentication
const rateLimitCheck = await checkRateLimit(employeeId);
if (rateLimitCheck.isLocked) {
  return { error: `บัญชีถูกล็อคชั่วคราว กรุณารออีก ${rateLimitCheck.remainingMinutes} นาที` };
}

// Record failure
if (!isPinValid) {
  await recordFailedAttempt(employeeId);
}

// Reset on success
await resetRateLimit(employeeId);
```

**ตาราง Database:**
```sql
-- auth_rate_limits
CREATE TABLE auth_rate_limits (
  employee_id TEXT PRIMARY KEY,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  last_failed_at TIMESTAMPTZ NULL,
  locked_until TIMESTAMPTZ NULL
);
```

### Audit Logging

บันทึกทุก login attempt พร้อม metadata:

**ข้อมูลที่บันทึก:**
- ✅ Employee ID & Name
- ✅ Success / Failure
- ✅ Failure Reason (`invalid_format`, `invalid_pin`, `account_locked`)
- ✅ IP Address
- ✅ User Agent
- ✅ Timestamp

**Implementation:**
```typescript
await logAuthAttempt({
  employeeId: user.employee_id,
  employeeName: user.employee_name,
  success: true,
  failureReason: null,
  ipAddress: getClientIp(request),
  userAgent: getUserAgent(request),
});
```

**ตาราง Database:**
```sql
-- auth_audit_logs (เก็บ 90 วัน)
CREATE TABLE auth_audit_logs (
  id UUID PRIMARY KEY,
  employee_id TEXT NULL,
  employee_name TEXT NULL,
  success BOOLEAN NOT NULL,
  failure_reason TEXT NULL,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cleanup function (รันเป็นระยะ)
SELECT cleanup_old_audit_logs(); -- ลบ logs เก่ากว่า 90 วัน
```

**ดู Audit Logs:**
```sql
-- ดู login attempts ล่าสุด
SELECT * FROM auth_audit_logs
ORDER BY created_at DESC
LIMIT 100;

-- ดู failed attempts ของ employee
SELECT * FROM auth_audit_logs
WHERE employee_id = 'EMP001' AND success = false
ORDER BY created_at DESC;

-- สถิติ rate limiting
SELECT * FROM auth_rate_limits
WHERE failed_attempts > 0
ORDER BY failed_attempts DESC;
```

### Session Storage

```typescript
// Session ถูกเก็บใน httpOnly cookies
// - auth-session: session token (httpOnly, secure)
// - auth-user: user data (accessible, secure)

// ความปลอดภัย:
// ✅ httpOnly - ป้องกัน XSS attacks
// ✅ secure flag - ใช้ HTTPS ใน production
// ✅ sameSite: 'lax' - ป้องกัน CSRF
// ✅ 24 hour expiry
```

### Middleware Protection

```typescript
// src/middleware.ts
// ป้องกัน route ทั้งหมดด้วย middleware

// Public routes (ไม่ต้อง login)
['/login', '/api/auth/login', '/api/auth/verify']

// Protected routes (ต้อง login)
- / (employee, sales, admin)
- /sales (employee, sales, admin)
- /stock (employee, sales, admin)
- /admin (sales, admin)
- /admin/settings (admin only)
- /admin/user-pins (admin only)
```

---

## การแก้ไขปัญหา

### ปัญหา: ลืม PIN

**วิธีแก้:**

```sql
-- Admin สามารถ reset PIN ให้ได้
-- 1. สร้าง PIN ใหม่ด้วย Node.js script
-- 2. อัปเดตใน database

UPDATE user_pins
SET
  pin_hash = '$sha256$NEW_HASHED_PIN',
  updated_at = NOW()
WHERE employee_id = 'EMP001';
```

### ปัญหา: กรอก PIN ถูกแล้วแต่เข้าไม่ได้

**การตรวจสอบ:**

1. ตรวจสอบว่า PIN ยังคง active อยู่:
   ```sql
   SELECT * FROM user_pins WHERE employee_id = 'EMP001';
   ```

2. ตรวจสอบ salt ใน `.env.local`:
   ```env
   PIN_SALT=your_secret_salt_here
   ```

3. ตรวจสอบ console logs:
   ```bash
   # Terminal
   [login] success: John Doe employee
   ```

### ปัญหา: Session หมดอายุเร็วเกินไป

**วิธีแก้:**

แก้ไข `src/app/api/auth/login/route.ts`:

```typescript
const SESSION_MAX_AGE = 24 * 60 * 60; // 24 hours (default)

// เปลี่ยนเป็น:
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days
```

### ปัญหา: Build ไม่ผ่านเพราะ Type Error

**วิธีแก้:**

```bash
# 1. ลบ cache
rm -rf .next

# 2. ตรวจสอบว่า user_pins อยู่ใน types/supabase.ts
# ที่ตำแหน่ง: src/types/supabase.ts (ไม่ใช่ types/supabase.ts)

# 3. Build ใหม่
npm run build
```

### ปัญหา: Middleware loop / Redirect ไม่หยุด

**วิธีแก้:**

ตรวจสอบว่า `/login` และ `/api/auth/*` อยู่ใน PUBLIC_ROUTES:

```typescript
// src/middleware.ts
const PUBLIC_ROUTES = [
  '/login',
  '/api/auth/login',
  '/api/auth/verify'
];
```

---

## API Reference

### POST `/api/auth/login`

**Request:**
```typescript
{
  pin: string;  // 4-6 digits
}
```

**Response (Success):**
```typescript
{
  success: true;
  user: {
    employeeId: string;
    employeeName: string;
    role: "employee" | "sales" | "admin";
    loginAt: string;
  };
}
```

**Response (Error):**
```typescript
{
  success: false;
  error: string;  // "PIN ไม่ถูกต้อง" | "เกิดข้อผิดพลาด"
}
```

### POST `/api/auth/logout`

**Request:** (no body)

**Response:**
```typescript
{
  success: true;
}
```

### GET `/api/auth/verify`

**Request:** (no body, uses cookies)

**Response (Authenticated):**
```typescript
{
  authenticated: true;
  user: {
    employeeId: string;
    employeeName: string;
    role: "employee" | "sales" | "admin";
    loginAt: string;
  };
}
```

**Response (Not Authenticated):**
```typescript
{
  authenticated: false;
}
```

---

## โครงสร้างไฟล์

```
attendance-pwa/
├── migrations/
│   └── 001_create_user_pins.sql          # Database migration
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/
│   │   │       ├── login/route.ts        # Login API
│   │   │       ├── logout/route.ts       # Logout API
│   │   │       └── verify/route.ts       # Session verify API
│   │   ├── login/
│   │   │   └── page.tsx                  # Login UI page
│   │   └── providers.tsx                 # Auth provider wrapper
│   ├── components/
│   │   └── SiteNav.tsx                   # Nav with role filtering
│   ├── contexts/
│   │   └── AuthContext.tsx               # Auth context + hook
│   ├── lib/
│   │   └── pinAuth.ts                    # PIN hashing utilities
│   ├── types/
│   │   ├── auth.ts                       # Auth TypeScript types
│   │   └── supabase.ts                   # Database types
│   └── middleware.ts                     # Route protection
└── README-AUTH.md                        # เอกสารนี้
```

---

## สรุป

ระบบ PIN Authentication นี้ให้ความสมดุลระหว่าง **ความสะดวก** และ **ความปลอดภัย**:

✅ **ง่าย** - เข้าสู่ระบบด้วย PIN 4-6 หลัก
✅ **ปลอดภัย** - เข้ารหัส PIN, httpOnly cookies, middleware protection
✅ **Role-based** - จำกัดสิทธิ์ตามบทบาทผู้ใช้
✅ **Type-safe** - ตรวจสอบ TypeScript ครบทุก API
✅ **ผ่าน Build** - `npm run build` สำเร็จ ✅

---

## ติดต่อและสนับสนุน

หากพบปัญหาหรือต้องการความช่วยเหลือ:

1. ตรวจสอบ [การแก้ไขปัญหา](#การแก้ไขปัญหา) ในเอกสารนี้
2. ดู logs ใน console: `npm run dev`
3. ตรวจสอบ database: Supabase Table Editor
4. อ่าน CLAUDE.md สำหรับรายละเอียดทางเทคนิค

---

**เอกสารนี้อัปเดตล่าสุด:** 2025-01-29
**เวอร์ชัน:** 1.0.0
**สถานะ:** ✅ Production Ready
