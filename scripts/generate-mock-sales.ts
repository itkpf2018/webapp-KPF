/**
 * สคริปต์สำหรับสร้างข้อมูลยอดขายจำลอง 12 เดือน (ปี 2568)
 * สำหรับพนักงาน "นายA"
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import * as fs from 'fs';
import * as path from 'path';

// โหลด .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, ''); // ลบ BOM
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

// Setup Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ไม่พบ SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY ใน environment');
  console.error('กรุณาตรวจสอบไฟล์ .env.local');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

interface EmployeeData {
  id: string;
  name: string;
  employee_code: string | null;
}

interface StoreData {
  id: string;
  name: string;
}

interface ProductAssignmentData {
  assignment_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  store_id: string | null;
  store_name: string | null;
  units: {
    unit_id: string;
    unit_name: string;
    price_pc: number;
    price_company: number;
  }[];
}

async function main() {
  console.log('🚀 เริ่มสร้างข้อมูลยอดขายจำลอง...\n');

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
  console.log(`✅ พบพนักงาน: ${employee.name} (ID: ${employee.id}, รหัส: ${employee.employee_code})\n`);

  // 2. ดึงข้อมูลร้านค้าที่พนักงาน assign
  console.log('🏪 ขั้นตอนที่ 2: ดึงข้อมูลร้านค้าที่ assign...');
  const { data: storeAssignments, error: storeError } = await supabase
    .from('employee_store_assignments')
    .select(`
      store_id,
      is_primary,
      stores (
        id,
        name
      )
    `)
    .eq('employee_id', employee.id);

  if (storeError || !storeAssignments || storeAssignments.length === 0) {
    console.error('❌ ไม่พบร้านค้าที่ assign ให้พนักงาน');
    console.error('Error:', storeError);
    return;
  }

  // Type the store assignment query result
  type StoreAssignmentQueryResult = {
    store_id: string;
    is_primary: boolean;
    stores: { id: string; name: string } | null;
  };

  const stores = ((storeAssignments || []) as StoreAssignmentQueryResult[]).map((sa) => ({
    id: sa.store_id,
    name: sa.stores?.name || 'Unknown',
    is_primary: sa.is_primary
  }));

  console.log(`✅ พบ ${stores.length} ร้านค้า:`);
  stores.forEach(s => {
    console.log(`   - ${s.name}${s.is_primary ? ' (หลัก)' : ''}`);
  });
  console.log();

  // 3. ดึงข้อมูล product assignments และราคา
  console.log('📦 ขั้นตอนที่ 3: ดึงข้อมูลสินค้าและราคา...');
  const { data: assignments, error: assignError } = await supabase
    .from('product_assignments')
    .select(`
      id,
      product_id,
      store_id,
      products (
        id,
        code,
        name
      ),
      stores (
        name
      ),
      product_assignment_units (
        unit_id,
        price_pc,
        price_company,
        is_active,
        product_units (
          name
        )
      )
    `)
    .eq('employee_id', employee.id);

  if (assignError || !assignments || assignments.length === 0) {
    console.error('❌ ไม่พบสินค้าที่ assign ให้พนักงาน');
    console.error('Error:', assignError);
    return;
  }

  // Type the nested query result structure
  type AssignmentQueryResult = {
    id: string;
    product_id: string;
    store_id: string | null;
    products: { code: string; name: string } | null;
    stores: { name: string } | null;
    product_assignment_units: Array<{
      unit_id: string;
      price_pc: number;
      price_company: number;
      is_active: boolean;
      product_units: { name: string } | null;
    }> | null;
  };

  const productAssignments: ProductAssignmentData[] = ((assignments || []) as AssignmentQueryResult[]).map((a) => ({
    assignment_id: a.id,
    product_id: a.product_id,
    product_code: a.products?.code || '',
    product_name: a.products?.name || '',
    store_id: a.store_id,
    store_name: a.store_id ? (a.stores?.name || null) : null,
    units: (a.product_assignment_units || [])
      .filter((pau) => pau.is_active)
      .map((pau) => ({
        unit_id: pau.unit_id,
        unit_name: pau.product_units?.name || '',
        price_pc: pau.price_pc,
        price_company: pau.price_company
      }))
  }));

  console.log(`✅ พบ ${productAssignments.length} สินค้า:`);
  productAssignments.forEach(pa => {
    const storeInfo = pa.store_name ? ` @ ${pa.store_name}` : ' (ทุกร้าน)';
    console.log(`   - ${pa.product_name} (${pa.product_code})${storeInfo}`);
    pa.units.forEach(u => {
      console.log(`      • ${u.unit_name}: ฿${u.price_pc} (บริษัท: ฿${u.price_company})`);
    });
  });
  console.log();

  // 4. สร้างข้อมูลยอดขาย 12 เดือน (ปี 2568 = 2025)
  console.log('💰 ขั้นตอนที่ 4: สร้างข้อมูลยอดขายจำลอง 12 เดือน...');

  const salesRecords: Database['public']['Tables']['sales_records']['Insert'][] = [];
  const year = 2025; // ปี 2568

  // สร้างข้อมูลแต่ละเดือน
  for (let month = 1; month <= 12; month++) {
    const daysInMonth = new Date(year, month, 0).getDate();

    // สุ่มจำนวนรายการต่อเดือน (10-30 รายการ)
    const numRecords = Math.floor(Math.random() * 21) + 10;

    // สร้างรายการขาย
    for (let i = 0; i < numRecords; i++) {
      // สุ่มวันที่
      const day = Math.floor(Math.random() * daysInMonth) + 1;
      const hour = Math.floor(Math.random() * 10) + 8; // 8:00-17:59
      const minute = Math.floor(Math.random() * 60);

      const recordedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const recordedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

      // สุ่มร้านค้า
      const store = stores[Math.floor(Math.random() * stores.length)];

      // สุ่มสินค้า (เฉพาะสินค้าที่ assign กับร้านนี้หรือ global)
      const availableProducts = productAssignments.filter(
        pa => pa.store_id === null || pa.store_id === store.id
      );

      if (availableProducts.length === 0) continue;

      const product = availableProducts[Math.floor(Math.random() * availableProducts.length)];

      if (product.units.length === 0) continue;

      // สุ่มหน่วย
      const unit = product.units[Math.floor(Math.random() * product.units.length)];

      // สุ่มจำนวน (1-20)
      const quantity = Math.floor(Math.random() * 20) + 1;

      // ตรวจสอบว่าราคาเป็นจำนวนเต็ม
      if (!Number.isInteger(unit.price_pc) || !Number.isInteger(unit.price_company)) {
        console.warn(`⚠️ ราคามีทศนิยม: ${product.product_name} (${unit.unit_name}) - pc: ${unit.price_pc}, company: ${unit.price_company}`);
      }

      const total = quantity * unit.price_pc;
      const totalCompany = quantity * unit.price_company;

      salesRecords.push({
        recorded_date: recordedDate,
        recorded_time: recordedTime,
        employee_name: employee.name,
        store_name: store.name,
        product_code: product.product_code,
        product_name: product.product_name,
        unit_name: unit.unit_name,
        quantity,
        unit_price: unit.price_pc,
        total,
        unit_price_company: unit.price_company,
        total_company: totalCompany,
        assignment_id: product.assignment_id,
        unit_id: unit.unit_id,
        submitted_at: new Date(`${recordedDate}T${recordedTime}:00+07:00`).toISOString()
      });
    }

    console.log(`   ✓ สร้างเดือน ${month}/2568: ${numRecords} รายการ`);
  }

  console.log(`\n✅ สร้างข้อมูลทั้งหมด ${salesRecords.length} รายการ\n`);

  // 5. บันทึกลง Supabase
  console.log('💾 ขั้นตอนที่ 5: บันทึกข้อมูลลง Supabase...');

  // แบ่งเป็น batch ละ 100 รายการ
  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < salesRecords.length; i += batchSize) {
    const batch = salesRecords.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('sales_records')
      .insert(batch);

    if (error) {
      console.error(`   ❌ Batch ${Math.floor(i / batchSize) + 1} ล้มเหลว:`, error.message);
      errorCount += batch.length;
    } else {
      console.log(`   ✓ Batch ${Math.floor(i / batchSize) + 1}: บันทึก ${batch.length} รายการ`);
      successCount += batch.length;
    }
  }

  console.log(`\n🎉 เสร็จสิ้น!`);
  console.log(`   - สำเร็จ: ${successCount} รายการ`);
  console.log(`   - ล้มเหลว: ${errorCount} รายการ`);
  console.log(`\n📊 ตรวจสอบข้อมูลที่หน้ารายงานเปรียบเทียบได้เลยครับ`);
}

main().catch(console.error);
