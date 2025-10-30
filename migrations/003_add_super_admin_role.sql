-- ============================================================================
-- Migration: 003 - Add Super Admin Role
-- Created: 2025-10-30
-- Description: Add 'super_admin' role to user authentication system
--              Super Admin has access to EVERYTHING including system logs
-- ============================================================================

-- ============================================================================
-- 1. Alter CHECK constraint on user_pins.role to include 'super_admin'
-- ============================================================================

-- Drop the existing CHECK constraint
ALTER TABLE user_pins
DROP CONSTRAINT IF EXISTS user_pins_role_check;

-- Add new CHECK constraint with super_admin included
ALTER TABLE user_pins
ADD CONSTRAINT user_pins_role_check
CHECK (role IN ('employee', 'sales', 'admin', 'super_admin'));

-- ============================================================================
-- 2. Update table comment to reflect new role
-- ============================================================================

COMMENT ON COLUMN user_pins.role IS 'User role: employee (basic), sales (+ dashboard), admin (full access), super_admin (everything + logs)';

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- If you need to rollback this migration:
--
-- WARNING: Before rollback, ensure no users have 'super_admin' role assigned!
-- Check with: SELECT * FROM user_pins WHERE role = 'super_admin';
--
-- If super_admin users exist, either delete them or downgrade to 'admin':
-- UPDATE user_pins SET role = 'admin' WHERE role = 'super_admin';
--
-- Then run rollback:
-- ALTER TABLE user_pins DROP CONSTRAINT IF EXISTS user_pins_role_check;
-- ALTER TABLE user_pins ADD CONSTRAINT user_pins_role_check
--   CHECK (role IN ('employee', 'sales', 'admin'));
-- COMMENT ON COLUMN user_pins.role IS 'User role: employee (basic), sales (+ dashboard), admin (full access)';
--
-- ============================================================================

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Verify constraint was updated:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'user_pins'::regclass
-- AND conname = 'user_pins_role_check';
--
-- Should show: CHECK (role IN ('employee', 'sales', 'admin', 'super_admin'))
-- ============================================================================

-- ============================================================================
-- USAGE NOTES
-- ============================================================================
--
-- Role Hierarchy:
-- 1. employee: Basic access (attendance, sales, stock pages only)
-- 2. sales: Employee permissions + Dashboard and Reports
-- 3. admin: Full access to all pages and settings (EXCEPT system logs)
-- 4. super_admin: EVERYTHING including system logs, audit trails, security settings
--
-- Creating a Super Admin:
-- Use the Admin UI or API to create a new super_admin user:
--   POST /api/auth/pins
--   {
--     "employeeId": "super_admin_001",
--     "employeeName": "Super Admin",
--     "pin": "0000",
--     "role": "super_admin"
--   }
--
-- Security Recommendations:
-- - Limit super_admin role to 1-2 trusted users only
-- - Use strong PINs (not sequential like 0000, 1234)
-- - Enable audit logging for super_admin actions
-- - Regularly review super_admin access logs
-- - Consider implementing separate authentication for super_admin (2FA, etc.)
--
-- ============================================================================

-- Migration completed successfully!
-- Next steps:
-- 1. Update TypeScript types in types/supabase.ts
-- 2. Update frontend role checks to handle super_admin
-- 3. Update API middleware to recognize super_admin role
-- 4. Update navigation/routing logic for super_admin-only pages (e.g., Logs)
-- 5. Consider implementing super_admin-specific audit logging
