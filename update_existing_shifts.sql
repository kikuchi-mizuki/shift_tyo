-- 既存のシフトを現在のユーザーに割り当て
-- 現在のユーザーID: c5711440-c1c6-4247-b2af-5b8549482e8e

-- 既存のシフトの確認
SELECT 
  id,
  pharmacist_id,
  pharmacy_id,
  date,
  time_slot,
  status
FROM assigned_shifts
ORDER BY created_at DESC
LIMIT 5;

-- 最初の数件のシフトを現在のユーザーに割り当て（テスト用）
UPDATE assigned_shifts 
SET pharmacist_id = 'c5711440-c1c6-4247-b2af-5b8549482e8e'
WHERE id IN (
  SELECT id FROM assigned_shifts 
  ORDER BY created_at DESC 
  LIMIT 3
);

-- 更新後の確認
SELECT 
  id,
  pharmacist_id,
  pharmacy_id,
  date,
  time_slot,
  status
FROM assigned_shifts
WHERE pharmacist_id = 'c5711440-c1c6-4247-b2af-5b8549482e8e'
ORDER BY date;
