-- Migration 011: Create branding_settings table
-- Description: Store branding settings (logo path) in Supabase instead of JSON file
-- Date: 2025-10-30

-- Create branding_settings table (single row table for global branding config)
CREATE TABLE IF NOT EXISTS public.branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_path TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_branding_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_branding_settings_updated_at
  BEFORE UPDATE ON public.branding_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_branding_settings_updated_at();

-- Insert initial row if table is empty
INSERT INTO public.branding_settings (logo_path)
SELECT NULL
WHERE NOT EXISTS (SELECT 1 FROM public.branding_settings);

-- Create index for fast lookups (though single row table)
CREATE INDEX IF NOT EXISTS idx_branding_settings_id
ON public.branding_settings(id);

-- Enable RLS
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
CREATE POLICY service_role_all_branding_settings
ON public.branding_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Allow authenticated users to read branding
CREATE POLICY authenticated_read_branding_settings
ON public.branding_settings
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow anon users to read branding (for public facing pages)
CREATE POLICY anon_read_branding_settings
ON public.branding_settings
FOR SELECT
TO anon
USING (true);

COMMENT ON TABLE public.branding_settings IS 'Global branding settings - logo path stored in Supabase Storage';
COMMENT ON COLUMN public.branding_settings.logo_path IS 'Public URL of logo in Supabase Storage bucket';

-- Rollback instructions:
-- DROP TRIGGER IF EXISTS trigger_branding_settings_updated_at ON public.branding_settings;
-- DROP FUNCTION IF EXISTS update_branding_settings_updated_at();
-- DROP TABLE IF EXISTS public.branding_settings;
