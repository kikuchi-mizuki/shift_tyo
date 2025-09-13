-- 現在のユーザーIDでテスト用のシフトを作成
-- 現在のユーザーID: c5711440-c1c6-4247-b2af-5b8549482e8e

-- 既存のシフトを削除（テスト用）
DELETE FROM assigned_shifts WHERE pharmacist_id = 'c5711440-c1c6-4247-b2af-5b8549482e8e';

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

-- 明日のシフトも追加
INSERT INTO assigned_shifts (
  pharmacist_id,
  pharmacy_id,
  date,
  time_slot,
  status,
  created_at
) VALUES (
  'c5711440-c1c6-4247-b2af-5b8549482e8e',
  'c5711440-c1c6-4247-b2af-5b8549482e8e',
  CURRENT_DATE + INTERVAL '1 day',  -- 明日の日付
  'afternoon',   -- 午後
  'confirmed',
  NOW()
);

-- 確認
SELECT 
  id,
  pharmacist_id,
  pharmacy_id,
  date,
  time_slot,
  status,
  created_at
FROM assigned_shifts
WHERE pharmacist_id = 'c5711440-c1c6-4247-b2af-5b8549482e8e'
ORDER BY date;
