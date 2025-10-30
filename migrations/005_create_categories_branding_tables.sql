-- Migration: 005_create_categories_branding_tables.sql
-- Description: Create categories and branding_settings tables to replace filesystem storage
-- Date: 2025-01-30
-- Author: System Migration (Netlify Deployment Preparation)
--
-- This migration creates tables for product categories and branding settings
-- that were previously stored in data/app-data.json.
--
-- Rollback:
-- DROP TABLE IF EXISTS categories CASCADE;
-- DROP TABLE IF EXISTS branding_settings CASCADE;

-- ============================================================================
-- Create categories table
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL, -- Hex color code (e.g., '#3b82f6')
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Create branding_settings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_path TEXT, -- Path in Supabase Storage bucket or null for default
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default branding record (single row table pattern)
INSERT INTO branding_settings (logo_path, updated_at)
VALUES (NULL, '1970-01-01T00:00:00.000Z'::timestamptz)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Create indexes
-- ============================================================================

-- Index for category name lookups
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- ============================================================================
-- Create update trigger for updated_at columns
-- ============================================================================

-- Create reusable trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to categories
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to branding_settings
CREATE TRIGGER update_branding_settings_updated_at
  BEFORE UPDATE ON branding_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Add comments for documentation
-- ============================================================================

COMMENT ON TABLE categories IS 'Product categories (replaces data/app-data.json categories array)';
COMMENT ON COLUMN categories.id IS 'Unique category identifier';
COMMENT ON COLUMN categories.name IS 'Category name (unique)';
COMMENT ON COLUMN categories.color IS 'Display color in hex format (e.g., #3b82f6)';

COMMENT ON TABLE branding_settings IS 'Application branding settings (single row, replaces data/app-data.json branding object)';
COMMENT ON COLUMN branding_settings.id IS 'Primary key (should only have one row)';
COMMENT ON COLUMN branding_settings.logo_path IS 'Path to logo in Supabase Storage or null for default';
COMMENT ON COLUMN branding_settings.updated_at IS 'When logo was last updated (used for cache busting)';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
CREATE POLICY categories_service_role_all
  ON categories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY branding_settings_service_role_all
  ON branding_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to read (optional)
-- Uncomment if you want client-side access
-- CREATE POLICY categories_authenticated_read
--   ON categories
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- CREATE POLICY branding_settings_authenticated_read
--   ON branding_settings
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- To verify the migration:
-- SELECT * FROM categories;
-- SELECT * FROM branding_settings;
