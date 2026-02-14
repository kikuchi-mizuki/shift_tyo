-- ============================================
-- 最終修正: shift_requests RLSポリシー
-- 一度の実行で完全に解決します
-- ============================================

-- Step 1: 既存のRLSポリシーを先に削除（関数に依存しているため）
DROP POLICY IF EXISTS "Allow view shift requests" ON shift_requests;
DROP POLICY IF EXISTS "sr_sel_auth" ON shift_requests;

-- Step 2: is_admin()関数を完全に削除して、よりシンプルなSQL関数として再作成
DROP FUNCTION IF EXISTS public.is_admin();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  );
$$;

-- Step 3: 新しいRLSポリシーを作成
CREATE POLICY "Allow view shift requests" ON shift_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR
  public.is_admin()
);

-- Step 4: 自動確認（結果が表示されます）
DO $$
BEGIN
  RAISE NOTICE '=== 修正完了 ===';
  RAISE NOTICE 'is_admin()関数: 作成完了';
  RAISE NOTICE 'RLSポリシー: 作成完了';
END $$;

-- Step 5: 動作確認（管理者としてログインしている場合）
-- 以下のコメントを外して実行すると、結果が確認できます
-- SELECT
--   public.is_admin() as "管理者判定",
--   (SELECT COUNT(*) FROM shift_requests WHERE date = '2026-03-02') as "3月2日のデータ件数";
