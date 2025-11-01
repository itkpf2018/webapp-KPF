-- Migration 013: Create support_messages table
-- Description: Store support tickets, feedback, and questions from users
-- Date: 2025-10-31

-- Create support_messages table
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('bug', 'suggestion', 'question')),
  message TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_id TEXT,
  user_role TEXT,
  context_url TEXT,
  context_user_agent TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  admin_notes TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_support_messages_type ON public.support_messages(type);
CREATE INDEX IF NOT EXISTS idx_support_messages_status ON public.support_messages(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON public.support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_submitted_at ON public.support_messages(submitted_at DESC);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_support_messages_updated_at
  BEFORE UPDATE ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_support_messages_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only authenticated users can insert support messages
-- ✅ Fixed: Changed from WITH CHECK (true) to proper auth check
CREATE POLICY "Users can insert their own support messages"
  ON public.support_messages
  FOR INSERT
  WITH CHECK (
    -- Only allow authenticated users (prevents anonymous spam)
    auth.uid() IS NOT NULL
  );

-- RLS Policy: Allow users to read their own messages
CREATE POLICY "Users can read their own support messages"
  ON public.support_messages
  FOR SELECT
  USING (user_id = auth.uid()::text OR auth.uid() IS NOT NULL);

-- RLS Policy: Only admins can update/delete messages
CREATE POLICY "Only admins can update support messages"
  ON public.support_messages
  FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'super_admin');

CREATE POLICY "Only admins can delete support messages"
  ON public.support_messages
  FOR DELETE
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'super_admin');

-- Add comment
COMMENT ON TABLE public.support_messages IS 'Store support tickets, feedback, and questions from users with Discord Webhook integration';
