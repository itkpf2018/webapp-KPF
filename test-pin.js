const bcrypt = require('bcryptjs');

const pin = '9999';
const hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

bcrypt.compare(pin, hash).then((result) => {
  console.log('PIN: 9999');
  console.log('Hash:', hash);
  console.log('Match:', result ? '✅ ถูกต้อง' : '❌ ไม่ถูกต้อง');

  if (result) {
    console.log('\n✅ PIN hash ถูกต้อง! ปัญหาอาจอยู่ที่อื่น');
  } else {
    console.log('\n❌ PIN hash ไม่ถูกต้อง! ต้องสร้าง hash ใหม่');
    console.log('\nสร้าง hash ใหม่...');

    bcrypt.genSalt(10).then((salt) => {
      bcrypt.hash(pin, salt).then((newHash) => {
        console.log('Hash ใหม่:', newHash);
        console.log('\nรัน SQL นี้ใน Supabase:');
        console.log(`UPDATE user_pins SET pin_hash = '${newHash}' WHERE employee_id = 'admin_default';`);
      });
    });
  }
}).catch((err) => {
  console.error('Error:', err);
});
