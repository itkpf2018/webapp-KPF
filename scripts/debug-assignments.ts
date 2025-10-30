/**
 * Debug: ตรวจสอบข้อมูล product assignments และราคาแบบละเอียด
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
  console.log('🔍 ตรวจสอบ product assignments ของ "นายA" แบบละเอียด...\n');

  // ดึงข้อมูลพนักงาน
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name')
    .ilike('name', '%นายA%')
    .limit(1);

  if (!employees || employees.length === 0) {
    console.error('ไม่พบพนักงาน นายA');
    return;
  }

  const employee = employees[0] as any;
  console.log(`พนักงาน: ${employee?.name || 'N/A'} (ID: ${employee?.id || 'N/A'})\n`);

  // ดึงข้อมูล assignments พร้อมรายละเอียด
  const { data: assignments, error } = await supabase
    .from('product_assignments')
    .select(`
      id,
      product_id,
      employee_id,
      store_id,
      products (
        id,
        code,
        name
      ),
      product_assignment_units (
        id,
        unit_id,
        price_pc,
        price_company,
        is_active,
        product_units (
          id,
          name,
          sku
        )
      )
    `)
    .eq('employee_id', employee.id);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`พบ ${assignments?.length || 0} product assignments\n`);

  assignments?.forEach((assignment: any, idx) => {
    console.log(`\n[${idx + 1}] Assignment ID: ${assignment?.id || 'N/A'}`);
    console.log(`    Product: ${assignment?.products?.name || 'N/A'} (${assignment?.products?.code || 'N/A'})`);
    console.log(`    Store ID: ${assignment?.store_id || 'NULL (global)'}`);

    const units = (assignment?.product_assignment_units as any[]) || [];
    console.log(`    Units (${units.length}):`);

    units.forEach((pau: any) => {
      console.log(`      - Unit ID: ${pau?.unit_id || 'N/A'}`);
      console.log(`        Unit Name: ${pau?.product_units?.name || 'N/A'}`);
      console.log(`        SKU: ${pau?.product_units?.sku || 'N/A'}`);
      console.log(`        price_pc: ${pau?.price_pc || 0} (type: ${typeof pau?.price_pc})`);
      console.log(`        price_company: ${pau?.price_company || 0} (type: ${typeof pau?.price_company})`);
      console.log(`        is_active: ${pau?.is_active || false}`);
      const pricePc = pau?.price_pc || 0;
      const priceCompany = pau?.price_company || 0;
      console.log(`        มีทศนิยม? price_pc: ${!Number.isInteger(pricePc)}, price_company: ${!Number.isInteger(priceCompany)}`);
    });
  });
}

main().catch(console.error);
