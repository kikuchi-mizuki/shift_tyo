-- Temporarily disable RLS for pharmacist_ratings table to allow rating functionality
-- This is a temporary fix to get the rating system working

-- Disable RLS temporarily
ALTER TABLE pharmacist_ratings DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to authenticated users
GRANT ALL ON pharmacist_ratings TO authenticated;

-- Add comment explaining this is temporary
COMMENT ON TABLE pharmacist_ratings 
IS 'RLS temporarily disabled for pharmacist ratings. Should be re-enabled with proper policies once authentication issues are resolved.';
