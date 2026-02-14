/*
  # シフト募集テーブルの作成

  1. 新しいテーブル
    - `shift_postings`
      - `id` (uuid, primary key)
      - `pharmacy_id` (uuid, foreign key)
      - `date` (date)
      - `time_slot` (text) - 'morning', 'afternoon', 'fullday', 'negotiable'
      - `required_people` (integer)
      - `hourly_rate` (integer)
      - `requirements` (text[])
      - `notes` (text, nullable)
      - `status` (text) - 'open', 'filled', 'cancelled'
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. セキュリティ
    - RLSを有効化
    - 薬局は自分の募集のみ管理可能
    - 薬剤師・管理者は全ての募集を閲覧可能
*/

CREATE TABLE IF NOT EXISTS shift_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  time_slot text NOT NULL CHECK (time_slot IN ('morning', 'afternoon', 'fullday', 'negotiable')),
  required_people integer NOT NULL DEFAULT 1,
  hourly_rate integer NOT NULL,
  requirements text[],
  notes text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filled', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shift_postings ENABLE ROW LEVEL SECURITY;

-- 薬局は自分の募集を管理可能
CREATE POLICY "Pharmacies can manage own postings"
  ON shift_postings
  FOR ALL
  TO authenticated
  USING (
    pharmacy_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'pharmacy'
    )
  );

-- 薬剤師・管理者は全ての募集を閲覧可能
CREATE POLICY "Pharmacists and admins can read all postings"
  ON shift_postings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type IN ('pharmacist', 'admin')
    )
  );

-- 管理者は全ての募集を管理可能
CREATE POLICY "Admins can manage all postings"
  ON shift_postings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

DROP TRIGGER IF EXISTS update_shift_postings_updated_at ON shift_postings;
CREATE TRIGGER update_shift_postings_updated_at
  BEFORE UPDATE ON shift_postings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();