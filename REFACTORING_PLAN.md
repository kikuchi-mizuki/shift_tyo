# AdminDashboard.tsx リファクタリング計画書

**作成日**: 2025-12-05
**対象ファイル**: src/components/AdminDashboard.tsx
**現在の行数**: 7,276行
**目標**: 100-200行/コンポーネントに分割

---

## 目次

1. [現状の問題点](#1-現状の問題点)
2. [リファクタリング方針](#2-リファクタリング方針)
3. [新しいディレクトリ構成](#3-新しいディレクトリ構成)
4. [フェーズ別実施計画](#4-フェーズ別実施計画)
5. [各コンポーネントの詳細仕様](#5-各コンポーネントの詳細仕様)
6. [マイグレーション手順](#6-マイグレーション手順)

---

## 1. 現状の問題点

### 1.1 アーキテクチャ上の問題
| 問題 | 詳細 | 影響 |
|------|------|------|
| God Component | 1つのコンポーネントが10以上の責務を持つ | 保守性の低下 |
| 状態管理の複雑化 | 37個のuseStateフック | デバッグが困難 |
| ビジネスロジックの混在 | UIとロジックが分離されていない | テストが困難 |
| コードの重複 | 類似のCRUD処理が繰り返される | 変更時のリスク |
| 深いネスト | JSXが10階層以上ネストする箇所がある | 可読性の低下 |

### 1.2 パフォーマンス上の問題
- メモ化されていない重い計算処理
- 不要な再レンダリングの発生
- 大量のconsole.log（100箇所以上）

### 1.3 型安全性の問題
- `any`型の多用
- 型定義の欠落
- PropTypesの未使用

---

## 2. リファクタリング方針

### 2.1 設計原則
1. **単一責任原則** - 1コンポーネント1責務
2. **DRY原則** - 重複コードの削除
3. **関心の分離** - UI・ロジック・データアクセスの分離
4. **型安全性** - TypeScriptの型を厳密に定義
5. **パフォーマンス** - React.memoとuseMemoの活用

### 2.2 リファクタリング戦略
- **段階的移行** - 一度に全てを変更せず、段階的に実施
- **後方互換性** - 既存機能を壊さない
- **テスト駆動** - 各フェーズでの動作確認

---

## 3. 新しいディレクトリ構成

```
src/
├── components/
│   └── admin/                          # 管理者関連コンポーネント
│       ├── AdminDashboard.tsx          # メインコンポーネント（200行程度）
│       │
│       ├── calendar/                   # カレンダー関連
│       │   ├── AdminCalendar.tsx       # カレンダー本体
│       │   ├── CalendarHeader.tsx      # 月ナビゲーション
│       │   ├── CalendarGrid.tsx        # グリッド表示
│       │   └── DateCell.tsx            # 日付セル
│       │
│       ├── panel/                      # 管理パネル
│       │   ├── AdminPanel.tsx          # パネルコンテナ
│       │   ├── PanelHeader.tsx         # ヘッダー部分
│       │   ├── ActionButtons.tsx       # アクションボタン群
│       │   └── DateDetailPanel.tsx     # 日付詳細パネル
│       │
│       ├── detail/                     # 日付詳細セクション
│       │   ├── AIMatchingResults.tsx   # AIマッチング結果
│       │   ├── ShortagePharmacies.tsx  # 不足薬局リスト
│       │   ├── ConfirmedShifts.tsx     # 確定シフト
│       │   ├── PharmacyPostings.tsx    # 薬局募集
│       │   ├── PharmacistRequests.tsx  # 薬剤師希望
│       │   └── ConsultationRequests.tsx # 要相談希望
│       │
│       ├── users/                      # ユーザー管理
│       │   ├── UserManagement.tsx      # ユーザー管理コンテナ
│       │   ├── PharmacyList.tsx        # 薬局リスト
│       │   ├── PharmacistList.tsx      # 薬剤師リスト
│       │   ├── PharmacyCard.tsx        # 薬局カード
│       │   ├── PharmacistCard.tsx      # 薬剤師カード
│       │   └── UserEditForm.tsx        # ユーザー編集フォーム
│       │
│       └── shared/                     # 共通UI部品
│           ├── SectionHeader.tsx       # セクションヘッダー
│           ├── StatusBadge.tsx         # ステータスバッジ
│           └── LoadingSpinner.tsx      # ローディング表示
│
├── hooks/
│   └── admin/                          # 管理者用カスタムフック
│       ├── useAdminData.ts             # データ取得・管理
│       ├── useAIMatching.ts            # AIマッチング
│       ├── useManualMatching.ts        # 手動マッチング
│       ├── useCalendarState.ts         # カレンダー状態
│       ├── useFormState.ts             # フォーム状態
│       └── useRecruitmentStatus.ts     # 募集ステータス
│
├── services/
│   └── admin/                          # ビジネスロジック
│       ├── MatchingService.ts          # マッチングロジック
│       ├── AnalysisService.ts          # 分析ロジック
│       ├── UserService.ts              # ユーザー管理
│       ├── ShiftService.ts             # シフト管理
│       └── PostingRequestService.ts    # 募集・希望管理
│
├── utils/
│   └── admin/                          # ユーティリティ関数
│       ├── arrayHelpers.ts             # 配列操作
│       ├── dateHelpers.ts              # 日付操作
│       ├── ratingHelpers.ts            # 評価関連
│       ├── scoreCalculators.ts         # スコア計算
│       └── dataCleanup.ts              # データクリーンアップ
│
└── types/
    └── admin/                          # 型定義
        ├── matching.types.ts           # マッチング関連型
        ├── user.types.ts               # ユーザー関連型
        ├── shift.types.ts              # シフト関連型
        └── state.types.ts              # 状態管理型
```

---

## 4. フェーズ別実施計画

### Phase 1: ユーティリティと型定義の抽出（優先度: 高）
**目標**: 共通関数と型定義を分離して、依存関係を整理

**作業項目**:
1. ✅ **utils/admin/arrayHelpers.ts** を作成
   - `safeArray()`, `safeLength()`, `safeObject()` を移動
   - 行数: ~50行

2. ✅ **utils/admin/dateHelpers.ts** を作成
   - `getDaysInMonth()`, `getMonthName()` を移動
   - 行数: ~100行

3. ✅ **utils/admin/ratingHelpers.ts** を作成
   - `getPharmacistRating()` を移動
   - 行数: ~30行

4. ✅ **utils/admin/scoreCalculators.ts** を作成
   - `calculateDistanceScore()`, `calculateRequestCountScore()` を移動
   - 行数: ~80行

5. ✅ **types/admin/state.types.ts** を作成
   - 全state変数の型定義
   - 行数: ~200行

**見積工数**: 8時間
**削減行数**: 約460行

---

### Phase 2: サービス層の抽出（優先度: 高）
**目標**: ビジネスロジックをUIから分離

**作業項目**:
1. ✅ **services/admin/MatchingService.ts** を作成
   - `executeSimpleAIMatching()` (309行)
   - `executeAIMatching()` (292行)
   - `performMatchingAnalysis()` (226行)
   - `executeMatching()` を移動
   - 行数: ~900行

2. ✅ **services/admin/AnalysisService.ts** を作成
   - `analyzeMonthlyShortage()` (226行)
   - `analyzePharmacyShortageWithMatches()`
   - `analyzePharmacyShortage()` を移動
   - 行数: ~500行

3. ✅ **services/admin/UserService.ts** を作成
   - `beginEditUser()`, `saveEditUser()` (367行)
   - `deleteUser()` (54行)
   - `getOrganizedUserData()` を移動
   - 行数: ~500行

4. ✅ **services/admin/ShiftService.ts** を作成
   - `handleConfirmShiftsForDate()`
   - `handleConfirmSingleMatch()` (263行)
   - `handleCancelSingleConfirmedShift()` を移動
   - 行数: ~400行

5. ✅ **services/admin/PostingRequestService.ts** を作成
   - `handleAddPosting()`, `deletePosting()`
   - `handleAddRequest()`, `deleteRequest()`
   - CRUD操作を移動
   - 行数: ~300行

**見積工数**: 20時間
**削減行数**: 約2,600行

---

### Phase 3: カスタムフックの抽出（優先度: 中）
**目標**: 状態管理ロジックを分離

**作業項目**:
1. ✅ **hooks/admin/useAdminData.ts** を作成
   - `loadAll()` (467行), `loadRecruitmentStatus()`, `loadAssignedShifts()`
   - データフェッチとキャッシュ管理
   - 返り値: `{ requests, postings, assigned, userProfiles, ratings, loading, reload }`
   - 行数: ~600行

2. ✅ **hooks/admin/useAIMatching.ts** を作成
   - AI関連のstate: `aiMatchingEngine`, `aiMatches`, `aiMatchesByDate`
   - 関数: `executeMonthlyAIMatching()`, `executeAIMatching()`
   - 返り値: `{ aiMatches, executeMatching, loading }`
   - 行数: ~400行

3. ✅ **hooks/admin/useManualMatching.ts** を作成
   - `manualMatches` state
   - `handlePharmacistSelection()`, `saveManualShiftRequests()`
   - 返り値: `{ manualMatches, selectPharmacist, saveMatches }`
   - 行数: ~250行

4. ✅ **hooks/admin/useCalendarState.ts** を作成
   - `currentDate`, `selectedDate` state
   - `handlePrevMonth()`, `handleNextMonth()`, `handleDateSelect()`
   - 返り値: `{ currentDate, selectedDate, nextMonth, prevMonth, selectDate }`
   - 行数: ~100行

5. ✅ **hooks/admin/useFormState.ts** を作成
   - 全フォーム関連state: `showAddForms`, `newPosting`, `editingPostingId`, etc.
   - フォーム操作関数
   - 返り値: フォームごとの状態と操作関数
   - 行数: ~300行

6. ✅ **hooks/admin/useRecruitmentStatus.ts** を作成
   - `recruitmentStatus` state
   - `loadRecruitmentStatus()`, `toggleRecruitmentStatus()`
   - 返り値: `{ status, toggle, loading }`
   - 行数: ~150行

**見積工数**: 18時間
**削減行数**: 約1,800行

---

### Phase 4: UIコンポーネントの分割（優先度: 中）
**目標**: JSX構造を小さなコンポーネントに分割

#### 4.1 カレンダーコンポーネント

**作業項目**:
1. ✅ **components/admin/calendar/CalendarHeader.tsx**
   - 月ナビゲーション（前月・次月ボタン、月名表示）
   - Props: `currentDate`, `onPrevMonth`, `onNextMonth`
   - 行数: ~50行

2. ✅ **components/admin/calendar/DateCell.tsx**
   - 日付セル（確定数、マッチ数、不足数表示）
   - Props: `date`, `assigned`, `matches`, `shortage`, `onSelect`
   - 行数: ~150行

3. ✅ **components/admin/calendar/CalendarGrid.tsx**
   - 7x7グリッド表示
   - Props: `currentDate`, `dates`, `onDateSelect`
   - 行数: ~100行

4. ✅ **components/admin/calendar/AdminCalendar.tsx**
   - カレンダー全体のコンテナ
   - 行数: ~150行

#### 4.2 日付詳細コンポーネント

**作業項目**:
5. ✅ **components/admin/detail/AIMatchingResults.tsx**
   - AIマッチング結果の表示
   - Props: `matches`, `onConfirm`, `onCancel`
   - 行数: ~100行

6. ✅ **components/admin/detail/ShortagePharmacies.tsx**
   - 不足薬局リストと手動選択
   - Props: `shortages`, `pharmacists`, `onSelect`, `onSave`
   - 行数: ~120行

7. ✅ **components/admin/detail/ConfirmedShifts.tsx**
   - 確定シフトリスト
   - Props: `shifts`, `onCancel`, `onEdit`
   - 行数: ~120行

8. ✅ **components/admin/detail/PharmacyPostings.tsx**
   - 薬局募集リスト・追加・編集
   - Props: `postings`, `onAdd`, `onEdit`, `onDelete`
   - 行数: ~180行

9. ✅ **components/admin/detail/PharmacistRequests.tsx**
   - 薬剤師希望リスト・追加・編集
   - Props: `requests`, `onAdd`, `onEdit`, `onDelete`
   - 行数: ~180行

10. ✅ **components/admin/detail/ConsultationRequests.tsx**
    - 要相談リクエスト表示
    - Props: `consultRequests`
    - 行数: ~60行

11. ✅ **components/admin/panel/DateDetailPanel.tsx**
    - 上記コンポーネントを統合
    - 行数: ~250行

#### 4.3 ユーザー管理コンポーネント

**作業項目**:
12. ✅ **components/admin/users/PharmacyCard.tsx**
    - 薬局カード（情報表示、編集・削除ボタン）
    - Props: `pharmacy`, `onEdit`, `onDelete`
    - 行数: ~100行

13. ✅ **components/admin/users/PharmacistCard.tsx**
    - 薬剤師カード（情報表示、評価、編集・削除ボタン）
    - Props: `pharmacist`, `rating`, `onEdit`, `onDelete`
    - 行数: ~120行

14. ✅ **components/admin/users/PharmacyList.tsx**
    - 薬局リスト（折りたたみ可能）
    - Props: `pharmacies`, `expanded`, `onToggle`, `onEdit`, `onDelete`
    - 行数: ~120行

15. ✅ **components/admin/users/PharmacistList.tsx**
    - 薬剤師リスト（折りたたみ可能）
    - Props: `pharmacists`, `ratings`, `expanded`, `onToggle`, `onEdit`, `onDelete`
    - 行数: ~150行

16. ✅ **components/admin/users/UserManagement.tsx**
    - ユーザー管理コンテナ
    - 行数: ~150行

#### 4.4 パネルコンポーネント

**作業項目**:
17. ✅ **components/admin/panel/PanelHeader.tsx**
    - タイトル、パスワード変更、デバッグボタン
    - Props: `onPasswordChange`, `onDebug`
    - 行数: ~50行

18. ✅ **components/admin/panel/ActionButtons.tsx**
    - 月次マッチング、募集切替ボタン
    - Props: `recruitmentStatus`, `onToggleRecruitment`, `onMonthlyMatching`
    - 行数: ~80行

19. ✅ **components/admin/panel/AdminPanel.tsx**
    - 右パネル全体のコンテナ
    - 行数: ~200行

**見積工数**: 25時間
**削減行数**: 約2,000行

---

### Phase 5: AdminDashboard本体のリファクタリング（優先度: 高）
**目標**: メインコンポーネントを200行以下に整理

**作業項目**:
1. ✅ **AdminDashboard.tsx のリファクタリング**
   - 抽出したフック・コンポーネントを統合
   - 状態管理をカスタムフックに委譲
   - JSXをサブコンポーネントで構成
   - 目標行数: ~200行

**修正後の構造**:
```typescript
import { useAdminData } from '../../hooks/admin/useAdminData';
import { useAIMatching } from '../../hooks/admin/useAIMatching';
import { useCalendarState } from '../../hooks/admin/useCalendarState';
import AdminCalendar from './calendar/AdminCalendar';
import AdminPanel from './panel/AdminPanel';
import UserManagement from './users/UserManagement';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  // カスタムフックでデータ・状態管理
  const { requests, postings, assigned, reload } = useAdminData();
  const { aiMatches, executeMatching } = useAIMatching();
  const { currentDate, selectedDate, selectDate } = useCalendarState();

  return (
    <div className="space-y-6">
      <div className="flex gap-6">
        <AdminCalendar
          currentDate={currentDate}
          selectedDate={selectedDate}
          onSelectDate={selectDate}
          data={{ requests, postings, assigned }}
        />
        <AdminPanel
          selectedDate={selectedDate}
          data={{ requests, postings, assigned, aiMatches }}
          onExecuteMatching={executeMatching}
        />
      </div>
      <UserManagement />
    </div>
  );
};
```

**見積工数**: 12時間
**削減行数**: 約1,200行（実質的にはファイル全体を整理）

---

### Phase 6: 型安全性とパフォーマンスの改善（優先度: 中）
**目標**: TypeScriptの型を厳密化し、パフォーマンスを最適化

**作業項目**:
1. ✅ **any型の削除**
   - 全`any`型を適切な型に置き換え
   - 見積: 50箇所以上

2. ✅ **React.memoの適用**
   - 重いコンポーネントにメモ化を適用
   - `DateCell`, `PharmacyCard`, `PharmacistCard` など

3. ✅ **useMemoの適用**
   - 重い計算処理をメモ化
   - マッチング計算、分析処理など

4. ✅ **useCallbackの適用**
   - イベントハンドラーをメモ化

5. ✅ **console.logの削除**
   - 本番環境向けにログを削除
   - 開発環境のみログ出力するよう修正

**見積工数**: 10時間

---

### Phase 7: テストとドキュメント（優先度: 低）
**目標**: 品質保証とドキュメント整備

**作業項目**:
1. ⬜ **ユニットテストの追加**
   - services/ 配下の関数テスト
   - hooks/ 配下のカスタムフックテスト

2. ⬜ **統合テストの追加**
   - コンポーネント統合テスト

3. ⬜ **ドキュメント作成**
   - 各コンポーネントのREADME
   - Propsのドキュメント化
   - Storybookの導入（オプション）

**見積工数**: 20時間

---

## 5. 各コンポーネントの詳細仕様

### 5.1 カスタムフック

#### useAdminData.ts
```typescript
export interface UseAdminDataReturn {
  // データ
  requests: ShiftRequest[];
  postings: ShiftPosting[];
  assigned: AssignedShift[];
  userProfiles: UserProfileMap;
  ratings: PharmacistRating[];
  storeNgPharmacists: StoreNgMap;
  storeNgPharmacies: StoreNgMap;

  // 状態
  loading: boolean;
  error: Error | null;
  lastUpdated: Date;

  // 操作
  reload: () => Promise<void>;
  reloadRequests: () => Promise<void>;
  reloadPostings: () => Promise<void>;
  reloadAssigned: () => Promise<void>;
}

export const useAdminData = (): UseAdminDataReturn => {
  // 実装
};
```

#### useAIMatching.ts
```typescript
export interface UseAIMatchingReturn {
  // データ
  aiMatches: MatchCandidate[];
  aiMatchesByDate: Record<string, MatchCandidate[]>;

  // 状態
  loading: boolean;
  engine: AIMatchingEngine | null;

  // 設定
  useAI: boolean;
  setUseAI: (value: boolean) => void;

  // 操作
  executeMatching: (date: string) => Promise<void>;
  executeMonthlyMatching: () => Promise<void>;
}

export const useAIMatching = (): UseAIMatchingReturn => {
  // 実装
};
```

### 5.2 サービス

#### MatchingService.ts
```typescript
export class MatchingService {
  /**
   * シンプルAIマッチングを実行
   */
  static async executeSimpleAIMatching(
    requests: ShiftRequest[],
    postings: ShiftPosting[],
    options: MatchingOptions
  ): Promise<MatchCandidate[]> {
    // 実装
  }

  /**
   * AIマッチングを実行
   */
  static async executeAIMatching(
    date: string,
    engine: AIMatchingEngine,
    data: AdminData
  ): Promise<MatchCandidate[]> {
    // 実装
  }

  /**
   * マッチング分析を実行
   */
  static performMatchingAnalysis(
    requests: ShiftRequest[],
    postings: ShiftPosting[],
    userProfiles: UserProfileMap
  ): MatchingAnalysisResult {
    // 実装
  }
}
```

### 5.3 UIコンポーネント

#### DateCell.tsx
```typescript
interface DateCellProps {
  date: string;
  day: number;
  isSelected: boolean;
  confirmedCount: number;
  matchCount: number;
  shortageCount: number;
  consultCount: number;
  onSelect: (date: string) => void;
}

export const DateCell: React.FC<DateCellProps> = React.memo(({
  date,
  day,
  isSelected,
  confirmedCount,
  matchCount,
  shortageCount,
  consultCount,
  onSelect
}) => {
  // 実装
});
```

#### PharmacyCard.tsx
```typescript
interface PharmacyCardProps {
  pharmacy: UserProfile;
  storeNames: string[];
  ngPharmacists: UserProfile[];
  onEdit: (pharmacy: UserProfile) => void;
  onDelete: (pharmacy: UserProfile) => void;
}

export const PharmacyCard: React.FC<PharmacyCardProps> = React.memo(({
  pharmacy,
  storeNames,
  ngPharmacists,
  onEdit,
  onDelete
}) => {
  // 実装
});
```

---

## 6. マイグレーション手順

### 6.1 準備
1. ✅ 現在のAdminDashboard.tsxをバックアップ
   ```bash
   cp src/components/AdminDashboard.tsx src/components/AdminDashboard.backup.tsx
   ```

2. ✅ 新しいディレクトリ構造を作成
   ```bash
   mkdir -p src/components/admin/{calendar,panel,detail,users,shared}
   mkdir -p src/hooks/admin
   mkdir -p src/services/admin
   mkdir -p src/utils/admin
   mkdir -p src/types/admin
   ```

### 6.2 実施手順（フェーズごと）

#### Phase 1の実施
1. utils/admin/ 配下のファイルを作成
2. AdminDashboard.tsxから該当関数をコピー＆ペースト
3. import文を追加
4. AdminDashboard.tsxで新しいutilsをimport
5. 動作確認（既存機能が動作することを確認）
6. AdminDashboard.tsxから移動した関数を削除

#### Phase 2の実施
1. services/admin/ 配下のファイルを作成
2. AdminDashboard.tsxから該当関数を移動
3. 依存関係を整理（utils、types）
4. AdminDashboard.tsxで新しいserviceをimport
5. 動作確認
6. AdminDashboard.tsxから移動した関数を削除

#### Phase 3の実施
1. hooks/admin/ 配下のファイルを作成
2. state変数と関連する関数を移動
3. カスタムフックの返り値を定義
4. AdminDashboard.tsxでカスタムフックを使用
5. 動作確認
6. 移動したstateとuseEffectを削除

#### Phase 4の実施
1. components/admin/ 配下のファイルを作成
2. JSXを切り出してコンポーネント化
3. Propsを定義
4. AdminDashboard.tsxで新しいコンポーネントをimport
5. 動作確認
6. 移動したJSXを削除

#### Phase 5の実施
1. AdminDashboard.tsxを全面的に書き直し
2. カスタムフックとコンポーネントを統合
3. 動作確認
4. 不要なコードを削除

### 6.3 各フェーズでのテスト項目
- [ ] カレンダー表示が正常
- [ ] 日付選択が機能
- [ ] シフトリクエスト表示が正常
- [ ] シフト募集表示が正常
- [ ] マッチング実行が機能
- [ ] 確定シフト表示が正常
- [ ] ユーザー管理が機能
- [ ] 編集・削除が機能
- [ ] モーダル表示が正常

---

## 7. リスク管理

### 7.1 想定されるリスク

| リスク | 影響度 | 対策 |
|-------|-------|------|
| 既存機能の破損 | 高 | 各フェーズで十分なテスト実施 |
| パフォーマンス低下 | 中 | React.memoとuseMemoで最適化 |
| 型エラーの発生 | 中 | 段階的に型定義を追加 |
| スケジュール遅延 | 中 | フェーズごとに進捗確認 |

### 7.2 ロールバック計画
- 各フェーズ完了時にgit commitを実施
- 問題が発生した場合は前のコミットに戻す
- バックアップファイルを保持

---

## 8. 成功指標

### 8.1 定量的指標
| 指標 | 現状 | 目標 |
|-----|------|------|
| AdminDashboard.tsx 行数 | 7,276行 | 200行以下 |
| 最大コンポーネント行数 | 7,276行 | 250行以下 |
| useState数（1コンポーネント） | 37個 | 5個以下 |
| any型の使用箇所 | 50箇所以上 | 0箇所 |
| console.log数 | 100箇所以上 | 0箇所（本番） |

### 8.2 定性的指標
- [ ] 新規メンバーがコードを理解できる
- [ ] ユニットテストを追加できる
- [ ] 機能追加が容易になる
- [ ] バグ修正時の影響範囲が明確
- [ ] コードレビューが容易

---

## 9. タイムライン

| フェーズ | 期間 | 累計工数 |
|---------|------|---------|
| Phase 1: Utils・型定義 | 1日 | 8時間 |
| Phase 2: サービス層 | 2.5日 | 20時間 |
| Phase 3: カスタムフック | 2日 | 18時間 |
| Phase 4: UIコンポーネント | 3日 | 25時間 |
| Phase 5: 本体リファクタリング | 1.5日 | 12時間 |
| Phase 6: 型・パフォーマンス | 1日 | 10時間 |
| Phase 7: テスト・ドキュメント | 2.5日 | 20時間 |
| **合計** | **14日** | **113時間** |

---

## 10. 次のアクション

### 即座に実施すべき項目
1. ✅ リファクタリング計画書をチームで確認
2. ⬜ Phase 1の実施を開始
3. ⬜ ディレクトリ構造を作成
4. ⬜ arrayHelpers.tsから着手

### 長期的な改善項目
- Storybookの導入
- E2Eテストの追加
- CI/CDパイプラインの構築
- パフォーマンス監視の導入

---

**承認**

| 役割 | 氏名 | 承認日 | 署名 |
|-----|------|-------|------|
| 開発リード | - | - | - |
| アーキテクト | - | - | - |
| プロジェクトマネージャー | - | - | - |

---

**END OF DOCUMENT**
