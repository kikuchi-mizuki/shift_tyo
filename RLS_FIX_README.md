# RLS ポリシー修正ガイド

## 問題の概要

管理者ユーザーが `shift_requests`, `shift_postings`, `assigned_shifts` テーブルの全データを取得できない問題が発生していました。

### 根本原因

1. **RLSポリシーの不整合**: 複数の修正が重ねられた結果、ポリシー名が重複したり、正しく動作していないポリシーが残っていました
2. **is_admin()関数の問題**: SECURITY DEFINER関数を使った方法が、特定の状況下で正しく動作していませんでした
3. **ポリシーの複雑さ**: 複数のポリシーが混在し、どれが有効なのか不明確でした

### 影響範囲

- `src/hooks/admin/useAdminData.ts` の 191-193 行目で、管理者が `shift_requests` テーブルから全データを取得しようとしても、RLSポリシーによってブロックされていました
- 同様の問題が `shift_postings` と `assigned_shifts` テーブルにも存在していた可能性があります

## 修正内容

### 1. すべての古いポリシーを削除

重複や競合を避けるため、すべての古いRLSポリシーを削除しました。

### 2. シンプルで明確なポリシーを再作成

各テーブルに対して、以下の4つのポリシーを作成しました:
- SELECT: 読み取り権限
- INSERT: 新規作成権限
- UPDATE: 更新権限
- DELETE: 削除権限

### 3. ポリシーのロジック

**shift_requests (薬剤師の希望シフト)**
```sql
-- 薬剤師は自分の希望を見られる、管理者は全て見られる
auth.uid() = pharmacist_id
OR
EXISTS (
  SELECT 1 FROM user_profiles
  WHERE user_profiles.id = auth.uid() AND user_profiles.user_type = 'admin'
)
```

**shift_postings (薬局の募集シフト)**
```sql
-- 薬局は自分の募集を見られる、管理者は全て見られる
auth.uid() = pharmacy_id
OR
EXISTS (
  SELECT 1 FROM user_profiles
  WHERE user_profiles.id = auth.uid() AND user_profiles.user_type = 'admin'
)
```

**assigned_shifts (確定シフト)**
```sql
-- 関係者は見られる、管理者は全て見られる
-- INSERTは管理者のみ
auth.uid() = pharmacist_id
OR auth.uid() = pharmacy_id
OR
EXISTS (
  SELECT 1 FROM user_profiles
  WHERE user_profiles.id = auth.uid() AND user_profiles.user_type = 'admin'
)
```

## 修正手順

### 方法1: Supabase Dashboard で実行（推奨）

1. Supabase Dashboard にログイン
2. 対象のプロジェクトを選択
3. 左メニューから「SQL Editor」を選択
4. 以下のファイルの内容をコピー&ペースト:
   ```
   apply_rls_migration.sql
   ```
5. 「Run」ボタンをクリック
6. エラーがないことを確認
7. 最後に表示される確認クエリの結果を確認:
   - すべてのテーブルに4つのポリシー（select, insert, update, delete）が存在することを確認

### 方法2: Supabase CLI で実行

```bash
# ローカル開発環境の場合
supabase db reset

# または、新しいマイグレーションを適用
supabase db push

# 本番環境に適用する場合
supabase db push --linked
```

## 確認方法

### 1. ポリシーの確認

Supabase Dashboard > SQL Editor で以下のクエリを実行:

```sql
SELECT
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('shift_requests', 'shift_postings', 'assigned_shifts')
ORDER BY tablename, cmd, policyname;
```

期待される結果:
- `shift_requests`: 4つのポリシー (select, insert, update, delete)
- `shift_postings`: 4つのポリシー (select, insert, update, delete)
- `assigned_shifts`: 4つのポリシー (select, insert, update, delete)

### 2. データ取得の確認

管理者アカウントでログインし、以下を確認:

```sql
-- shift_requests の全データが取得できることを確認
SELECT COUNT(*) FROM shift_requests;

-- 3月2日のデータが取得できることを確認
SELECT COUNT(*) FROM shift_requests WHERE date = '2026-03-02';

-- shift_postings の全データが取得できることを確認
SELECT COUNT(*) FROM shift_postings;

-- assigned_shifts の全データが取得できることを確認
SELECT COUNT(*) FROM assigned_shifts;
```

### 3. アプリケーションでの確認

1. 管理者アカウントでログイン
2. AdminDashboard を開く
3. ブラウザの開発者ツール（F12）を開き、Console タブを確認
4. 以下のログが表示されることを確認:
   ```
   🔍 DEBUG: Total shift_requests fetched: [実際の件数]
   🔍 DEBUG: March data count: [3月のデータ件数]
   🔍 DEBUG: March 2nd data count in useAdminData: [3月2日のデータ件数]
   ```
5. カレンダーに3月2日のデータが表示されることを確認

## トラブルシューティング

### エラー: "policy already exists"

既存のポリシーが残っている場合があります。以下を実行:

```sql
-- すべてのポリシーを確認
SELECT policyname, tablename
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('shift_requests', 'shift_postings', 'assigned_shifts');

-- 必要に応じて個別に削除
DROP POLICY IF EXISTS "[ポリシー名]" ON [テーブル名];
```

### エラー: "function is_admin() does not exist"

is_admin() 関数が削除されていません。以下を実行:

```sql
DROP FUNCTION IF EXISTS public.is_admin();
```

### データが表示されない

1. ログインしているユーザーが管理者であることを確認:
   ```sql
   SELECT id, email, user_type
   FROM user_profiles
   WHERE id = auth.uid();
   ```
   - `user_type` が `'admin'` であることを確認

2. RLSが有効になっていることを確認:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename IN ('shift_requests', 'shift_postings', 'assigned_shifts');
   ```
   - `rowsecurity` が `true` であることを確認

3. ポリシーが正しく適用されていることを確認（上記の「ポリシーの確認」を参照）

## 関連ファイル

- `/Users/kikuchimizuki/Desktop/shift_tyo-main/apply_rls_migration.sql` - 即座に適用できるSQLスクリプト
- `/Users/kikuchimizuki/Desktop/shift_tyo-main/diagnose_and_fix_rls.sql` - 診断と修正を段階的に行うスクリプト
- `/Users/kikuchimizuki/Desktop/shift_tyo-main/supabase/migrations/20260215010000_fix_all_shift_rls_policies.sql` - マイグレーションファイル

## 今後の対応

1. **テストの追加**: RLSポリシーが正しく動作することを確認するテストを追加
2. **ドキュメント化**: RLSポリシーの設計方針をドキュメント化
3. **モニタリング**: RLS関連のエラーをモニタリングし、早期に問題を検出

## 変更履歴

- 2026-02-15: RLSポリシーの全面的な修正
  - すべての古いポリシーを削除
  - シンプルで明確なポリシーを再作成
  - is_admin()関数を削除し、直接EXISTSサブクエリを使用
