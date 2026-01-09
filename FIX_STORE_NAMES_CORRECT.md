# 店舗名表示問題の修正手順（正しい方法）

## 問題の概要

管理画面の薬局一覧で店舗名が表示されない問題が発生していました。

### 原因

各薬局は`shift_postings`テーブルでシフト募集を登録する際に店舗名（`store_name`）を指定していますが、`user_profiles`テーブルの`store_names`配列には反映されていませんでした。

### 調査結果

```
ブラウザコンソールより:
- 全ユーザープロファイル: 43件
- 薬局データ: 14件
- ほとんどの薬局で store_names: Array(0) （空配列）
- テストアカウントのみ store_names: Array(1)

データベース構造:
- shift_postings.store_name に実際の店舗名が登録されている
- user_profiles.store_names は空のまま
```

## 修正方法

### ステップ1: 店舗名抽出のテスト（推奨）

`shift_postings`テーブルから各薬局の店舗名を取得して確認します。

1. Supabaseダッシュボード → SQL Editor を開く
2. `test_store_names_from_postings.sql`の内容を貼り付けて実行
3. 各薬局の店舗リストを確認

**確認できる情報:**
- 各薬局の現在の`store_names`（空配列のはず）
- `shift_postings`から抽出される店舗名リスト
- 店舗数のカウント
- 店舗名のプレビュー（カンマ区切り）

### ステップ2: マイグレーション実行

結果を確認したら、実際にデータを更新します。

#### Supabase SQL Editorで実行（推奨）

1. Supabaseダッシュボード → SQL Editor
2. `supabase/migrations/20260110000001_populate_store_names_from_postings.sql`の内容を貼り付け
3. "Run"をクリック
4. 更新された件数を確認

**処理内容:**
- `shift_postings`テーブルから各薬局の店舗名をDISTINCTで取得
- `user_profiles.store_names`配列に格納
- 店舗名でソートして保存

### ステップ3: 結果の確認

1. アプリケーションをリロード（ハードリロード推奨: Ctrl+Shift+R / Cmd+Shift+R）
2. 管理画面 → ユーザー管理 → 薬局一覧を開く
3. 各薬局カードに実際に登録されている店舗名が表示されることを確認

**期待される表示:**
各薬局が`shift_postings`で登録している店舗名がすべて表示されます。

例：
- 株式会社グラムの店舗名: 渋谷店, 新宿店, 池袋店
- 有限会社フラワーズの店舗名: 中野店, 杉並店

### ステップ4: 検証クエリ（オプション）

マイグレーション実行後、以下のクエリで結果を確認できます：

```sql
SELECT
  up.id,
  up.name as pharmacy_name,
  up.store_names,
  array_length(up.store_names, 1) as store_count
FROM user_profiles up
WHERE up.user_type IN ('pharmacy', 'store')
  AND up.store_names IS NOT NULL
  AND array_length(up.store_names, 1) > 0
ORDER BY up.name;
```

## マイグレーションの詳細

### データソース

- **ソーステーブル**: `shift_postings`
- **キーカラム**: `store_name`
- **対象**: `pharmacy_id`ごとにグループ化

### 処理ロジック

```sql
-- 各薬局について、shift_postingsから重複を除いた店舗名リストを取得
SELECT ARRAY(
  SELECT DISTINCT store_name
  FROM shift_postings sp
  WHERE sp.pharmacy_id = 薬局ID
    AND sp.store_name IS NOT NULL
    AND sp.store_name != ''
  ORDER BY store_name
)
```

### 対象データ

- `user_type` が 'pharmacy' または 'store'
- `shift_postings`に店舗名データが存在する薬局のみ

### 安全性

- 既存の`store_names`データは上書きされます（現在は空配列なので問題なし）
- `shift_postings`テーブルは変更されません
- ロールバック可能（必要に応じて`store_names`を空配列に戻せます）

## 今後の運用

### 新しい店舗を追加する場合

新しい店舗でシフト募集を登録すると、その店舗名は自動的に`shift_postings`に保存されます。

ただし、`store_names`配列には**自動では反映されません**。以下の方法で更新が必要です：

#### 方法1: 管理画面から手動更新

管理画面の薬局一覧 → 編集ボタン → 店舗名欄に追加

#### 方法2: マイグレーション再実行

新しい店舗が追加されたら、再度マイグレーションを実行することで最新の店舗リストを反映できます：

```sql
-- 特定の薬局の店舗リストを更新
UPDATE user_profiles up
SET store_names = (
  SELECT ARRAY_AGG(DISTINCT store_name ORDER BY store_name)
  FROM shift_postings sp
  WHERE sp.pharmacy_id = up.id
    AND sp.store_name IS NOT NULL
    AND sp.store_name != ''
)
WHERE up.id = '薬局のID';
```

### 定期的な同期（推奨）

`shift_postings`の店舗名と`user_profiles.store_names`を同期するトリガーまたは定期ジョブの設定を検討してください。

## トラブルシューティング

### 問題: マイグレーション実行後も店舗名が表示されない

**確認事項:**
1. ブラウザのハードリロード（Ctrl+Shift+R / Cmd+Shift+R）
2. ブラウザコンソールで`store_names`配列を確認
3. Supabaseで直接データを確認:
   ```sql
   SELECT id, name, store_names, array_length(store_names, 1)
   FROM user_profiles
   WHERE user_type IN ('pharmacy', 'store');
   ```

### 問題: 一部の薬局の店舗名が表示されない

**原因:** その薬局の`shift_postings`に`store_name`データがない

**対処法:**
1. `shift_postings`テーブルを確認:
   ```sql
   SELECT DISTINCT store_name
   FROM shift_postings
   WHERE pharmacy_id = '薬局のID'
     AND store_name IS NOT NULL;
   ```

2. データがない場合は、管理画面から手動で店舗名を追加

### 問題: 古い店舗名が残っている

**対処法:** マイグレーションを再実行すると、現在`shift_postings`に存在する店舗名のみが反映されます。

## 関連ファイル

### 正しいマイグレーション
- **新規マイグレーション**: `supabase/migrations/20260110000001_populate_store_names_from_postings.sql`
- **テストクエリ**: `test_store_names_from_postings.sql`
- **ドキュメント**: `FIX_STORE_NAMES_CORRECT.md` (本ファイル)

### 廃止されたファイル（使用しないでください）
- ~~`supabase/migrations/20260110000000_populate_store_names.sql`~~ (薬局名から抽出する誤った方法)
- ~~`test_store_names_extraction.sql`~~ (誤った方法のテスト)
- ~~`FIX_STORE_NAMES.md`~~ (誤った方法のドキュメント)

### コードファイル
- デバッグ追加: `src/components/admin/users/PharmacyCard.tsx`
- データ取得: `src/hooks/admin/useAdminData.ts`
- 表示コンポーネント: `src/components/admin/users/PharmacyList.tsx`

## データベーススキーマ

### user_profiles
```sql
- id (uuid) - 主キー
- name (text) - 薬局名（会社名）
- store_names (text[]) - 店舗名配列 ← ここに反映
- user_type (text) - 'pharmacy' or 'store'
```

### shift_postings
```sql
- id (uuid) - 主キー
- pharmacy_id (uuid) - user_profiles.id への外部キー
- store_name (text) - 店舗名 ← ここからデータを取得
- date (date) - シフト日付
- time_slot (text) - 時間帯
```

## コミット履歴

- `23c9693`: デバッグコード追加（問題調査用）
- `d243d1c`: 誤ったマイグレーション追加（薬局名から抽出）
- 次のコミット: 正しいマイグレーション追加（shift_postingsから取得）

---

**作成日**: 2026年1月10日
**更新日**: 2026年1月10日（正しい方法に修正）
**問題**: 管理画面の薬局一覧で店舗名が表示されない
**解決策**: shift_postingsテーブルから実際の店舗名を取得してstore_namesに格納
