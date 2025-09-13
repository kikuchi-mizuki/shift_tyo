-- 存在しない薬局IDの募集データを削除するSQL

-- 1. 削除対象の募集データを確認
SELECT 
  sp.id,
  sp.pharmacy_id,
  sp.date,
  sp.time_slot,
  sp.store_name,
  sp.required_staff,
  sp.memo,
  sp.created_at
FROM shift_postings sp
LEFT JOIN user_profiles up ON sp.pharmacy_id = up.id
WHERE up.id IS NULL
ORDER BY sp.date;

-- 2. 削除対象の件数を確認
SELECT COUNT(*) as delete_count
FROM shift_postings sp
LEFT JOIN user_profiles up ON sp.pharmacy_id = up.id
WHERE up.id IS NULL;

-- 3. 存在しない薬局IDの募集データを削除
DELETE FROM shift_postings 
WHERE pharmacy_id IN (
  SELECT sp.pharmacy_id
  FROM shift_postings sp
  LEFT JOIN user_profiles up ON sp.pharmacy_id = up.id
  WHERE up.id IS NULL
);

-- 4. 削除後の確認
SELECT COUNT(*) as remaining_count
FROM shift_postings;

-- 5. 残っている募集データの確認（薬局名付き）
SELECT 
  sp.id,
  sp.pharmacy_id,
  sp.date,
  sp.time_slot,
  sp.store_name,
  sp.required_staff,
  up.name as pharmacy_name,
  up.email as pharmacy_email
FROM shift_postings sp
LEFT JOIN user_profiles up ON sp.pharmacy_id = up.id
ORDER BY sp.date, sp.pharmacy_id;

