-- Migration: 001_create_user_pins.sql
-- Description: Create user_pins table for PIN-based authentication
-- Date: 2025-10-29

-- Create user_pins table
CREATE TABLE IF NOT EXISTS user_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('employee', 'sales', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,

  -- Unique constraint: one PIN per employee
  CONSTRAINT unique_employee_pin UNIQUE (employee_id)
);

-- Create index for faster PIN lookups
CREATE INDEX IF NOT EXISTS idx_user_pins_employee_id ON user_pins(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_pins_role ON user_pins(role);
CREATE INDEX IF NOT EXISTS idx_user_pins_active ON user_pins(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_user_pins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_pins_updated_at
  BEFORE UPDATE ON user_pins
  FOR EACH ROW
  EXECUTE FUNCTION update_user_pins_updated_at();

-- Insert default admin PIN (PIN: 9999, hashed with bcrypt)
-- IMPORTANT: Change this PIN immediately after setup!
INSERT INTO user_pins (employee_id, employee_name, pin_hash, role, is_active)
VALUES (
  'admin_default',
  'Admin (Default)',
  -- This is bcrypt hash of '9999' (compatible with bcryptjs in Node.js)
  '$2b$10$BfzRhMQNHZ59OKXKOLD5yOwN/Yq5skxck6kkFqGEwbJUaFKnP7pzK',
  'admin',
  true
)
ON CONFLICT (employee_id) DO NOTHING;

-- Add comment
COMMENT ON TABLE user_pins IS 'Stores PIN authentication data for role-based access';
COMMENT ON COLUMN user_pins.pin_hash IS 'Bcrypt hashed PIN (never store plain text)';
COMMENT ON COLUMN user_pins.role IS 'User role: employee (basic), sales (+ dashboard), admin (full access)';

/*
================================================================================
ROLLBACK INSTRUCTIONS
================================================================================

To rollback this migration, run:

DROP TRIGGER IF EXISTS trigger_user_pins_updated_at ON user_pins;
DROP FUNCTION IF EXISTS update_user_pins_updated_at();
DROP INDEX IF EXISTS idx_user_pins_active;
DROP INDEX IF EXISTS idx_user_pins_role;
DROP INDEX IF EXISTS idx_user_pins_employee_id;
DROP TABLE IF EXISTS user_pins;

================================================================================
USAGE NOTES
================================================================================

1. Default Admin PIN: 9999
   - Employee ID: admin_default
   - **CHANGE THIS IMMEDIATELY** after setup!

2. To create new user PINs, use the Admin UI or API:
   POST /api/auth/pins
   {
     "employeeId": "emp_001",
     "employeeName": "John Doe",
     "pin": "1234",
     "role": "employee"
   }

3. PIN Security:
   - PINs are hashed using bcrypt (cost factor 10)
   - Never store plain text PINs
   - Minimum length: 4 digits
   - Maximum attempts: implement rate limiting in application

4. Roles:
   - employee: Access to attendance, sales, stock pages only
   - sales: Employee permissions + Dashboard and Reports
   - admin: Full access to all pages and settings

================================================================================
*/
