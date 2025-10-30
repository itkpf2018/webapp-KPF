/**
 * ลบข้อมูลยอดขายจำลองของพนักงาน "นายA"
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
  console.log('🗑️  ลบข้อมูลยอดขายของพนักงาน "นายA"...\n');

  // นับจำนวนข้อมูลก่อนลบ
  const { count, error: countError } = await supabase
    .from('sales_records')
    .select('*', { count: 'exact', head: true })
    .ilike('employee_name', '%นายA%')
    .gte('recorded_date', '2025-01-01')
    .lte('recorded_date', '2025-12-31');

  if (countError) {
    console.error('Error counting records:', countError);
    return;
  }

  console.log(`พบข้อมูล ${count} รายการ\n`);

  if (count === 0) {
    console.log('ไม่มีข้อมูลให้ลบ');
    return;
  }

  // ลบข้อมูล
  const { error: deleteError } = await supabase
    .from('sales_records')
    .delete()
    .ilike('employee_name', '%นายA%')
    .gte('recorded_date', '2025-01-01')
    .lte('recorded_date', '2025-12-31');

  if (deleteError) {
    console.error('Error deleting records:', deleteError);
    return;
  }

  console.log('✅ ลบข้อมูลสำเร็จ!\n');
}

main().catch(console.error);
