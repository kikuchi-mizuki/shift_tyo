# 実装ロードマップ

**作成日**: 2025-12-05
**プロジェクト**: 薬局シフト管理システム
**ステータス**: Phase 1完了（コア機能改善）

---

## 📊 現在の進捗状況

### ✅ 完了したタスク（Phase 1: コア機能改善）

#### 1. 要件定義書の見直しと修正 ✅
- **FR-PHARM-001, FR-STORE-001**: 時間帯選択から「応相談(negotiable)」を削除
- **FR-PHARM-001**: 優先度設定(priority)を削除
- **画面一覧の整理**:
  - SC-105, SC-205（NG設定画面）を削除 → 管理画面に統合
  - SC-309, SC-310（不要な画面）を削除
- **データモデルの更新**: priorityカラムとnegotiable制約の削除を反映

#### 2. マッチングロジックの改善 ✅
**ファイル**: `src/services/admin/MatchingService.ts`

**変更内容**:
- **時間適合性チェック（完全カバーのみ）**:
  ```typescript
  // 修正前: 部分重複も許可
  const isFullyCompatible =
    (requestStart >= postingStart && requestStart < postingEnd) ||
    (requestEnd > postingStart && requestEnd <= postingEnd) ||
    (requestStart <= postingStart && requestEnd >= postingEnd);

  // 修正後: 完全カバーのみ許可
  const isFullyCompatible =
    requestStart <= postingStart && requestEnd >= postingEnd;
  ```

- **マッチング優先順位（段階的優先順位）**:
  ```typescript
  // 修正前: 重み付き合計
  const totalScore =
    (distanceScore * 0.6) +
    (requestCountScore * 0.3) +
    (ratingScore * 0.1);

  // 修正後: 段階的優先順位（タイブレーク方式）
  allPossibleMatches.sort((a, b) => {
    // 1. 距離で比較（距離が近い方が優先）
    if (Math.abs(a.distanceScore - b.distanceScore) > 0.01) {
      return b.distanceScore - a.distanceScore;
    }
    // 2. シフト希望回数で比較（回数が少ない方が優先）
    if (Math.abs(a.requestCountScore - b.requestCountScore) > 0.01) {
      return a.requestCountScore - b.requestCountScore;
    }
    // 3. 評価で比較（評価が高い方が優先）
    return b.ratingScore - a.ratingScore;
  });
  ```

#### 3. データベーススキーマの修正 ✅
**ファイル**: `supabase/migrations/20250105000000_remove_priority_and_update_timeslot.sql`

**変更内容**:
1. `shift_requests.priority` カラムを削除
2. `time_slot` の値を更新（'negotiable' → 'fullday'）
3. `time_slot` に制約を追加（'morning', 'afternoon', 'fullday'のみ許可）

**実行手順**:
```bash
# Supabase CLIでマイグレーション実行
supabase db push

# または、Supabase DashboardのSQL Editorで実行
```

#### 4. 薬剤師評価機能の準備 ✅
**ファイル**: `src/components/PharmacistRatingModal.tsx`

**実装内容**:
- 1-5段階の星評価
- コメント入力（任意）
- `pharmacist_ratings` テーブルへの保存
- エラーハンドリング

**統合状況**: モーダルコンポーネントは作成済み。PharmacyDashboardへの統合は次フェーズで実施。

---

## 🔄 次フェーズのタスク（Phase 2: 新機能実装）

### 優先度: 🔴 高

| No. | タスク | 説明 | 工数見積 | ファイル |
|-----|--------|------|---------|---------|
| 1 | **薬剤師評価機能の統合** | PharmacyDashboardに評価モーダルを統合 | 2時間 | `PharmacyDashboard.tsx` |
| 2 | **緊急シフト機能** | 緊急シフト投稿・通知機能の実装 | 5時間 | `AdminEmergencyShift.tsx`<br>`PharmacyDashboard.tsx` |
| 3 | **send-emergency-shift Edge Function** | 緊急シフト通知のEdge Function | 2時間 | `supabase/functions/send-emergency-shift` |

### 優先度: 🟡 中

| No. | タスク | 説明 | 工数見積 |
|-----|--------|------|---------|
| 4 | **console.log削除** | 本番環境でのconsole.log削除 | 2時間 |
| 5 | **Playwrightセットアップ** | E2Eテスト環境の構築 | 3時間 |
| 6 | **Sentry導入** | エラートラッキングの設定 | 2時間 |

### 優先度: 🟢 低

| No. | タスク | 説明 | 工数見積 |
|-----|--------|------|---------|
| 7 | **パフォーマンス監視** | LogRocket / Vercel Analytics導入 | 2時間 |
| 8 | **CORS設定確認** | セキュリティ設定の確認・最適化 | 1時間 |
| 9 | **ログ保持期間設定** | 90日間のログ保持ポリシー設定 | 1時間 |

**合計残り工数**: 約20時間

---

## 📁 変更されたファイル一覧

### 修正されたファイル
1. `REQUIREMENTS.md` - 要件定義書の更新
2. `src/services/admin/MatchingService.ts` - マッチングロジックの改善

### 新規作成されたファイル
1. `src/components/PharmacistRatingModal.tsx` - 薬剤師評価モーダル
2. `supabase/migrations/20250105000000_remove_priority_and_update_timeslot.sql` - DBマイグレーション
3. `IMPLEMENTATION_ROADMAP.md` - 本ドキュメント

---

## 🎯 マッチング機能の実装仕様

### 要件
以下の4つの要件がすべて実装されています：

#### ✅ 01: NG設定チェック
**実装状況**: ✅ 完全実装
**場所**: `src/features/ai-matching/aiMatchingEngine.ts:486-501`
- 店舗別NG設定に対応
- `store_ng_pharmacies` / `store_ng_pharmacists` テーブルを使用

#### ✅ 02: 完全カバーチェック
**実装状況**: ✅ 修正完了
**場所**: `src/services/admin/MatchingService.ts:39-49`
- 薬剤師の希望時間が薬局の募集時間を**完全にカバー**している組み合わせのみをピックアップ

#### ✅ 03: 段階的優先順位
**実装状況**: ✅ 修正完了
**場所**: `src/services/admin/MatchingService.ts:267-280`
- 優先順位: **距離 → シフト希望回数 → 評価**（タイブレーク方式）

#### ✅ 04: 薬局の募集時間を使用
**実装状況**: ✅ 実装済み
**場所**: `src/services/admin/MatchingService.ts:254-260`
- マッチング時間は薬局の募集時間を使用

---

## 🚀 次のステップ

### 即座に実行可能
1. **データベースマイグレーションの実行**:
   ```bash
   supabase db push
   ```

2. **ビルドとテスト**:
   ```bash
   npm run build
   npm test
   ```

3. **デプロイ**:
   ```bash
   git push origin main
   ```

### Phase 2の開始
1. 薬剤師評価機能の統合
2. 緊急シフト機能の実装
3. Edge Functionのデプロイ

---

## 📝 注意事項

### データベースマイグレーション
- マイグレーション実行前にデータベースのバックアップを推奨
- `priority` カラムのデータは失われます（既にコード内で未使用）
- `negotiable` time_slotは `fullday` に変換されます

### マッチングロジック
- 新しいロジックは**より厳格**です（完全カバーのみ）
- マッチング数が減少する可能性があります
- 段階的優先順位により、より公平なマッチングが実現されます

### テストの推奨
- マイグレーション後、マッチング機能の動作確認を実施してください
- 特に以下のシナリオをテスト:
  - 時間帯が完全に一致する場合
  - 薬剤師の希望時間が薬局の募集時間より長い場合
  - 薬剤師の希望時間が薬局の募集時間より短い場合（マッチしないはず）

---

## 🔗 関連ドキュメント

- [REQUIREMENTS.md](./REQUIREMENTS.md) - 要件定義書（更新済み）
- [PROGRESS.md](./PROGRESS.md) - 開発進捗記録
- [REFACTORING_PLAN.md](./REFACTORING_PLAN.md) - リファクタリング計画

---

**最終更新**: 2025-12-05
**コミット**: `96275ee` - feat: Requirements review and core improvements
