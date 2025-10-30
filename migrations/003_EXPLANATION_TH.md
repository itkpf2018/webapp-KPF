# การเพิ่ม Role "Super Admin" - คำอธิบายภาษาไทย

## ภาพรวมการเปลี่ยนแปลง

Migration นี้เพิ่ม role ใหม่ชื่อ `super_admin` เข้าไปในระบบ authentication เพื่อให้มีผู้ดูแลระบบระดับสูงสุดที่สามารถเข้าถึง**ทุกอย่าง**รวมถึง System Logs ที่ Admin ทั่วไปเข้าไม่ได้

## โครงสร้าง Role ปัจจุบัน

ก่อนการ migrate:
- `employee` - เข้าถึงแค่หน้าบันทึกเวลา, ขาย, สต็อก
- `sales` - เหมือน employee + Dashboard และรายงาน
- `admin` - เข้าถึงทุกหน้ายกเว้น System Logs

หลังการ migrate:
- `employee` - เข้าถึงแค่หน้าบันทึกเวลา, ขาย, สต็อก
- `sales` - เหมือน employee + Dashboard และรายงาน
- `admin` - เข้าถึงทุกหน้ายกเว้น System Logs
- **`super_admin`** - **เข้าถึงทุกอย่าง 100%** รวมถึง System Logs, Audit Trails, การตั้งค่าความปลอดภัย

## ปัญหาที่แก้ไข

### ปัญหาเดิม
ปัจจุบัน Admin ทั่วไปสามารถเข้าถึงทุกอย่างรวมถึง System Logs ซึ่งอาจเป็นปัญหาด้านความปลอดภัยเพราะ:
1. Logs บันทึกข้อมูลละเอียดอ่อน (PIN attempts, IP addresses, failed logins)
2. Admin ทั่วไปอาจแก้ไขหรือลบ logs ทำลายหลักฐาน
3. ไม่มีการแยกระดับความเข้าถึงระหว่าง Admin ทั่วไปกับ Super Admin

### วิธีแก้
เพิ่ม role `super_admin` เพื่อ:
1. **แยกระดับการเข้าถึง**: เฉพาะ Super Admin เท่านั้นที่เข้า Logs ได้
2. **เพิ่มความปลอดภัย**: จำกัดจำนวน Super Admin (แนะนำ 1-2 คนเท่านั้น)
3. **Audit Trail**: ติดตาม actions ของ Super Admin แยกต่างหาก
4. **ป้องกันการแก้ไข logs**: Admin ทั่วไปไม่สามารถลบหรือแก้ไข audit logs ได้

## การทำงานของ Migration

Migration นี้ทำ 2 อย่าง:

### 1. แก้ไข CHECK Constraint
```sql
-- ลบ constraint เดิม
ALTER TABLE user_pins
DROP CONSTRAINT IF EXISTS user_pins_role_check;

-- เพิ่ม constraint ใหม่ที่รองรับ 'super_admin'
ALTER TABLE user_pins
ADD CONSTRAINT user_pins_role_check
CHECK (role IN ('employee', 'sales', 'admin', 'super_admin'));
```

**อธิบาย**:
- Constraint คือกฎที่บังคับใน database ว่าค่าที่บันทึกต้องอยู่ในชุดที่กำหนดเท่านั้น
- ก่อนหน้านี้ role ต้องเป็น 'employee', 'sales', หรือ 'admin' เท่านั้น
- ตอนนี้เพิ่ม 'super_admin' เข้าไปด้วย
- ถ้าพยายามบันทึก role อื่นๆ (เช่น 'hacker') database จะ reject ทันที

### 2. อัปเดต Comment บน Column
```sql
COMMENT ON COLUMN user_pins.role IS 'User role: employee (basic), sales (+ dashboard), admin (full access), super_admin (everything + logs)';
```

**อธิบาย**:
- เพิ่มเอกสารให้ชัดเจนว่า role แต่ละตัวทำอะไรได้บ้าง
- Comment นี้จะแสดงใน Supabase Dashboard และ database tools

## ผลกระทบต่อระบบ

### ฝั่ง Database (ที่ได้จาก Migration)
✅ **ปลอดภัย**: การเปลี่ยนแปลงนี้ไม่กระทบข้อมูลเดิม
- ไม่มีการลบ column
- ไม่มีการเปลี่ยนชนิดข้อมูล
- แค่ขยาย constraint ให้รองรับค่าใหม่

### ฝั่ง Application (ต้องแก้ไขเพิ่ม)
❌ **ยังไม่เสร็จสมบูรณ์**: ต้องแก้ไขโค้ดดังนี้

#### 1. TypeScript Types (✅ เสร็จแล้ว)
ไฟล์ `/types/supabase.ts` อัปเดตแล้วเป็น:
```typescript
role: "employee" | "sales" | "admin" | "super_admin"
```

#### 2. Authentication Middleware (⚠️ ยังต้องทำ)
ไฟล์ที่ต้องแก้:
- `src/middleware.ts` (ถ้ามี)
- `src/app/api/**/route.ts` (API routes ที่เช็ค role)

ตัวอย่างโค้ดที่ต้องแก้:
```typescript
// เดิม
if (user.role === 'admin') {
  // allow access to all admin pages
}

// ใหม่
if (user.role === 'admin' || user.role === 'super_admin') {
  // allow access to all admin pages
}

// สำหรับ Logs (เฉพาะ super_admin)
if (user.role === 'super_admin') {
  // allow access to system logs
}
```

#### 3. Navigation/Routing Logic (⚠️ ยังต้องทำ)
ไฟล์ที่ต้องแก้:
- `src/app/admin/_components/AdminNav.tsx`
- หน้า Logs page (ถ้ามี)

ตัวอย่าง:
```typescript
// แสดงลิงก์ Logs เฉพาะ super_admin
{user.role === 'super_admin' && (
  <Link href="/admin/logs">System Logs</Link>
)}
```

#### 4. API Endpoints (⚠️ ยังต้องทำ)
ปรับปรุง API ที่เกี่ยวข้อง:
- `POST /api/auth/pins` - รองรับการสร้าง super_admin
- `GET /api/admin/logs` - เช็คว่าต้องเป็น super_admin
- อื่นๆ ที่มีการเช็ค role

## วิธีใช้งาน

### สร้าง Super Admin ใหม่
```typescript
// ผ่าน API
POST /api/auth/pins
{
  "employeeId": "super_admin_001",
  "employeeName": "Super Admin",
  "pin": "0000",
  "role": "super_admin"
}
```

หรือ

```sql
-- ผ่าน Supabase SQL Editor
INSERT INTO user_pins (employee_id, employee_name, pin_hash, role, is_active)
VALUES (
  'super_admin_001',
  'Super Admin',
  '$2b$10$BfzRhMQNHZ59OKXKOLD5yOwN/Yq5skxck6kkFqGEwbJUaFKnP7pzK', -- bcrypt hash ของ '9999'
  'super_admin',
  true
);
```

### Upgrade Admin ที่มีอยู่เป็น Super Admin
```sql
-- ค้นหา Admin ที่ต้องการ upgrade
SELECT id, employee_id, employee_name, role
FROM user_pins
WHERE role = 'admin';

-- Upgrade เป็น super_admin
UPDATE user_pins
SET role = 'super_admin'
WHERE employee_id = 'admin_default'; -- แก้ตาม employee_id จริง
```

### Downgrade Super Admin กลับเป็น Admin ธรรมดา
```sql
UPDATE user_pins
SET role = 'admin'
WHERE role = 'super_admin'
  AND employee_id = 'super_admin_001';
```

## ข้อควรระวัง

### 1. จำนวน Super Admin
❗ **แนะนำให้มี 1-2 คนเท่านั้น**
- ยิ่งมีคนเข้าถึง logs ได้มาก ความเสี่ยงยิ่งสูง
- Super Admin ควรเป็นเจ้าของธุรกิจหรือ IT Manager เท่านั้น

### 2. Security Recommendations
🔐 **เพิ่มความปลอดภัย**:
- ใช้ PIN ที่แข็งแรง (ไม่ใช่ 0000, 1234, 9999)
- พิจารณาใช้ 2FA (Two-Factor Authentication) สำหรับ super_admin
- บันทึก audit log แยกต่างหากสำหรับ super_admin actions
- Review access logs ของ super_admin สม่ำเสมอ

### 3. การ Rollback
⚠️ **ก่อน rollback ต้องเช็คก่อน**:
```sql
-- ดูว่ามี super_admin อยู่หรือไม่
SELECT * FROM user_pins WHERE role = 'super_admin';
```

ถ้ามี ต้อง downgrade หรือลบก่อน:
```sql
-- ลบทั้งหมด
DELETE FROM user_pins WHERE role = 'super_admin';

-- หรือ downgrade
UPDATE user_pins SET role = 'admin' WHERE role = 'super_admin';
```

จากนั้นค่อย rollback constraint:
```sql
ALTER TABLE user_pins DROP CONSTRAINT IF EXISTS user_pins_role_check;
ALTER TABLE user_pins ADD CONSTRAINT user_pins_role_check
  CHECK (role IN ('employee', 'sales', 'admin'));
```

## ขั้นตอนการ Deploy

### 1. Run Migration (ฝั่ง Database)
```bash
# 1. เปิด Supabase SQL Editor
# 2. Copy ไฟล์ migrations/003_add_super_admin_role.sql
# 3. Paste และ Run
# 4. ตรวจสอบว่าไม่มี error
```

### 2. Update TypeScript Types (✅ เสร็จแล้ว)
```bash
npm run gen:types
npm run dev
```

### 3. Update Application Code (⚠️ ต้องทำ)
แก้ไขไฟล์ดังนี้:
- [ ] `src/middleware.ts` - เพิ่มการเช็ค super_admin
- [ ] `src/app/admin/_components/AdminNav.tsx` - แสดงลิงก์ Logs
- [ ] `src/app/api/auth/pins/route.ts` - รองรับ super_admin role
- [ ] `src/app/api/admin/logs/route.ts` - ตรวจสอบ super_admin เท่านั้น
- [ ] หน้าอื่นๆ ที่มี role checking

### 4. Testing
```bash
# 1. สร้าง super_admin ทดสอบ
# 2. Login ด้วย super_admin
# 3. ทดสอบว่าเข้า Logs ได้
# 4. Login ด้วย admin ธรรมดา
# 5. ทดสอบว่าเข้า Logs ไม่ได้
```

### 5. Create Super Admin in Production
```sql
-- เฉพาะหลังจาก testing เรียบร้อยแล้ว
INSERT INTO user_pins (employee_id, employee_name, pin_hash, role, is_active)
VALUES (
  'owner_001',
  'Business Owner',
  '$2b$10$...',  -- bcrypt hash ของ PIN จริง
  'super_admin',
  true
);
```

## สรุป

Migration นี้เป็นการเพิ่มความปลอดภัยให้กับระบบโดย:
1. ✅ แยก role ระดับสูงสุด (super_admin) ออกจาก admin ทั่วไป
2. ✅ จำกัดการเข้าถึง System Logs เฉพาะ super_admin
3. ✅ เพิ่ม CHECK constraint ที่ database level ป้องกันการบันทึก role ผิด
4. ✅ ไม่กระทบข้อมูลเดิมในระบบ (backward compatible)

แต่ยังต้องทำเพิ่มเติมฝั่ง application เพื่อ:
- ⚠️ อัปเดตการเช็ค role ในโค้ด
- ⚠️ เพิ่ม UI สำหรับ super_admin-only features
- ⚠️ ทดสอบให้แน่ใจว่า admin ธรรมดาเข้า Logs ไม่ได้

---

**เอกสารนี้อธิบายเฉพาะฝั่ง Database เท่านั้น** สำหรับการใช้งานจริงต้องแก้ไขโค้ดเพิ่มเติมตามที่ระบุด้านบน
