# 🏥 薬局シフト管理システム

薬局と薬剤師のシフトマッチングを効率化する統合管理システムです。AIマッチング、LINE通知連携、緊急シフト対応など、現代の薬局運営に必要な機能を網羅しています。

## ✨ 主な機能

### 🎯 コア機能
- **マルチユーザー対応**: 薬局、薬剤師、管理者の3種類のユーザータイプ
- **シフト管理**: 募集、希望提出、マッチング、確定までの一元管理
- **AIマッチング**: 距離、スキル、NG設定を考慮した自動マッチング
- **カレンダー表示**: 直感的なUIでシフトの可視化

### 🔔 通知機能
- **LINE連携**: シフト確定、リマインダー、緊急通知をLINEで送信
- **緊急シフト対応**: 即座に薬剤師へ通知し、迅速な対応を実現
- **自動リマインダー**: シフト前日の自動通知

### 🛡️ セキュリティ
- **認証システム**: Supabase Authによる安全な認証
- **Row Level Security (RLS)**: データベースレベルでのアクセス制御
- **NG設定**: 薬局と薬剤師の相互NG設定

### 📊 管理機能
- **募集ステータス管理**: 一括での募集開始・終了
- **評価システム**: 薬剤師の評価管理
- **統計表示**: AIマッチング精度などの可視化

## 🚀 技術スタック

### フロントエンド
- **React 18** + **TypeScript**
- **Vite** - 高速なビルドツール
- **Tailwind CSS** - ユーティリティファーストのCSS
- **Lucide React** - アイコンライブラリ

### バックエンド
- **Supabase** - PostgreSQLデータベース + Auth + Edge Functions
- **Deno** - Edge Function実行環境

### 外部連携
- **LINE Messaging API** - 通知配信

## 📦 セットアップ

### 前提条件
- Node.js >= 18.0.0
- npm >= 8.0.0
- Supabaseアカウント
- （オプション）LINE Developersアカウント

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd shift_tyo-main
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

```bash
cp env.example .env
```

`.env`ファイルを編集して、Supabaseの認証情報を設定：

```env
VITE_SUPABASE_URL=https://<YOUR_PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<YOUR_ANON_KEY>
```

### 4. データベースのセットアップ

詳細は `SETUP_DATABASE.md` を参照してください。

### 5. Edge Functionsのデプロイ

詳細は `DEPLOYMENT_GUIDE.md` を参照してください。

### 6. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開いてアクセスできます。

## 📖 ドキュメント

### 📘 アプリケーション仕様書

**[📚 詳細な仕様書を見る（GitHub Pages）](https://kikuchi-mizuki.github.io/shift_tyo/)**

画面構成、機能詳細、技術スタック、データベース構造などの包括的なドキュメント

### 📝 開発ドキュメント

- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Edge Functionのデプロイ手順
- **[SETUP_DATABASE.md](./SETUP_DATABASE.md)** - データベースのセットアップ
- **[LINE_INTEGRATION_SETUP.md](./LINE_INTEGRATION_SETUP.md)** - LINE連携の設定方法
- **[USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md)** - 使用例とベストプラクティス
- **[MULTI_USER_GUIDE.md](./MULTI_USER_GUIDE.md)** - マルチユーザー機能の詳細

## 🏗️ ビルドとデプロイ

### 本番用ビルド

```bash
npm run build
```

ビルドされたファイルは `dist/` ディレクトリに出力されます。

### プレビュー

```bash
npm run preview
```

### Railwayへのデプロイ

本プロジェクトはRailwayでのデプロイに最適化されています。

1. Railwayプロジェクトを作成
2. 環境変数を設定（`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`）
3. GitHubリポジトリを連携
4. 自動デプロイが開始されます

## 🧪 開発用ツール

### テスト

```bash
# すべてのテストを実行
npm run test

# テストUIを起動
npm run test:ui

# テストを1回実行（CI用）
npm run test:run
```

### Lint

```bash
npm run lint
```

### 開発用SQLファイル

開発・デバッグ用のSQLファイルは `development/sql/` ディレクトリに格納されています。

## 🔒 セキュリティ

- 環境変数（`.env`）は絶対にコミットしないでください
- Supabase Service Role Keyは安全に管理してください
- 本番環境では適切なRLSポリシーを設定してください

## 📄 ライセンス

このプロジェクトはプライベートプロジェクトです。

## 🤝 サポート

問題が発生した場合は、以下のドキュメントを参照してください：
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - デプロイ関連
- [SETUP_DATABASE.md](./SETUP_DATABASE.md) - データベース関連
- [EMERGENCY_NOTIFICATION_FIX_GUIDE.md](./EMERGENCY_NOTIFICATION_FIX_GUIDE.md) - 通知関連

## 📊 プロジェクト構成

```
shift_tyo-main/
├── src/
│   ├── components/       # Reactコンポーネント
│   │   ├── admin/        # 管理者専用コンポーネント
│   │   │   ├── calendar/ # カレンダー関連（4コンポーネント）
│   │   │   ├── detail/   # 詳細パネル（7コンポーネント）
│   │   │   ├── panel/    # サイドパネル（3コンポーネント）
│   │   │   └── users/    # ユーザー管理（5コンポーネント）
│   │   └── ...           # その他のコンポーネント
│   ├── contexts/         # Reactコンテキスト
│   ├── features/         # 機能別モジュール
│   │   ├── ai-matching/  # AIマッチングエンジン
│   │   └── shifts/       # シフト関連API
│   ├── hooks/            # カスタムフック
│   │   └── admin/        # 管理者専用フック（5フック）
│   ├── lib/              # 共通ライブラリ
│   ├── services/         # ビジネスロジック層
│   │   └── admin/        # 管理者専用サービス（5サービス）
│   ├── test/             # テストセットアップ
│   ├── types/            # TypeScript型定義
│   │   └── admin/        # 管理者専用型定義
│   └── utils/            # ユーティリティ関数
│       └── admin/        # 管理者専用ユーティリティ（5ファイル）
├── supabase/
│   ├── functions/        # Edge Functions
│   └── migrations/       # データベースマイグレーション
├── development/
│   └── sql/              # 開発用SQLファイル
└── dist/                 # ビルド出力（gitignore）
```

### アーキテクチャ

**5レイヤーのクリーンアーキテクチャ**:
1. **Presentation Layer** (19 UI Components) - ユーザーインターフェース
2. **Application Layer** (5 Custom Hooks) - 状態管理とアプリケーションロジック
3. **Business Layer** (5 Services) - ビジネスロジック
4. **Utility Layer** (5 Helper Functions) - 汎用ヘルパー関数
5. **Type Layer** (型定義) - TypeScript型定義

## 🎯 リファクタリング完了状況

- [x] **AdminDashboard.tsxのリファクタリング** - 7,276行 → 379行（94.8%削減）
- [x] **パフォーマンスの最適化** - React.memo適用（3コンポーネント）
- [x] **ユニットテストの追加** - Vitest + 31テスト
- [ ] TypeScriptの型安全性向上（`any`型の完全な削減）
- [ ] console.logの削除または適切なロガーへの置き換え
- [ ] E2Eテストの追加（Playwright）
- [ ] Storybookの導入

### 最近の更新（Phase 1-7完了）

**Phase 5完了**: AdminDashboard本体のリファクタリング
- 7,276行 → 379行（94.8%削減）
- 5レイヤーのクリーンアーキテクチャを実現
- 34ファイルに適切にモジュール化

**Phase 6完了**: パフォーマンス改善
- React.memo適用（DateCell, PharmacistCard, PharmacyCard）
- 型使用状況調査（34ファイル）

**Phase 7完了**: テストとドキュメント
- Vitestセットアップ
- 31個のユニットテスト（2ファイル）
- README更新

---

**Version**: 2.0.0
**Last Updated**: 2025-12-05
