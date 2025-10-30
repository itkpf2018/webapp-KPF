/**
 * สคริปต์สร้างข้อมูล attendance records จำลอง
 * สำหรับพนักงาน "นายA" เดือนตุลาคม 2568 (20 วัน)
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import * as fs from 'fs';
import * as path from 'path';

// โหลด .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const match = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

interface EmployeeData {
  id: string;
  name: string;
  employee_code: string | null;
}

interface StoreData {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

async function main() {
  console.log('🚀 เริ่มสร้างข้อมูล attendance records จำลอง...\n');

  // 1. ดึงข้อมูลพนักงาน "นายA"
  console.log('📋 ขั้นตอนที่ 1: ค้นหาพนักงาน "นายA"...');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, name, employee_code')
    .ilike('name', '%นายA%')
    .limit(1);

  if (empError || !employees || employees.length === 0) {
    console.error('❌ ไม่พบพนักงาน "นายA" ในระบบ');
    console.error('Error:', empError);
    return;
  }

  const employee = employees[0] as EmployeeData;
  console.log(`✅ พบพนักงาน: ${employee.name} (ID: ${employee.id})\n`);

  // 2. ดึงข้อมูลร้าน "KPF"
  console.log('🏪 ขั้นตอนที่ 2: ค้นหาร้าน "KPF"...');
  const { data: stores, error: storeError } = await supabase
    .from('stores')
    .select('id, name, latitude, longitude')
    .ilike('name', '%KPF%')
    .limit(1);

  if (storeError || !stores || stores.length === 0) {
    console.error('❌ ไม่พบร้าน "KPF" ในระบบ');
    console.error('Error:', storeError);
    return;
  }

  const store = stores[0] as StoreData;
  console.log(`✅ พบร้าน: ${store.name}`);
  console.log(`   GPS: ${store.latitude}, ${store.longitude}\n`);

  // 3. สุ่ม 20 วันในเดือนตุลาคม 2025
  console.log('📅 ขั้นตอนที่ 3: สุ่ม 20 วันในเดือนตุลาคม 2568...');

  const year = 2025; // ปี 2568
  const month = 10; // ตุลาคม
  const daysInMonth = 31; // ตุลาคมมี 31 วัน

  // สุ่ม 20 วันไม่ซ้ำกัน
  const selectedDays = new Set<number>();
  while (selectedDays.size < 20) {
    const day = Math.floor(Math.random() * daysInMonth) + 1;
    selectedDays.add(day);
  }

  const sortedDays = Array.from(selectedDays).sort((a, b) => a - b);
  console.log(`✅ สุ่มได้ 20 วัน: ${sortedDays.join(', ')}\n`);

  // 4. สร้างข้อมูล attendance records
  console.log('⏰ ขั้นตอนที่ 4: สร้างข้อมูล check-in และ check-out...');

  const attendanceRecords: Database['public']['Tables']['attendance_records']['Insert'][] = [];

  for (const day of sortedDays) {
    const recordedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Check-in (เช้า 08:00-09:00)
    const checkInHour = 8;
    const checkInMinute = Math.floor(Math.random() * 60);
    const checkInTime = `${String(checkInHour).padStart(2, '0')}:${String(checkInMinute).padStart(2, '0')}`;

    // เพิ่มความแม่นยำ GPS แบบสุ่มเล็กน้อย (±0.0001 degrees ≈ ±10 เมตร)
    const latVariation = (Math.random() - 0.5) * 0.0002;
    const lngVariation = (Math.random() - 0.5) * 0.0002;

    attendanceRecords.push({
      recorded_date: recordedDate,
      recorded_time: checkInTime,
      status: 'check-in',
      employee_name: employee.name,
      store_name: store.name,
      note: null,
      latitude: store.latitude ? store.latitude + latVariation : null,
      longitude: store.longitude ? store.longitude + lngVariation : null,
      accuracy: Math.floor(Math.random() * 20) + 5, // 5-25 เมตร
      location_display: store.name,
      photo_public_url: null, // ไม่มีรูปจริง (ข้อมูลจำลอง)
      storage_path: null,
      submitted_at: new Date(`${recordedDate}T${checkInTime}:00+07:00`).toISOString(),
    });

    // Check-out (เย็น 17:00-18:00)
    const checkOutHour = 17;
    const checkOutMinute = Math.floor(Math.random() * 60);
    const checkOutTime = `${String(checkOutHour).padStart(2, '0')}:${String(checkOutMinute).padStart(2, '0')}`;

    const latVariation2 = (Math.random() - 0.5) * 0.0002;
    const lngVariation2 = (Math.random() - 0.5) * 0.0002;

    attendanceRecords.push({
      recorded_date: recordedDate,
      recorded_time: checkOutTime,
      status: 'check-out',
      employee_name: employee.name,
      store_name: store.name,
      note: null,
      latitude: store.latitude ? store.latitude + latVariation2 : null,
      longitude: store.longitude ? store.longitude + lngVariation2 : null,
      accuracy: Math.floor(Math.random() * 20) + 5, // 5-25 เมตร
      location_display: store.name,
      photo_public_url: null, // ไม่มีรูปจริง (ข้อมูลจำลอง)
      storage_path: null,
      submitted_at: new Date(`${recordedDate}T${checkOutTime}:00+07:00`).toISOString(),
    });
  }

  console.log(`✅ สร้างข้อมูลทั้งหมด ${attendanceRecords.length} records (${sortedDays.length} วัน × 2)\n`);

  // แสดงตัวอย่างข้อมูล 3 รายการแรก
  console.log('📝 ตัวอย่างข้อมูล 3 รายการแรก:');
  attendanceRecords.slice(0, 3).forEach((record, idx) => {
    console.log(`${idx + 1}. ${record.recorded_date} ${record.recorded_time} - ${record.status}`);
    console.log(`   พนักงาน: ${record.employee_name} @ ${record.store_name}`);
    console.log(`   GPS: ${record.latitude?.toFixed(6)}, ${record.longitude?.toFixed(6)}`);
  });
  console.log();

  // 5. บันทึกลง Supabase
  console.log('💾 ขั้นตอนที่ 5: บันทึกข้อมูลลง Supabase...');

  const batchSize = 50;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < attendanceRecords.length; i += batchSize) {
    const batch = attendanceRecords.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('attendance_records')
      .insert(batch as any);

    if (error) {
      console.error(`   ❌ Batch ${Math.floor(i / batchSize) + 1} ล้มเหลว:`, error.message);
      errorCount += batch.length;
    } else {
      console.log(`   ✓ Batch ${Math.floor(i / batchSize) + 1}: บันทึก ${batch.length} records`);
      successCount += batch.length;
    }
  }

  console.log(`\n🎉 เสร็จสิ้น!`);
  console.log(`   - สำเร็จ: ${successCount} records`);
  console.log(`   - ล้มเหลว: ${errorCount} records`);
  console.log(`\n📊 ตรวจสอบข้อมูลที่หน้ารายงานลงเวลาได้เลยครับ`);
  console.log(`   พนักงาน: ${employee.name}`);
  console.log(`   เดือน: ตุลาคม 2568`);
  console.log(`   จำนวน: 20 วัน (${successCount} records)`);
}

main().catch(console.error);
