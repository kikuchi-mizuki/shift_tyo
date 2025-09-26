-- Fix RLS policies for recruitment_status to allow admin INSERT/UPDATE with WITH CHECK

-- Ensure table exists
CREATE TABLE IF NOT EXISTS recruitment_status (
  id UUID PRIMARY KEY,
  is_open BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id),
  notes TEXT
);

ALTER TABLE recruitment_status ENABLE ROW LEVEL SECURITY;

-- Drop old catch-all policy to avoid ambiguity (if exists)
DROP POLICY IF EXISTS "Admins can manage recruitment status" ON recruitment_status;

-- Recreate explicit policies
-- SELECT policy (any authenticated user can read)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recruitment_status' AND polname = 'Authenticated users can read recruitment status'
  ) THEN
    CREATE POLICY "Authenticated users can read recruitment status" ON recruitment_status
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- Admins: INSERT allowed if caller is admin
CREATE POLICY "Admins can insert recruitment status" ON recruitment_status
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Admins: UPDATE allowed if caller is admin
CREATE POLICY "Admins can update recruitment status" ON recruitment_status
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Admins: DELETE allowed if ever needed
CREATE POLICY "Admins can delete recruitment status" ON recruitment_status
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

GRANT ALL ON recruitment_status TO authenticated;


