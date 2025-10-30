/**
 * ตรวจสอบราคาสินค้าใน Supabase
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

async function main() {
  console.log('🔍 ตรวจสอบราคาสินค้าใน product_assignment_units...\n');

  const { data, error } = await supabase
    .from('product_assignment_units')
    .select(`
      id,
      price_pc,
      price_company,
      product_units (
        name,
        product_id,
        products (
          name,
          code
        )
      ),
      product_assignments (
        employee_id,
        employees (
          name
        )
      )
    `);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('📦 ราคาสินค้าทั้งหมด:\n');

  (data as any[])?.forEach((pau: any) => {
    const productName = pau.product_units?.products?.name || 'N/A';
    const productCode = pau.product_units?.products?.code || 'N/A';
    const unitName = pau.product_units?.name || 'N/A';
    const employeeName = pau.product_assignments?.employees?.name || 'N/A';

    console.log(`พนักงาน: ${employeeName}`);
    console.log(`สินค้า: ${productName} (${productCode})`);
    console.log(`หน่วย: ${unitName}`);
    console.log(`ราคาขาย (price_pc): ${pau.price_pc}`);
    console.log(`ราคาบริษัท (price_company): ${pau.price_company}`);
    console.log(`มีทศนิยม? price_pc: ${!Number.isInteger(pau.price_pc)}, price_company: ${!Number.isInteger(pau.price_company)}`);
    console.log('---');
  });

  // ตรวจสอบข้อมูล sales_records ที่พึ่งสร้าง
  console.log('\n💰 ตรวจสอบตัวอย่างข้อมูล sales_records ที่สร้างไป:\n');

  const { data: salesData, error: salesError } = await supabase
    .from('sales_records')
    .select('*')
    .ilike('employee_name', '%นายA%')
    .order('recorded_date', { ascending: false })
    .limit(10);

  if (salesError) {
    console.error('Error:', salesError);
    return;
  }

  if (salesData && salesData.length > 0) {
    salesData.forEach((sale, idx) => {
      console.log(`${idx + 1}. ${(sale as any).product_name || 'N/A'} (${(sale as any).unit_name || 'N/A'})`);
      console.log(`   จำนวน: ${(sale as any).quantity || 0}`);
      console.log(`   ราคา/หน่วย: ${(sale as any).unit_price || 0}`);
      console.log(`   รวม: ${(sale as any).total || 0}`);
      const unitPrice = (sale as any).unit_price || 0;
      const total = (sale as any).total || 0;
      console.log(`   มีทศนิยม? unit_price: ${!Number.isInteger(unitPrice)}, total: ${!Number.isInteger(total)}`);
    });
  } else {
    console.log('ไม่พบข้อมูล');
  }
}

main().catch(console.error);
