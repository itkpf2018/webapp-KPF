-- Migration: 012_create_leave_requests
-- Description: Create leave_requests table for employee leave management
-- Date: 2025-10-30

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  employee_name TEXT NOT NULL,
  type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on employee_id for faster queries
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON public.leave_requests(employee_id);

-- Create index on dates for range queries
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON public.leave_requests(start_date, end_date);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_leave_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leave_requests_updated_at ON public.leave_requests;
CREATE TRIGGER leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leave_requests_updated_at();

-- Add comment to table
COMMENT ON TABLE public.leave_requests IS 'Employee leave requests with approval workflow';

-- Enable Row Level Security (RLS)
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (for future use - currently using service role key)
-- Policy: Allow service role to do anything
CREATE POLICY "Allow service role full access" ON public.leave_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant permissions to authenticated users (for future client-side access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_requests TO authenticated;

/*
  Rollback instructions:

  DROP TABLE IF EXISTS public.leave_requests CASCADE;
  DROP FUNCTION IF EXISTS public.update_leave_requests_updated_at() CASCADE;
*/
