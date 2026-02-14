/*
  # 割り当てシフトテーブルの作成

  1. 新しいテーブル
    - `assigned_shifts`
      - `id` (uuid, primary key)
      - `pharmacist_id` (uuid, foreign key)
      - `pharmacy_id` (uuid, foreign key)
      - `date` (date)
      - `time_slot` (text) - 'morning', 'afternoon', 'fullday', 'negotiable'
      - `duration` (integer) - 勤務時間
      - `hourly_rate` (integer)
      - `status` (text) - 'confirmed', 'pending', 'cancelled'
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. セキュリティ
    - RLSを有効化
    - 薬剤師は自分のシフトを閲覧可能
    - 薬局は自分の薬局のシフトを閲覧可能
    - 管理者は全てのシフトを管理可能
*/

CREATE TABLE IF NOT EXISTS assigned_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacist_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  pharmacy_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  time_slot text NOT NULL CHECK (time_slot IN ('morning', 'afternoon', 'fullday', 'negotiable')),
  duration integer NOT NULL DEFAULT 4,
  hourly_rate integer NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assigned_shifts ENABLE ROW LEVEL SECURITY;

-- 薬剤師は自分のシフトを閲覧可能
CREATE POLICY "Pharmacists can read own shifts"
  ON assigned_shifts
  FOR SELECT
  TO authenticated
  USING (
    pharmacist_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'pharmacist'
    )
  );

-- 薬局は自分の薬局のシフトを閲覧可能
CREATE POLICY "Pharmacies can read own shifts"
  ON assigned_shifts
  FOR SELECT
  TO authenticated
  USING (
    pharmacy_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'pharmacy'
    )
  );

-- 管理者は全てのシフトを管理可能
CREATE POLICY "Admins can manage all shifts"
  ON assigned_shifts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

DROP TRIGGER IF EXISTS update_assigned_shifts_updated_at ON assigned_shifts;
CREATE TRIGGER update_assigned_shifts_updated_at
  BEFORE UPDATE ON assigned_shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();