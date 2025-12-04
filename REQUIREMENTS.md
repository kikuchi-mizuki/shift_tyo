# 薬局シフト管理システム - 要件定義書

**バージョン**: 1.0
**作成日**: 2025-12-05
**プロジェクト名**: pharmacy-shift-system

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [システムの目的・背景](#2-システムの目的背景)
3. [ユーザータイプ](#3-ユーザータイプ)
4. [機能要件](#4-機能要件)
5. [データモデル](#5-データモデル)
6. [画面一覧](#6-画面一覧)
7. [ワークフロー](#7-ワークフロー)
8. [外部連携仕様](#8-外部連携仕様)
9. [非機能要件](#9-非機能要件)
10. [技術スタック](#10-技術スタック)
11. [セキュリティ要件](#11-セキュリティ要件)
12. [今後の改善計画](#12-今後の改善計画)

---

## 1. プロジェクト概要

### 1.1 プロジェクト名
薬局シフト管理システム (Pharmacy Shift Management System)

### 1.2 概要
薬局と薬剤師のシフトマッチングを効率化する統合管理システム。AIマッチング機能、LINE通知連携、緊急シフト対応など、現代の薬局運営に必要な機能を網羅したWebアプリケーション。

### 1.3 対象ユーザー
- **薬剤師**: シフト希望を提出し、確定したシフトを確認
- **薬局**: シフト募集を投稿し、マッチング結果を確認
- **管理者**: システム全体の管理、マッチング実行、ステータス管理

---

## 2. システムの目的・背景

### 2.1 解決する課題
1. **非効率なシフト調整**: 従来の電話・メールベースの調整は時間がかかる
2. **ミスマッチの発生**: 薬剤師のスキル・経験と薬局のニーズが合わない
3. **緊急対応の困難さ**: 急なシフト欠員への迅速な対応が難しい
4. **情報の分散**: シフト情報が複数のツールに分散している

### 2.2 システムの目的
1. **シフトマッチングの自動化**: AIによる最適なマッチングの実現
2. **リアルタイム通知**: LINEを通じた即座の情報共有
3. **一元管理**: シフト情報の集約と可視化
4. **柔軟な対応**: 緊急シフトへの迅速な対応

### 2.3 期待される効果
- シフト調整時間の **70%削減**
- マッチング精度の向上
- 緊急対応時間の短縮
- ユーザー満足度の向上

---

## 3. ユーザータイプ

### 3.1 薬剤師 (Pharmacist)
- **役割**: シフト希望の提出、確定シフトの確認
- **権限**: 自身のシフトリクエストの閲覧・編集、NG薬局の設定
- **識別子**: `user_type = 'pharmacist'`

### 3.2 薬局 (Pharmacy)
- **役割**: シフト募集の投稿、薬剤師の評価
- **権限**: 自社のシフト募集の閲覧・編集、NG薬剤師の設定
- **識別子**: `user_type = 'store'`

### 3.3 管理者 (Admin)
- **役割**: システム全体の管理、マッチング実行、ユーザー管理
- **権限**: 全データへのアクセス、システム設定の変更
- **識別子**: `user_type = 'admin'`

---

## 4. 機能要件

### 4.1 認証・ユーザー管理

#### 4.1.1 ログイン機能
- **FR-AUTH-001**: メールアドレスとパスワードによるログイン
- **FR-AUTH-002**: ユーザータイプ別のログインフロー
  - 薬剤師・薬局: 統一ログインフォーム
  - 管理者: 専用ログインフォーム
- **FR-AUTH-003**: セッション管理と自動更新
- **FR-AUTH-004**: マルチセッション対応（複数ユーザーの切り替え）

#### 4.1.2 ユーザー登録
- **FR-AUTH-005**: 新規ユーザー登録（薬剤師・薬局）
- **FR-AUTH-006**: ユーザープロフィール情報の登録
  - 薬剤師: 氏名、メール、免許番号、経験年数、専門分野
  - 薬局: 薬局名、住所、電話番号、店舗情報

#### 4.1.3 プロフィール管理
- **FR-AUTH-007**: プロフィール情報の閲覧・編集
- **FR-AUTH-008**: パスワード変更

---

### 4.2 薬剤師向け機能

#### 4.2.1 シフト希望提出
- **FR-PHARM-001**: シフト希望の新規作成
  - 日付選択
  - 時間帯選択（午前/午後/終日/応相談）
  - カスタム時間設定（開始時刻・終了時刻）
  - 優先度設定（高/中/低）
  - メモ追加
- **FR-PHARM-002**: シフト希望の一覧表示
- **FR-PHARM-003**: シフト希望の編集・削除
- **FR-PHARM-004**: シフト希望のステータス確認（保留/承認/拒否）

#### 4.2.2 確定シフト管理
- **FR-PHARM-005**: 確定シフトの一覧表示
- **FR-PHARM-006**: 確定シフトの詳細確認
  - 配属先薬局情報
  - 勤務時間
  - 店舗名
- **FR-PHARM-007**: カレンダービューでのシフト可視化

#### 4.2.3 NG設定
- **FR-PHARM-008**: NG薬局の設定（店舗別）
- **FR-PHARM-009**: NG薬局の一覧表示・削除

#### 4.2.4 評価確認
- **FR-PHARM-010**: 自身の評価の閲覧（平均評価、コメント）

#### 4.2.5 通知設定
- **FR-PHARM-011**: LINE連携設定
- **FR-PHARM-012**: 通知設定のON/OFF

---

### 4.3 薬局向け機能

#### 4.3.1 シフト募集投稿
- **FR-STORE-001**: シフト募集の新規作成
  - 日付選択
  - 時間帯選択（午前/午後/終日/応相談）
  - カスタム時間設定（開始時刻・終了時刻）
  - 必要人数の設定
  - 店舗名の指定
  - メモ追加
- **FR-STORE-002**: シフト募集の一覧表示
- **FR-STORE-003**: シフト募集の編集・削除
- **FR-STORE-004**: シフト募集のステータス確認（募集中/埋まった/キャンセル）

#### 4.3.2 確定シフト管理
- **FR-STORE-005**: 確定シフトの一覧表示
- **FR-STORE-006**: 配属された薬剤師の情報確認
- **FR-STORE-007**: カレンダービューでのシフト可視化

#### 4.3.3 NG設定
- **FR-STORE-008**: NG薬剤師の設定（店舗別）
- **FR-STORE-009**: NG薬剤師の一覧表示・削除

#### 4.3.4 薬剤師評価
- **FR-STORE-010**: 勤務終了後の薬剤師評価（1-5段階）
- **FR-STORE-011**: 評価コメントの記入
- **FR-STORE-012**: 過去の評価履歴の閲覧

#### 4.3.5 緊急シフト対応
- **FR-STORE-013**: 緊急シフト募集の投稿
- **FR-STORE-014**: 通知対象の選択（全員/特定薬剤師/近隣薬剤師）

#### 4.3.6 通知設定
- **FR-STORE-015**: LINE連携設定
- **FR-STORE-016**: 通知設定のON/OFF

---

### 4.4 管理者向け機能

#### 4.4.1 システムステータス管理
- **FR-ADMIN-001**: 募集ステータスの管理
  - 募集中 (recruiting)
  - マッチング中 (matching)
  - 確定済み (confirmed)
- **FR-ADMIN-002**: 募集期間の一括開始・終了
- **FR-ADMIN-003**: 現在の月の設定

#### 4.4.2 マッチング管理
- **FR-ADMIN-004**: AIマッチングの実行
  - ルールベースマッチング
  - AIベースマッチング
  - ハイブリッドマッチング
- **FR-ADMIN-005**: マッチングアルゴリズムの選択
- **FR-ADMIN-006**: 最適化優先度の設定
  - 満足度優先
  - 効率優先
  - バランス重視
  - 薬局満足度優先
- **FR-ADMIN-007**: マッチング結果の確認・調整
- **FR-ADMIN-008**: マッチング統計の表示
  - マッチング率
  - 未マッチング数
  - 平均距離

#### 4.4.3 シフト管理
- **FR-ADMIN-009**: 全シフトリクエストの一覧表示
- **FR-ADMIN-010**: 全シフト募集の一覧表示
- **FR-ADMIN-011**: 確定シフトの一覧表示
- **FR-ADMIN-012**: シフトの手動割り当て・調整
- **FR-ADMIN-013**: シフトのキャンセル・削除

#### 4.4.4 ユーザー管理
- **FR-ADMIN-014**: 全ユーザーの一覧表示
- **FR-ADMIN-015**: ユーザー情報の編集
- **FR-ADMIN-016**: ユーザーの新規作成
- **FR-ADMIN-017**: ユーザーの削除・無効化

#### 4.4.5 緊急シフト管理
- **FR-ADMIN-018**: 緊急シフト一覧の表示
- **FR-ADMIN-019**: 緊急通知の送信
- **FR-ADMIN-020**: 緊急シフト対応状況の確認

#### 4.4.6 カレンダー管理
- **FR-ADMIN-021**: 統合カレンダーの表示
  - シフトリクエスト
  - シフト募集
  - 確定シフト
- **FR-ADMIN-022**: 月別・日別表示の切り替え

#### 4.4.7 データ分析
- **FR-ADMIN-023**: マッチング精度の統計表示
- **FR-ADMIN-024**: ユーザー活動ログの表示
- **FR-ADMIN-025**: システム使用状況の分析

---

### 4.5 共通機能

#### 4.5.1 カレンダー機能
- **FR-COMMON-001**: 月別カレンダー表示
- **FR-COMMON-002**: シフトの視覚的表示（色分け、アイコン）
- **FR-COMMON-003**: 日付クリックでの詳細表示

#### 4.5.2 通知機能
- **FR-COMMON-004**: LINE通知の受信
  - シフト確定通知
  - 緊急シフト通知
  - リマインダー通知
- **FR-COMMON-005**: アプリ内通知の表示

#### 4.5.3 検索・フィルタリング
- **FR-COMMON-006**: 日付範囲での検索
- **FR-COMMON-007**: ステータスでのフィルタリング
- **FR-COMMON-008**: キーワード検索

---

## 5. データモデル

### 5.1 主要テーブル

#### 5.1.1 user_profiles
ユーザー情報を管理

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | uuid | ユーザーID（PK、FK to auth.users） |
| name | text | 氏名 |
| email | text | メールアドレス |
| user_type | text | ユーザータイプ（pharmacist/store/admin） |
| license_number | text | 薬剤師免許番号（薬剤師のみ） |
| pharmacy_id | text | 薬局ID（薬局のみ） |
| experience | integer | 経験年数（薬剤師のみ） |
| specialties | text[] | 専門分野（薬剤師のみ） |
| ng_list | text[] | NGリスト（レガシー、非推奨） |
| line_user_id | text | LINE User ID |
| line_notification_enabled | boolean | LINE通知有効フラグ |
| location_latitude | numeric | 緯度 |
| location_longitude | numeric | 経度 |
| nearest_station_name | text | 最寄り駅名 |
| created_at | timestamp | 作成日時 |

#### 5.1.2 shift_requests
薬剤師のシフト希望

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | uuid | シフトリクエストID（PK） |
| pharmacist_id | uuid | 薬剤師ID（FK to user_profiles） |
| date | date | 希望日 |
| time_slot | text | 時間帯（morning/afternoon/fullday/negotiable） |
| start_time | time | 開始時刻 |
| end_time | time | 終了時刻 |
| priority | text | 優先度（high/medium/low） |
| memo | text | メモ |
| status | text | ステータス（pending/approved/rejected） |
| created_at | timestamp | 作成日時 |

#### 5.1.3 shift_postings
薬局のシフト募集

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | uuid | シフト募集ID（PK） |
| pharmacy_id | uuid | 薬局ID（FK to user_profiles） |
| date | date | 募集日 |
| time_slot | text | 時間帯（morning/afternoon/fullday/negotiable） |
| start_time | time | 開始時刻 |
| end_time | time | 終了時刻 |
| required_staff | integer | 必要人数 |
| store_name | text | 店舗名 |
| memo | text | メモ |
| status | text | ステータス（open/filled/cancelled） |
| created_at | timestamp | 作成日時 |

#### 5.1.4 assigned_shifts
確定したシフト

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | uuid | 確定シフトID（PK） |
| pharmacist_id | uuid | 薬剤師ID（FK to user_profiles） |
| pharmacy_id | uuid | 薬局ID（FK to user_profiles） |
| date | date | シフト日 |
| time_slot | text | 時間帯 |
| start_time | time | 開始時刻 |
| end_time | time | 終了時刻 |
| store_name | text | 店舗名 |
| memo | text | メモ |
| status | text | ステータス（confirmed/pending/cancelled/provisional） |
| created_at | timestamp | 作成日時 |

#### 5.1.5 store_ng_pharmacists
薬局のNG薬剤師設定（店舗別）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | uuid | ID（PK） |
| pharmacy_id | uuid | 薬局ID（FK to user_profiles） |
| store_name | text | 店舗名 |
| pharmacist_id | uuid | NG薬剤師ID（FK to user_profiles） |
| created_at | timestamp | 作成日時 |

**複合ユニークキー**: (pharmacy_id, store_name, pharmacist_id)

#### 5.1.6 store_ng_pharmacies
薬剤師のNG薬局設定（店舗別）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | uuid | ID（PK） |
| pharmacist_id | uuid | 薬剤師ID（FK to user_profiles） |
| pharmacy_id | uuid | NG薬局ID（FK to user_profiles） |
| store_name | text | 店舗名 |
| created_at | timestamp | 作成日時 |

**複合ユニークキー**: (pharmacist_id, pharmacy_id, store_name)

#### 5.1.7 pharmacist_ratings
薬剤師評価

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | uuid | 評価ID（PK） |
| pharmacy_id | uuid | 評価した薬局ID（FK to user_profiles） |
| pharmacist_id | uuid | 評価された薬剤師ID（FK to user_profiles） |
| assigned_shift_id | uuid | 対象シフトID（FK to assigned_shifts） |
| rating | integer | 評価（1-5） |
| comment | text | コメント |
| created_at | timestamp | 作成日時 |

#### 5.1.8 recruitment_status
システム全体の募集ステータス

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | uuid | ID（PK） |
| status | text | ステータス（recruiting/matching/confirmed） |
| current_month | text | 現在の対象月（YYYY-MM形式） |
| updated_at | timestamp | 更新日時 |

#### 5.1.9 line_auth_codes
LINE認証コード

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | uuid | ID（PK） |
| user_id | uuid | ユーザーID（FK to user_profiles） |
| auth_code | text | 6桁認証コード |
| expires_at | timestamp | 有効期限（15分） |
| created_at | timestamp | 作成日時 |

#### 5.1.10 line_notification_logs
LINE通知ログ

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | uuid | ID（PK） |
| user_id | uuid | ユーザーID（FK to user_profiles） |
| line_user_id | text | LINE User ID |
| notification_type | text | 通知タイプ |
| message | text | メッセージ内容 |
| status | text | ステータス（success/failed） |
| error_message | text | エラーメッセージ |
| created_at | timestamp | 作成日時 |

### 5.2 AIマッチング関連テーブル

#### 5.2.1 match_outcomes
マッチング結果の追跡

#### 5.2.2 learning_data
機械学習用の学習データ

#### 5.2.3 pharmacist_profiles
拡張薬剤師プロフィール

#### 5.2.4 pharmacy_profiles
拡張薬局プロフィール

#### 5.2.5 matching_history
マッチング履歴

---

## 6. 画面一覧

### 6.1 認証画面

| 画面ID | 画面名 | 対象ユーザー | ファイル名 |
|--------|--------|------------|-----------|
| SC-001 | 薬剤師・薬局ログイン | 薬剤師・薬局 | MultiUserLoginForm.tsx |
| SC-002 | 管理者ログイン | 管理者 | AdminLoginForm.tsx |
| SC-003 | ユーザー登録 | 薬剤師・薬局 | （含まれる） |

### 6.2 薬剤師画面

| 画面ID | 画面名 | 説明 | ファイル名 |
|--------|--------|------|-----------|
| SC-101 | 薬剤師ダッシュボード | メイン画面 | PharmacistDashboard.tsx |
| SC-102 | シフト希望提出フォーム | 新規シフト希望作成 | PharmacistShiftRequestForm.tsx |
| SC-103 | 確定シフト一覧 | 自身の確定シフト表示 | （ダッシュボード内） |
| SC-104 | カレンダービュー | シフトカレンダー表示 | UnifiedCalendar.tsx |
| SC-105 | NG設定画面 | NG薬局の設定 | NGSettingsModal.tsx |
| SC-106 | 設定画面 | プロフィール・LINE連携 | SettingsPage.tsx |

### 6.3 薬局画面

| 画面ID | 画面名 | 説明 | ファイル名 |
|--------|--------|------|-----------|
| SC-201 | 薬局ダッシュボード | メイン画面 | PharmacyDashboard.tsx |
| SC-202 | シフト募集投稿フォーム | 新規シフト募集作成 | PharmacyShiftPostingForm.tsx |
| SC-203 | 確定シフト一覧 | 配属された薬剤師表示 | （ダッシュボード内） |
| SC-204 | カレンダービュー | シフトカレンダー表示 | UnifiedCalendar.tsx |
| SC-205 | NG設定画面 | NG薬剤師の設定 | NGSettingsModal.tsx |
| SC-206 | 評価画面 | 薬剤師評価の入力 | （ダッシュボード内） |
| SC-207 | 設定画面 | プロフィール・LINE連携 | SettingsPage.tsx |

### 6.4 管理者画面

| 画面ID | 画面名 | 説明 | ファイル名 |
|--------|--------|------|-----------|
| SC-301 | 管理者ダッシュボード | メイン画面 | AdminDashboard.tsx |
| SC-302 | 募集管理画面 | 募集ステータス管理 | AdminRecruitmentManagement.tsx |
| SC-303 | ユーザー管理画面 | ユーザー一覧・編集 | AdminUserManagement.tsx |
| SC-304 | マッチング実行画面 | AIマッチング実行 | （ダッシュボード内） |
| SC-305 | マッチング結果画面 | マッチング結果表示 | （ダッシュボード内） |
| SC-306 | カレンダー管理画面 | 統合カレンダー | AdminCalendar.tsx |
| SC-307 | 緊急シフト管理画面 | 緊急シフト対応 | AdminEmergencyShift.tsx |
| SC-308 | 統計画面 | マッチング統計表示 | AIMatchingStats.tsx |

### 6.5 共通画面

| 画面ID | 画面名 | 説明 | ファイル名 |
|--------|--------|------|-----------|
| SC-401 | エラー画面 | エラー表示 | AppErrorBoundary.tsx |
| SC-402 | ローディング画面 | ローディング表示 | LoadingSpinner.tsx |
| SC-403 | シフト詳細モーダル | シフト詳細表示 | ShiftDetailModal.tsx |
| SC-404 | LINE連携画面 | LINE連携設定 | LineIntegration.tsx |

---

## 7. ワークフロー

### 7.1 シフトマッチングフロー

```
[薬剤師] シフト希望提出
    ↓
[薬局] シフト募集投稿
    ↓
[管理者] 募集期間終了
    ↓
[管理者] マッチング実行
    ├─ NG設定の確認
    ├─ 距離計算（駅ベース）
    ├─ スキル・経験のマッチング
    └─ AIアルゴリズム適用
    ↓
[管理者] マッチング結果確認・調整
    ↓
[管理者] シフト確定
    ↓
[システム] LINE通知送信
    ├─ 薬剤師へ配属先通知
    └─ 薬局へ配属薬剤師通知
    ↓
[薬剤師/薬局] 確定シフト確認
    ↓
[システム] 前日リマインダー送信（20:00）
    ↓
[薬局] 勤務後評価入力
```

### 7.2 緊急シフト対応フロー

```
[薬局] 緊急シフト投稿
    ↓
[薬局] 通知対象選択
    ├─ 全薬剤師
    ├─ 特定薬剤師
    └─ 近隣薬剤師（駅ベース）
    ↓
[システム] 即座にLINE通知送信
    ↓
[薬剤師] 通知受信・対応
    ↓
[管理者] 手動マッチング・確定
    ↓
[システム] 確定通知送信
```

### 7.3 LINE連携フロー

```
[ユーザー] LINE連携設定画面を開く
    ↓
[システム] 6桁認証コード生成（有効期限15分）
    ↓
[ユーザー] LINEで公式アカウントを友だち追加
    ↓
[ユーザー] LINEで認証コードを送信
    ↓
[システム] コード検証・ユーザー紐付け
    ↓
[システム] 連携完了通知
    ↓
[ユーザー] 通知受信設定完了
```

### 7.4 ユーザー登録フロー

```
[新規ユーザー] ログイン画面で「新規登録」を選択
    ↓
[新規ユーザー] ユーザータイプ選択（薬剤師/薬局）
    ↓
[新規ユーザー] 基本情報入力
    ├─ メールアドレス
    ├─ パスワード
    ├─ 氏名/薬局名
    └─ その他必須情報
    ↓
[システム] Supabase Authでユーザー作成
    ↓
[システム] user_profilesに情報保存
    ↓
[システム] ダッシュボードへリダイレクト
```

---

## 8. 外部連携仕様

### 8.1 LINE Messaging API連携

#### 8.1.1 概要
LINE公式アカウントを通じて、ユーザーへのプッシュ通知を実現。

#### 8.1.2 使用するAPI
- **Messaging API**: プッシュメッセージの送信
- **Webhook**: ユーザーからのメッセージ受信

#### 8.1.3 認証方式
- Channel Access Token（長期トークン）

#### 8.1.4 Edge Functions

##### 8.1.4.1 send-line-notification
- **目的**: LINE通知の送信
- **トリガー**: HTTPリクエスト（認証必須）
- **パラメータ**:
  ```json
  {
    "userId": "uuid",
    "message": "string"
  }
  ```
- **処理**:
  1. ユーザーのline_user_idを取得
  2. LINE Messaging APIでプッシュメッセージ送信
  3. line_notification_logsに記録

##### 8.1.4.2 line-webhook
- **目的**: LINEからのWebhook受信
- **トリガー**: LINE Platform
- **処理**:
  1. Webhook署名検証
  2. メッセージ内容確認（6桁認証コード）
  3. line_auth_codesとマッチング
  4. user_profilesのline_user_id更新
  5. 連携完了メッセージ送信

##### 8.1.4.3 daily-shift-reminder
- **目的**: 毎日20時のリマインダー送信
- **トリガー**: Cronジョブ（20:00 JST）
- **処理**:
  1. 翌日のassigned_shiftsを検索
  2. 対象ユーザーのline_user_idを取得
  3. リマインダーメッセージ送信
  4. 送信ログ記録

##### 8.1.4.4 send-emergency-shift
- **目的**: 緊急シフト通知の送信
- **トリガー**: HTTPリクエスト
- **パラメータ**:
  ```json
  {
    "shiftId": "uuid",
    "targetType": "all | specific | nearby",
    "targetIds": ["uuid"] // specificの場合のみ
  }
  ```
- **処理**:
  1. 対象薬剤師の選定
  2. 一括LINE通知送信
  3. 送信結果記録

#### 8.1.5 通知タイプ

| 通知タイプ | トリガー | 送信タイミング | 対象 |
|----------|---------|--------------|------|
| シフト確定通知 | マッチング確定 | 即時 | 薬剤師・薬局 |
| 前日リマインダー | Cronジョブ | 毎日20:00 | 薬剤師・薬局 |
| 緊急シフト通知 | 薬局が緊急投稿 | 即時 | 対象薬剤師 |
| LINE連携完了 | 認証コード検証 | 即時 | 連携ユーザー |

---

## 9. 非機能要件

### 9.1 パフォーマンス要件

| 要件ID | 項目 | 目標値 | 測定方法 |
|--------|------|--------|---------|
| NFR-PERF-001 | ページ読み込み時間 | 3秒以内 | Lighthouse |
| NFR-PERF-002 | API応答時間 | 500ms以内 | Supabase監視 |
| NFR-PERF-003 | マッチング処理時間 | 10秒以内（100件） | 実測 |
| NFR-PERF-004 | 同時接続ユーザー数 | 100ユーザー | 負荷テスト |

### 9.2 可用性要件

| 要件ID | 項目 | 目標値 |
|--------|------|--------|
| NFR-AVAIL-001 | システム稼働率 | 99.5%以上 |
| NFR-AVAIL-002 | 定期メンテナンス時間 | 月1回、深夜2時間以内 |
| NFR-AVAIL-003 | バックアップ頻度 | 日次自動バックアップ |

### 9.3 スケーラビリティ要件

| 要件ID | 項目 | 目標値 |
|--------|------|--------|
| NFR-SCALE-001 | ユーザー数 | 最大10,000ユーザー |
| NFR-SCALE-002 | シフトデータ | 月間100,000件 |
| NFR-SCALE-003 | データベースサイズ | 100GB |

### 9.4 ユーザビリティ要件

| 要件ID | 項目 | 目標 |
|--------|------|------|
| NFR-USAB-001 | レスポンシブデザイン | スマホ・タブレット・PC対応 |
| NFR-USAB-002 | ブラウザ対応 | Chrome, Safari, Edge最新版 |
| NFR-USAB-003 | 操作習熟時間 | 30分以内（基本操作） |

### 9.5 メンテナンス性要件

| 要件ID | 項目 | 目標 |
|--------|------|------|
| NFR-MAINT-001 | コード品質 | ESLintエラー0件 |
| NFR-MAINT-002 | ドキュメント整備 | 全主要機能にドキュメント |
| NFR-MAINT-003 | ログ保持期間 | 90日間 |

### 9.6 互換性要件

| 要件ID | 項目 | 要件 |
|--------|------|------|
| NFR-COMPAT-001 | データベース | PostgreSQL 15以上 |
| NFR-COMPAT-002 | Node.js | 18.0.0以上 |
| NFR-COMPAT-003 | ブラウザ | ES2020対応ブラウザ |

---

## 10. 技術スタック

### 10.1 フロントエンド

| カテゴリ | 技術 | バージョン | 用途 |
|---------|------|-----------|------|
| フレームワーク | React | 18.3.1 | UIフレームワーク |
| 言語 | TypeScript | 5.2.2 | 型安全な開発 |
| ビルドツール | Vite | 5.3.4 | 高速ビルド |
| スタイリング | Tailwind CSS | 3.4.4 | ユーティリティCSS |
| アイコン | Lucide React | 0.263.1 | アイコンライブラリ |

### 10.2 バックエンド

| カテゴリ | 技術 | バージョン | 用途 |
|---------|------|-----------|------|
| BaaS | Supabase | - | データベース・認証・Edge Functions |
| データベース | PostgreSQL | 15 | リレーショナルDB |
| 認証 | Supabase Auth | - | ユーザー認証 |
| ストレージ | Supabase Storage | - | ファイル保存（将来拡張） |

### 10.3 Edge Functions

| カテゴリ | 技術 | 用途 |
|---------|------|------|
| ランタイム | Deno | サーバーレス実行環境 |
| 言語 | TypeScript | Edge Function開発 |

### 10.4 外部API

| サービス | 用途 | 認証方式 |
|---------|------|---------|
| LINE Messaging API | プッシュ通知送信 | Channel Access Token |

### 10.5 開発ツール

| カテゴリ | 技術 | バージョン | 用途 |
|---------|------|-----------|------|
| Linter | ESLint | 8.57.0 | コード品質チェック |
| Formatter | Prettier | - | コード整形 |
| Minifier | Terser | 5.43.1 | 本番ビルド最適化 |

### 10.6 デプロイ

| カテゴリ | 技術 | 用途 |
|---------|------|------|
| ホスティング | Railway | Webアプリホスティング |
| Edge Functions | Supabase Edge Functions | サーバーレス関数 |
| データベース | Supabase | マネージドPostgreSQL |

---

## 11. セキュリティ要件

### 11.1 認証・認可

| 要件ID | 項目 | 実装 |
|--------|------|------|
| SEC-AUTH-001 | パスワードハッシュ化 | Supabase Auth（bcrypt） |
| SEC-AUTH-002 | セッション管理 | JWT（自動更新） |
| SEC-AUTH-003 | ユーザータイプ別アクセス制御 | RLS（Row Level Security） |
| SEC-AUTH-004 | 多要素認証 | 将来実装予定 |

### 11.2 データ保護

| 要件ID | 項目 | 実装 |
|--------|------|------|
| SEC-DATA-001 | データ暗号化（転送） | HTTPS（TLS 1.3） |
| SEC-DATA-002 | データ暗号化（保存） | Supabaseデフォルト（AES-256） |
| SEC-DATA-003 | 個人情報保護 | RLSによるアクセス制限 |
| SEC-DATA-004 | SQLインジェクション対策 | ParameterizedQuery |

### 11.3 API セキュリティ

| 要件ID | 項目 | 実装 |
|--------|------|------|
| SEC-API-001 | API認証 | Supabase Anon Key + RLS |
| SEC-API-002 | Edge Function認証 | Bearer Token（Service Role Key） |
| SEC-API-003 | CORS設定 | 本番環境で制限 |
| SEC-API-004 | レート制限 | Supabaseデフォルト |

### 11.4 外部連携セキュリティ

| 要件ID | 項目 | 実装 |
|--------|------|------|
| SEC-EXT-001 | LINE Webhook検証 | 署名検証 |
| SEC-EXT-002 | 認証コード有効期限 | 15分 |
| SEC-EXT-003 | 認証コード使い捨て | 一度のみ使用可能 |

### 11.5 アプリケーションセキュリティ

| 要件ID | 項目 | 実装 |
|--------|------|------|
| SEC-APP-001 | XSS対策 | React自動エスケープ |
| SEC-APP-002 | CSRF対策 | SameSite Cookie |
| SEC-APP-003 | 環境変数保護 | .envファイル（.gitignore） |
| SEC-APP-004 | 機密情報ログ出力禁止 | 本番環境でconsole.log削除 |

### 11.6 監査・ログ

| 要件ID | 項目 | 実装 |
|--------|------|------|
| SEC-AUDIT-001 | 認証ログ | Supabase Auth Logs |
| SEC-AUDIT-002 | LINE通知ログ | line_notification_logs |
| SEC-AUDIT-003 | エラーログ | localStorage + 将来的に外部サービス |

---

## 12. 今後の改善計画

### 12.1 コード品質改善

| 優先度 | 項目 | 説明 | 見積工数 |
|-------|------|------|---------|
| 高 | AdminDashboard.tsxのリファクタリング | 7,276行を機能別コンポーネントに分割 | 40時間 |
| 高 | TypeScript型安全性向上 | `any`型の削減、厳密な型定義追加 | 20時間 |
| 中 | console.log削除 | ロガーライブラリへの置き換え | 10時間 |
| 中 | コンポーネント分割 | PharmacyDashboard、PharmacistDashboardの最適化 | 30時間 |

### 12.2 機能追加

| 優先度 | 項目 | 説明 | 見積工数 |
|-------|------|------|---------|
| 高 | 多要素認証（MFA） | セキュリティ強化 | 30時間 |
| 中 | データエクスポート機能 | CSV/Excel出力 | 20時間 |
| 中 | プッシュ通知（Web） | PWA対応 | 25時間 |
| 低 | ダークモード | UI拡張 | 15時間 |

### 12.3 パフォーマンス改善

| 優先度 | 項目 | 説明 | 見積工数 |
|-------|------|------|---------|
| 高 | 遅延読み込み最適化 | React.lazy拡充 | 15時間 |
| 中 | データベースインデックス最適化 | クエリパフォーマンス向上 | 10時間 |
| 中 | 画像最適化 | WebP対応、CDN利用 | 12時間 |

### 12.4 テスト追加

| 優先度 | 項目 | 説明 | 見積工数 |
|-------|------|------|---------|
| 高 | ユニットテスト | Jest + React Testing Library | 50時間 |
| 高 | E2Eテスト | Playwright導入 | 40時間 |
| 中 | 統合テスト | API・Edge Functionsテスト | 30時間 |

### 12.5 ドキュメント整備

| 優先度 | 項目 | 説明 | 見積工数 |
|-------|------|------|---------|
| 高 | API仕様書 | OpenAPI仕様書作成 | 20時間 |
| 中 | コンポーネントドキュメント | Storybook導入 | 30時間 |
| 中 | ユーザーマニュアル | 操作マニュアル作成 | 25時間 |

### 12.6 インフラ改善

| 優先度 | 項目 | 説明 | 見積工数 |
|-------|------|------|---------|
| 高 | CI/CD パイプライン | GitHub Actions構築 | 20時間 |
| 中 | モニタリング強化 | Sentry、LogRocket導入 | 15時間 |
| 低 | CDN導入 | 静的アセット配信最適化 | 10時間 |

---

## 付録

### A. 用語集

| 用語 | 説明 |
|------|------|
| シフトリクエスト | 薬剤師が提出するシフト希望 |
| シフトポスティング | 薬局が投稿するシフト募集 |
| アサインドシフト | マッチング後の確定シフト |
| NGリスト | 相互に拒否する薬剤師・薬局のリスト |
| AIマッチング | 距離・スキル・履歴を考慮した自動マッチング |
| 時間帯 | morning（午前）/ afternoon（午後）/ fullday（終日）/ negotiable（応相談） |
| 募集ステータス | recruiting（募集中）/ matching（マッチング中）/ confirmed（確定済み） |
| RLS | Row Level Security - PostgreSQLの行レベルセキュリティ |
| Edge Function | Supabaseのサーバーレス関数（Deno実行環境） |

### B. 略語表

| 略語 | 正式名称 |
|------|---------|
| FR | Functional Requirement（機能要件） |
| NFR | Non-Functional Requirement（非機能要件） |
| SC | Screen（画面） |
| API | Application Programming Interface |
| UI | User Interface |
| UX | User Experience |
| DB | Database |
| PK | Primary Key |
| FK | Foreign Key |
| JWT | JSON Web Token |
| CORS | Cross-Origin Resource Sharing |
| XSS | Cross-Site Scripting |
| CSRF | Cross-Site Request Forgery |
| MFA | Multi-Factor Authentication |

### C. 参照ドキュメント

| ドキュメント名 | 説明 |
|-------------|------|
| README.md | プロジェクト概要・セットアップ手順 |
| SETUP_DATABASE.md | データベースセットアップ詳細 |
| DEPLOYMENT_GUIDE.md | Edge Functionデプロイ手順 |
| LINE_INTEGRATION_SETUP.md | LINE連携設定手順 |
| USAGE_EXAMPLES.md | 使用例とベストプラクティス |
| MULTI_USER_GUIDE.md | マルチユーザー機能詳細 |

---

**文書管理**

| 項目 | 内容 |
|------|------|
| 作成者 | システム分析担当 |
| 承認者 | - |
| 最終更新日 | 2025-12-05 |
| バージョン | 1.0 |
| 次回レビュー予定 | 2025-12-19 |

---

**変更履歴**

| バージョン | 日付 | 変更内容 | 変更者 |
|----------|------|---------|--------|
| 1.0 | 2025-12-05 | 初版作成 | システム分析担当 |

---

**END OF DOCUMENT**
