-- RLSポリシーを関数なしで直接記述（確実に動作する方法）

-- Step 1: 既存のポリシーを削除
DROP POLICY IF EXISTS "Allow view shift requests" ON shift_requests;

-- Step 2: 関数を使わずに直接サブクエリでポリシーを作成
CREATE POLICY "Allow view shift requests" ON shift_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR
  (SELECT user_type FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

-- 確認クエリ（実行後に結果が表示されます）
SELECT
  '修正完了' as status,
  COUNT(*) as total_count
FROM shift_requests;

SELECT
  '3月2日のデータ' as label,
  COUNT(*) as march_2_count
FROM shift_requests
WHERE date = '2026-03-02';
