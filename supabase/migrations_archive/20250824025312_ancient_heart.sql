/*
  # シフト希望テーブルの作成

  1. 新しいテーブル
    - `shift_requests`
      - `id` (uuid, primary key)
      - `pharmacist_id` (uuid, foreign key)
      - `date` (date)
      - `time_slot` (text) - 'morning', 'afternoon', 'fullday', 'negotiable'
      - `priority` (text) - 'high', 'medium', 'low'
      - `notes` (text, nullable)
      - `status` (text) - 'pending', 'approved', 'rejected'
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. セキュリティ
    - RLSを有効化
    - 薬剤師は自分の希望のみ管理可能
    - 薬局・管理者は全ての希望を閲覧可能
*/

CREATE TABLE IF NOT EXISTS shift_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacist_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  time_slot text NOT NULL CHECK (time_slot IN ('morning', 'afternoon', 'fullday', 'negotiable')),
  priority text NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;

-- 薬剤師は自分の希望を管理可能
CREATE POLICY "Pharmacists can manage own requests"
  ON shift_requests
  FOR ALL
  TO authenticated
  USING (
    pharmacist_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'pharmacist'
    )
  );

-- 薬局・管理者は全ての希望を閲覧可能
CREATE POLICY "Pharmacies and admins can read all requests"
  ON shift_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type IN ('pharmacy', 'admin')
    )
  );

-- 管理者は全ての希望を管理可能
CREATE POLICY "Admins can manage all requests"
  ON shift_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

DROP TRIGGER IF EXISTS update_shift_requests_updated_at ON shift_requests;
CREATE TRIGGER update_shift_requests_updated_at
  BEFORE UPDATE ON shift_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();