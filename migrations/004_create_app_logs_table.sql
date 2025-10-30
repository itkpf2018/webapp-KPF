-- Migration: 004_create_app_logs_table.sql
-- Description: Create app_logs table to replace filesystem-based logging in data/app-data.json
-- Date: 2025-01-30
-- Author: System Migration (Netlify Deployment Preparation)
--
-- This migration creates the app_logs table to store all application logs
-- that were previously stored in data/app-data.json.
--
-- Rollback: DROP TABLE IF EXISTS app_logs CASCADE;

-- ============================================================================
-- Create app_logs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  action TEXT NOT NULL,
  scope TEXT NOT NULL, -- 'attendance', 'sales', 'admin', 'system', etc.
  actor_name TEXT,
  actor_id TEXT,
  details TEXT,
  metadata JSONB, -- Store additional structured data
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Create indexes for common query patterns
-- ============================================================================

-- Index for filtering by scope (most common query)
CREATE INDEX IF NOT EXISTS idx_app_logs_scope ON app_logs(scope);

-- Index for filtering by timestamp (date range queries)
CREATE INDEX IF NOT EXISTS idx_app_logs_timestamp ON app_logs(timestamp DESC);

-- Index for filtering by actor_id (employee-specific logs)
CREATE INDEX IF NOT EXISTS idx_app_logs_actor_id ON app_logs(actor_id) WHERE actor_id IS NOT NULL;

-- Composite index for scope + timestamp (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_app_logs_scope_timestamp ON app_logs(scope, timestamp DESC);

-- ============================================================================
-- Add comments for documentation
-- ============================================================================

COMMENT ON TABLE app_logs IS 'Application-wide activity logs (replaces data/app-data.json logs array)';
COMMENT ON COLUMN app_logs.id IS 'Unique log entry identifier';
COMMENT ON COLUMN app_logs.timestamp IS 'When the action occurred';
COMMENT ON COLUMN app_logs.action IS 'What action was performed (e.g., "checkin", "checkout", "sale_recorded")';
COMMENT ON COLUMN app_logs.scope IS 'Category of log entry (attendance, sales, admin, system)';
COMMENT ON COLUMN app_logs.actor_name IS 'Name of person/system performing the action';
COMMENT ON COLUMN app_logs.actor_id IS 'Employee ID or system identifier';
COMMENT ON COLUMN app_logs.details IS 'Human-readable description of the action';
COMMENT ON COLUMN app_logs.metadata IS 'Additional structured data (store info, amounts, etc.)';
COMMENT ON COLUMN app_logs.created_at IS 'When the log entry was created in the database';

-- ============================================================================
-- Row Level Security (RLS) - Optional but recommended
-- ============================================================================

-- Enable RLS (can be disabled if using service role key only)
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (for API routes)
CREATE POLICY app_logs_service_role_all
  ON app_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to read logs (optional)
-- Uncomment if you want authenticated users to view logs via client
-- CREATE POLICY app_logs_authenticated_read
--   ON app_logs
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- To verify the migration:
-- SELECT * FROM app_logs LIMIT 10;
-- SELECT COUNT(*) FROM app_logs;
