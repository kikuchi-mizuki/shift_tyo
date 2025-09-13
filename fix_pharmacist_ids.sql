-- 現在のユーザーIDに合わせてassigned_shiftsテーブルのpharmacist_idを更新
-- 注意: このスクリプトを実行する前に、現在のユーザーIDを確認してください

-- 現在のassigned_shiftsテーブルの状態を確認
SELECT 
  id,
  pharmacist_id,
  pharmacy_id,
  date,
  time_slot,
  status,
  created_at
FROM assigned_shifts
ORDER BY created_at DESC
LIMIT 10;

-- 現在のユーザーID: c5711440-c1c6-4247-b2af-5b8549482e8e
-- このIDに合わせてpharmacist_idを更新（必要に応じて）

-- 例: 特定の日付のシフトを現在のユーザーに割り当て
-- UPDATE assigned_shifts 
-- SET pharmacist_id = 'c5711440-c1c6-4247-b2af-5b8549482e8e'
-- WHERE date = '2025-01-XX' AND time_slot = 'morning';

-- または、全てのシフトを現在のユーザーに割り当て（注意: これは全てのシフトを現在のユーザーに割り当てます）
-- UPDATE assigned_shifts 
-- SET pharmacist_id = 'c5711440-c1c6-4247-b2af-5b8549482e8e'
-- WHERE status = 'confirmed';

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
