-- ============================================================================
-- Migration: 002 - Authentication Security (Audit Log + Rate Limiting)
-- Created: 2025-01-29
-- Description: Create tables for audit logging and rate limiting
-- ============================================================================

-- ============================================================================
-- 1. Create auth_audit_logs table (Track all login attempts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NULL,                    -- NULL if PIN not found
  employee_name TEXT NULL,
  pin_provided TEXT NULL,                    -- For debugging (optional, can be NULL for security)
  success BOOLEAN NOT NULL,
  failure_reason TEXT NULL,                  -- "invalid_pin" | "account_locked" | "invalid_format"
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_employee_id ON auth_audit_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_success ON auth_audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_created_at ON auth_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_ip_address ON auth_audit_logs(ip_address);

-- ============================================================================
-- 2. Create auth_rate_limits table (Track failed attempts per employee)
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  employee_id TEXT PRIMARY KEY,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  last_failed_at TIMESTAMPTZ NULL,
  locked_until TIMESTAMPTZ NULL,            -- NULL = not locked
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for checking locked accounts
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_locked_until ON auth_rate_limits(locked_until);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_auth_rate_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auth_rate_limits_updated_at
BEFORE UPDATE ON auth_rate_limits
FOR EACH ROW
EXECUTE FUNCTION update_auth_rate_limits_updated_at();

-- ============================================================================
-- 3. Cleanup function (Auto-cleanup old audit logs)
-- ============================================================================

-- Keep audit logs for 90 days
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM auth_audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run manually or via cron)
-- SELECT cleanup_old_audit_logs();

-- ============================================================================
-- 4. Helper function: Reset rate limit for employee
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_rate_limit(p_employee_id TEXT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM auth_rate_limits WHERE employee_id = p_employee_id;
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT reset_rate_limit('EMP001');

-- ============================================================================
-- 5. Helper function: Check if account is locked
-- ============================================================================

CREATE OR REPLACE FUNCTION is_account_locked(p_employee_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  locked_until_time TIMESTAMPTZ;
BEGIN
  SELECT locked_until INTO locked_until_time
  FROM auth_rate_limits
  WHERE employee_id = p_employee_id;

  IF locked_until_time IS NULL THEN
    RETURN FALSE;
  END IF;

  IF locked_until_time > NOW() THEN
    RETURN TRUE;
  ELSE
    -- Lock expired, reset it
    UPDATE auth_rate_limits
    SET locked_until = NULL, failed_attempts = 0
    WHERE employee_id = p_employee_id;
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT is_account_locked('EMP001');

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- If you need to rollback this migration, run the following:
--
-- DROP FUNCTION IF EXISTS is_account_locked(TEXT);
-- DROP FUNCTION IF EXISTS reset_rate_limit(TEXT);
-- DROP FUNCTION IF EXISTS cleanup_old_audit_logs();
-- DROP TRIGGER IF EXISTS auth_rate_limits_updated_at ON auth_rate_limits;
-- DROP FUNCTION IF EXISTS update_auth_rate_limits_updated_at();
-- DROP TABLE IF EXISTS auth_rate_limits;
-- DROP TABLE IF EXISTS auth_audit_logs;
--
-- ============================================================================

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the migration:
--
-- Check tables exist:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('auth_audit_logs', 'auth_rate_limits');
--
-- Check functions exist:
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name IN ('is_account_locked', 'reset_rate_limit', 'cleanup_old_audit_logs');
--
-- ============================================================================

-- Migration completed successfully!
-- Next steps:
-- 1. Update login API to use rate limiting
-- 2. Add audit log entries on login attempts
-- 3. Implement account lockout logic (5 failed attempts = 15 min lock)
