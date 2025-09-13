-- 現在のユーザーIDでテスト用のシフトを作成
-- 現在のユーザーID: c5711440-c1c6-4247-b2af-5b8549482e8e

-- テスト用のシフトを挿入（今日の日付で）
INSERT INTO assigned_shifts (
  pharmacist_id,
  pharmacy_id,
  date,
  time_slot,
  status,
  created_at
) VALUES (
  'c5711440-c1c6-4247-b2af-5b8549482e8e',  -- 現在のユーザーID
  'c5711440-c1c6-4247-b2af-5b8549482e8e',  -- 同じIDを薬局IDとして使用（テスト用）
  CURRENT_DATE,  -- 今日の日付
  'morning',     -- 午前
  'confirmed',   -- 確定済み
  NOW()
);

-- 確認
SELECT 
  id,
  pharmacist_id,
  pharmacy_id,
  date,
  time_slot,
  status
FROM assigned_shifts
WHERE pharmacist_id = 'c5711440-c1c6-4247-b2af-5b8549482e8e'
ORDER BY created_at DESC;
