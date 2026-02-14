-- 管理者ユーザーとしてRLSポリシーをテスト
-- このクエリは、実際のアプリケーションと同じ条件でデータを取得します

-- 1. 現在のユーザーIDを確認（auth.uid()が正しく機能しているか）
SELECT
  auth.uid() as current_user_id,
  '期待値: 0e665ba6-06ae-48eb-be73-eba61d72d6b3' as expected;

-- 2. user_profilesで管理者かどうか確認
SELECT
  id,
  name,
  email,
  user_type,
  '管理者である必要があります' as note
FROM user_profiles
WHERE id = auth.uid();

-- 3. RLSポリシーを通じて3月2日のデータを取得（実際のアプリと同じ方法）
SELECT
  id,
  pharmacist_id,
  date,
  time_slot,
  start_time,
  end_time,
  status,
  memo,
  created_at
FROM shift_requests
WHERE date = '2026-03-02'
ORDER BY created_at;

-- 4. 3月2日のデータ件数を確認
SELECT
  COUNT(*) as count_march_2,
  '期待値: 10件' as note
FROM shift_requests
WHERE date = '2026-03-02';

-- 5. pharmacist_idが現在のユーザーと一致するデータのみ取得（薬剤師として見た場合）
SELECT
  COUNT(*) as count_as_pharmacist,
  '薬剤師として見える件数' as note
FROM shift_requests
WHERE date = '2026-03-02'
  AND pharmacist_id = auth.uid();

-- 6. 管理者チェックが正しく動作しているか確認
SELECT
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.user_type = 'admin'
  ) as is_admin,
  '期待値: true' as note;

-- 7. ポリシーの詳細を確認
SELECT
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'shift_requests'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- 8. すべてのshift_requestsを管理者として取得（フィルタなし）
SELECT COUNT(*) as total_requests FROM shift_requests;

-- 9. 3月全体のデータを取得
SELECT
  date,
  COUNT(*) as count
FROM shift_requests
WHERE date >= '2026-03-01' AND date < '2026-04-01'
GROUP BY date
ORDER BY date;
