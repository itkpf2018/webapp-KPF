-- Migration: 006_create_leave_requests_table.sql
-- Description: Create leave_requests table to replace filesystem-based leave storage
-- Date: 2025-01-30
-- Author: System Migration (Netlify Deployment Preparation)
--
-- This migration creates the leave_requests table to store employee leave requests
-- that were previously stored in data/app-data.json.
--
-- Rollback: DROP TABLE IF EXISTS leave_requests CASCADE;

-- ============================================================================
-- Create leave_requests table
-- ============================================================================

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'sick', 'vacation', 'personal', etc.
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'approved', 'rejected', 'cancelled'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT leave_requests_valid_dates CHECK (end_date >= start_date),
  CONSTRAINT leave_requests_valid_status CHECK (status IN ('scheduled', 'approved', 'rejected', 'cancelled'))
);

-- ============================================================================
-- Create indexes for common query patterns
-- ============================================================================

-- Index for filtering by employee
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- Index for filtering by date range
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- Composite index for employee + date queries
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_dates ON leave_requests(employee_id, start_date, end_date);

-- ============================================================================
-- Create update trigger for updated_at column
-- ============================================================================

-- Apply trigger to leave_requests (reuse function from migration 005)
CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Add comments for documentation
-- ============================================================================

COMMENT ON TABLE leave_requests IS 'Employee leave requests (replaces data/app-data.json leaves array)';
COMMENT ON COLUMN leave_requests.id IS 'Unique leave request identifier';
COMMENT ON COLUMN leave_requests.employee_id IS 'Employee identifier (references employees)';
COMMENT ON COLUMN leave_requests.employee_name IS 'Employee name (denormalized for reporting)';
COMMENT ON COLUMN leave_requests.type IS 'Leave type (sick, vacation, personal, etc.)';
COMMENT ON COLUMN leave_requests.start_date IS 'First day of leave';
COMMENT ON COLUMN leave_requests.end_date IS 'Last day of leave';
COMMENT ON COLUMN leave_requests.reason IS 'Reason for leave request';
COMMENT ON COLUMN leave_requests.status IS 'Request status: scheduled, approved, rejected, cancelled';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (for API routes)
CREATE POLICY leave_requests_service_role_all
  ON leave_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow employees to view their own leave requests (optional)
-- Uncomment if you want employees to access via client
-- CREATE POLICY leave_requests_employee_read_own
--   ON leave_requests
--   FOR SELECT
--   TO authenticated
--   USING (employee_id = (current_setting('request.jwt.claims', true)::json->>'sub')::text);

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- To verify the migration:
-- SELECT * FROM leave_requests ORDER BY created_at DESC LIMIT 10;
-- SELECT COUNT(*) FROM leave_requests;
