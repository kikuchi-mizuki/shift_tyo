-- 薬局未設定の原因を特定するSQL

-- 1. shift_postingsテーブルの全データを確認
SELECT 
  sp.id,
  sp.pharmacy_id,
  sp.date,
  sp.time_slot,
  sp.store_name,
  sp.required_staff,
  sp.memo,
  up.name as pharmacy_name,
  up.email as pharmacy_email,
  up.user_type
FROM shift_postings sp
LEFT JOIN user_profiles up ON sp.pharmacy_id = up.id
ORDER BY sp.date, sp.pharmacy_id;

-- 2. 薬局名が取得できないpostingを特定
SELECT 
  sp.id,
  sp.pharmacy_id,
  sp.date,
  sp.time_slot,
  sp.store_name,
  up.name as pharmacy_name,
  up.email as pharmacy_email,
  up.user_type,
  CASE 
    WHEN up.name IS NULL OR up.name = '' THEN '薬局名がNULLまたは空'
    WHEN up.id IS NULL THEN 'pharmacy_idがuser_profilesに存在しない'
    ELSE '正常'
  END as issue_type
FROM shift_postings sp
LEFT JOIN user_profiles up ON sp.pharmacy_id = up.id
WHERE up.name IS NULL OR up.name = '' OR up.id IS NULL
ORDER BY sp.date;

-- 3. 特定の日付（9月7日）のデータを詳細確認
SELECT 
  sp.id,
  sp.pharmacy_id,
  sp.date,
  sp.time_slot,
  sp.store_name,
  sp.required_staff,
  sp.memo,
  up.name as pharmacy_name,
  up.email as pharmacy_email,
  up.user_type
FROM shift_postings sp
LEFT JOIN user_profiles up ON sp.pharmacy_id = up.id
WHERE sp.date = '2025-09-07'
ORDER BY sp.pharmacy_id;

-- 4. user_profilesテーブルで薬局タイプのユーザーを確認
SELECT 
  id,
  name,
  email,
  user_type,
  created_at
FROM user_profiles 
WHERE user_type = 'pharmacy'
ORDER BY name;
