# AIシフトマネージャー - アプリケーション仕様書

## 目次

- [概要](#概要)
- [主要機能](#主要機能)
- [AIマッチングアルゴリズムの詳細](matching-algorithm.md)
- [ユーザータイプ別機能](#ユーザータイプ別機能)
- [画面構成](#画面構成)
- [技術スタック](#技術スタック)
- [データベース構造](#データベース構造)
- [セキュリティ](#セキュリティ)
- [セットアップ](#セットアップ)

---

## 概要

**AIシフトマネージャー**は、薬剤師と薬局を効率的にマッチングするシフト管理システムです。AIアルゴリズムを活用して、最適なシフトマッチングを実現します。

### システムの目的

- 薬剤師のシフト希望と薬局の募集を効率的にマッチング
- 管理者による手動マッチングとAI自動マッチングの両方に対応
- 距離、履歴、評価などを考慮した最適なマッチング
- セキュアなマルチユーザー認証システム

---

## 主要機能

### AIマッチング機能

- **最適化マッチング**: 不足薬局を最小化する制約ベースアルゴリズム
- **距離ベースマッチング**: 薬剤師の最寄駅と薬局の距離を考慮（40%）
- **履歴ベースマッチング**: 過去のシフト応募回数を考慮した公平なマッチング（30%）
- **評価ベースマッチング**: 薬剤師の評価を考慮（30%）
- **インタラクティブマッチング**: 手動での薬剤師入れ替えと自動再最適化

**[詳しいアルゴリズム解説はこちら](matching-algorithm.md)**

### リアルタイム管理

- シフト希望・募集のリアルタイム表示
- 募集状況の一括切り替え（募集開始/締切）
- 確定シフトの即時反映

### マルチユーザー認証

- 3つのユーザータイプ（薬剤師、薬局、管理者）
- 同一ブラウザで複数アカウントのログイン保持
- ユーザータイプ切り替え機能

---

## ユーザータイプ別機能

### 薬剤師ダッシュボード

![薬剤師ダッシュボード](images/pharmacist-dashboard.png)
*※ スクリーンショットを追加してください*

#### 主な機能

1. **シフト希望登録**
   - カレンダーから日付選択
   - 複数日をまとめて選択可能
   - カスタム時間設定（開始時間・終了時間）
   - 定型時間テンプレート保存・適用

2. **確定シフト確認**
   - 自分の確定済みシフト一覧
   - 薬局名、店舗名、時間帯の表示

3. **プロフィール管理**
   - 名前の設定
   - 最寄駅の登録
   - パスワード変更

4. **募集締切状態の表示**
   - リアルタイムで募集状況を確認
   - 募集締切中は希望登録不可

---

### 薬局ダッシュボード

![薬局ダッシュボード](images/pharmacy-dashboard.png)
*※ スクリーンショットを追加してください*

#### 主な機能

1. **シフト募集登録**
   - カレンダーから日付選択
   - 複数店舗の管理
   - 必要人数の設定
   - 時間帯の指定

2. **確定シフト確認**
   - 各店舗の確定済みシフト
   - 薬剤師の情報表示

3. **店舗管理**
   - 複数店舗の登録・編集
   - 店舗ごとの住所・連絡先管理

4. **プロフィール管理**
   - 薬局名の設定
   - パスワード変更

---

### 管理者ダッシュボード

![管理者ダッシュボード](images/admin-dashboard.png)
*※ スクリーンショットを追加してください*

#### 主な機能

1. **マッチング管理**
   - **手動マッチング**: ドラッグ&ドロップでシフト確定
   - **AIマッチング**: ワンクリックで自動マッチング
   - マッチング結果のプレビュー

2. **カレンダービュー**
   - 月単位でのシフト希望・募集一覧
   - 日付ごとの応募状況確認
   - 確定シフトの表示

3. **統計情報**
   - シフト希望数、募集数、確定数の集計
   - マッチング率の表示

4. **募集状況管理**
   - 募集開始/締切の一括切り替え
   - 更新日時・更新者の記録

5. **ユーザー管理**
   - 薬剤師・薬局の一覧表示
   - 評価情報の確認

---

## 画面構成

### 認証画面

#### 一般ログイン画面

![一般ログイン](images/login-general.png)
*※ スクリーンショットを追加してください*

- 薬剤師・薬局用のログイン画面
- 新規登録機能
- パスワードリセット機能

#### 管理者ログイン画面

![管理者ログイン](images/login-admin.png)
*※ スクリーンショットを追加してください*

- 専用URL: `/admin-login`
- 管理者権限の確認
- セキュリティ警告表示

---

## 技術スタック

### フロントエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| **React** | 18.3.1 | UIフレームワーク |
| **TypeScript** | 5.2.2 | 型安全性 |
| **Vite** | 5.3.4 | ビルドツール |
| **Tailwind CSS** | 3.4.4 | スタイリング |
| **Lucide React** | 0.263.1 | アイコン |

### バックエンド・インフラ

| 技術 | 用途 |
|------|------|
| **Supabase** | BaaS（認証・データベース・RLS） |
| **PostgreSQL** | リレーショナルデータベース |
| **Row Level Security** | データアクセス制御 |

### 開発・テスト

| 技術 | バージョン | 用途 |
|------|-----------|------|
| **Vitest** | 4.0.15 | ユニットテスト |
| **Playwright** | 1.57.0 | E2Eテスト |
| **ESLint** | 8.57.0 | コード品質 |

### 監視・エラートラッキング

| 技術 | バージョン | 用途 |
|------|-----------|------|
| **Sentry** | 10.29.0 | エラー監視 |

---

## データベース構造

### 主要テーブル

#### user_profiles（ユーザープロフィール）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | ユーザーID（主キー） |
| name | TEXT | 名前 |
| email | TEXT | メールアドレス |
| user_type | TEXT | ユーザータイプ（pharmacist/pharmacy/admin） |
| nearest_station_name | TEXT | 最寄駅（薬剤師のみ） |
| store_names | TEXT[] | 店舗名リスト（薬局のみ） |
| ng_list | TEXT[] | NG薬局リスト（薬剤師のみ） |

#### shift_requests（シフト希望）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| pharmacist_id | UUID | 薬剤師ID |
| date | DATE | 希望日 |
| time_slot | TEXT | 時間帯 |
| start_time | TIME | 開始時間 |
| end_time | TIME | 終了時間 |
| status | TEXT | ステータス（pending/confirmed/cancelled） |
| memo | TEXT | 備考 |

#### shift_postings（シフト募集）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| pharmacy_id | UUID | 薬局ID |
| date | DATE | 募集日 |
| store_name | TEXT | 店舗名 |
| time_slot | TEXT | 時間帯 |
| start_time | TIME | 開始時間 |
| end_time | TIME | 終了時間 |
| required_staff | INTEGER | 必要人数 |
| status | TEXT | ステータス |
| memo | TEXT | 備考 |

#### assigned_shifts（確定シフト）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| pharmacist_id | UUID | 薬剤師ID |
| pharmacy_id | UUID | 薬局ID |
| date | DATE | 日付 |
| store_name | TEXT | 店舗名 |
| start_time | TIME | 開始時間 |
| end_time | TIME | 終了時間 |
| status | TEXT | ステータス（confirmed） |
| compatibility_score | NUMERIC | 互換性スコア |

#### recruitment_status（募集状況）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 固定ID |
| is_open | BOOLEAN | 募集中フラグ |
| updated_at | TIMESTAMP | 更新日時 |
| updated_by | UUID | 更新者 |
| notes | TEXT | 備考 |

---

## セキュリティ

### Row Level Security (RLS)

すべての主要テーブルでRLSを有効化し、データアクセスを制限：

```sql
-- shift_requests: 管理者または本人のみアクセス可能
CREATE POLICY "select_requests_policy"
ON shift_requests FOR SELECT TO authenticated
USING (
  (SELECT user_type FROM user_profiles WHERE id = auth.uid()) = 'admin'
  OR pharmacist_id = auth.uid()
);
```

### 認証

- Supabase Authによる安全な認証
- JWTトークンベースのセッション管理
- パスワードリセット機能

### データ検証

- 入力値のサニタイゼーション
- 最大文字数制限
- SQLインジェクション対策

---

## パフォーマンス最適化

### データフェッチング最適化

**月ベースフィルタリング**（2026年2月実装）

```typescript
// 表示中の月のデータのみ取得
const currentYear = currentDate.getFullYear();
const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');

const { data } = await supabase
  .from('shift_requests')
  .select('*')
  .gte('date', `${currentYear}-${currentMonth}-01`)
  .lt('date', `${nextYear}-${nextMonth}-01`)
  .order('date', { ascending: true });
```

**メリット**:
- 不要なデータ取得を削減
- 大量データでもパフォーマンス維持
- スケーラビリティ向上

### コード分割

- React.lazy()による遅延読み込み
- ダッシュボードごとの動的インポート

---

## セットアップ

### 環境変数

`.env`ファイルを作成：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### インストール

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# テスト実行
npm run test
```

### Supabase設定

```bash
# Supabase CLI インストール
npm install -g supabase

# プロジェクトとリンク
npx supabase link

# マイグレーション適用
npx supabase db push
```

---

## スクリーンショット追加方法

以下のスクリーンショットを撮影し、`docs/images/`に保存してください：

1. **pharmacist-dashboard.png** - 薬剤師ダッシュボード全体
2. **pharmacy-dashboard.png** - 薬局ダッシュボード全体
3. **admin-dashboard.png** - 管理者ダッシュボード全体
4. **login-general.png** - 一般ログイン画面
5. **login-admin.png** - 管理者ログイン画面
6. **ai-matching.png** - AIマッチング実行画面（推奨）
7. **calendar-view.png** - カレンダービュー（推奨）

### 推奨解像度

- デスクトップ: 1920x1080
- モバイル: 390x844（iPhone 12 Pro相当）

---

## 更新履歴

| 日付 | バージョン | 内容 |
|------|-----------|------|
| 2026-02-15 | 1.1.0 | パフォーマンス最適化（月ベースフィルタリング）、RLSセキュリティ修正 |
| 2026-02-14 | 1.0.0 | 初回リリース |

---

## ライセンス

Private

---

## お問い合わせ

問題や質問がある場合は、[GitHub Issues](https://github.com/kikuchi-mizuki/shift_tyo/issues)でお知らせください。
