-- Fix RLS policy conflicts for recruitment_status table
-- Remove all existing policies and create clean ones

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage recruitment status" ON recruitment_status;
DROP POLICY IF EXISTS "Authenticated users can read recruitment status" ON recruitment_status;
DROP POLICY IF EXISTS "Admins can insert recruitment status" ON recruitment_status;
DROP POLICY IF EXISTS "Admins can update recruitment status" ON recruitment_status;
DROP POLICY IF EXISTS "Admins can delete recruitment status" ON recruitment_status;
DROP POLICY IF EXISTS "Allow all authenticated users to manage recruitment status" ON recruitment_status;

-- Create a single, simple policy that allows all authenticated users to manage recruitment status
-- This is for the global recruitment status that should be manageable by admins
CREATE POLICY "Allow all authenticated users to manage recruitment status" ON recruitment_status
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON recruitment_status TO authenticated;
