/**
 * 管理者ダッシュボードの状態管理型定義
 * AdminDashboardから抽出
 *
 * @deprecated このファイルの型定義は src/types/index.ts に統合されました
 * 新しいコードでは src/types/index.ts の型定義を使用してください
 * 後方互換性のためにこのファイルは残されています
 */

/**
 * ユーザープロフィール
 * @deprecated Use UserProfile from '../types/index.ts' instead
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  user_type: 'pharmacist' | 'store' | 'admin';
  license_number?: string;
  pharmacy_id?: string;
  experience?: number;
  specialties?: string[];
  ng_list?: string[];
  line_user_id?: string;
  line_notification_enabled?: boolean;
  location_latitude?: number;
  location_longitude?: number;
  nearest_station_name?: string;
  address?: string;
  phone?: string;
  store_name?: string;
  created_at?: string;
}

/**
 * シフトリクエスト
 * @deprecated Use PharmacistRequest from '../types/index.ts' instead
 */
export interface ShiftRequest {
  id: string;
  pharmacist_id: string;
  date: string;
  time_slot: 'morning' | 'afternoon' | 'fullday' | 'negotiable' | 'consult';
  start_time?: string;
  end_time?: string;
  priority?: 'high' | 'medium' | 'low';
  memo?: string;
  status: 'pending' | 'approved' | 'rejected' | 'confirmed';
  created_at?: string;
}

/**
 * シフト募集
 * @deprecated Use PharmacyPosting from '../types/index.ts' instead
 */
export interface ShiftPosting {
  id: string;
  pharmacy_id: string;
  date: string;
  time_slot: 'morning' | 'afternoon' | 'fullday' | 'negotiable' | 'consult';
  start_time?: string;
  end_time?: string;
  required_staff: number;
  store_name: string;
  memo?: string;
  status: 'open' | 'filled' | 'cancelled';
  created_at?: string;
}

/**
 * 確定シフト
 * @deprecated Use AssignedShift from '../types/index.ts' instead
 */
export interface AssignedShift {
  id: string;
  pharmacist_id: string;
  pharmacy_id: string;
  date: string;
  time_slot: 'morning' | 'afternoon' | 'fullday' | 'negotiable' | 'consult';
  start_time?: string;
  end_time?: string;
  store_name: string;
  memo?: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'provisional';
  created_at?: string;
}

/**
 * 薬剤師評価
 */
export interface PharmacistRating {
  id: string;
  pharmacist_id: string;
  pharmacy_id: string;
  assigned_shift_id?: string;
  rating: number;
  comment?: string;
  created_at: string;
}

/**
 * 店舗別NG薬剤師
 */
export interface StoreNgPharmacist {
  id: string;
  pharmacy_id: string;
  store_name: string;
  pharmacist_id: string;
  created_at?: string;
}

/**
 * 店舗別NG薬局
 */
export interface StoreNgPharmacy {
  id: string;
  pharmacist_id: string;
  pharmacy_id: string;
  store_name: string;
  created_at?: string;
}

/**
 * 募集ステータス
 */
export interface RecruitmentStatus {
  is_open: boolean;
  updated_at: string;
  updated_by: string | null;
  notes: string | null;
}

/**
 * AIマッチング候補
 */
export interface MatchCandidate {
  pharmacist: UserProfile;
  pharmacy: UserProfile;
  date: string;
  timeSlot: string;
  score: number;
  reasons?: string[];
}

/**
 * ユーザープロフィールマップ（ID→プロフィール）
 */
export type UserProfileMap = Record<string, UserProfile>;

/**
 * 店舗別NGマップ（薬局ID→NG薬剤師リスト）
 */
export type StoreNgPharmacistMap = Record<string, StoreNgPharmacist[]>;

/**
 * 店舗別NGマップ（薬剤師ID→NG薬局リスト）
 */
export type StoreNgPharmacyMap = Record<string, StoreNgPharmacy[]>;

/**
 * 日付別AIマッチングマップ
 */
export type AIMatchesByDate = Record<string, MatchCandidate[]>;

/**
 * セクション展開状態
 */
export interface ExpandedSections {
  pharmacies: boolean;
  pharmacists: boolean;
  [key: string]: boolean;
}

/**
 * 追加フォーム表示状態
 */
export interface ShowAddForms {
  posting: boolean;
  request: boolean;
  [key: string]: boolean;
}

/**
 * 新規募集フォームデータ
 */
export interface NewPostingForm {
  date: string;
  time_slot: string;
  start_time: string;
  end_time: string;
  required_staff: number;
  store_name: string;
  memo: string;
}

/**
 * 新規リクエストフォームデータ
 */
export interface NewRequestForm {
  date: string;
  time_slot: string;
  start_time: string;
  end_time: string;
  priority: string;
  memo: string;
  pharmacist_id: string;
}

/**
 * 編集中のシフトデータ
 */
export interface EditingShift {
  id: string;
  date: string;
  time_slot: string;
  start_time: string;
  end_time: string;
  memo?: string;
  [key: string]: any;
}

/**
 * 編集中のユーザーデータ
 */
export interface EditingUser extends UserProfile {
  password?: string;
}

/**
 * 手動マッチング選択状態（薬局ID→薬剤師IDマップ）
 */
export type ManualMatches = Record<string, string>;

/**
 * マッチングオプション
 */
export interface MatchingOptions {
  useAI: boolean;
  priority: 'satisfaction' | 'efficiency' | 'balance' | 'pharmacy_satisfaction';
  excludeConfirmed: boolean;
  respectNgList: boolean;
}

/**
 * 分析結果（不足薬局）
 */
export interface ShortageAnalysis {
  pharmacy: UserProfile;
  posting: ShiftPosting;
  shortage: number;
  candidates: UserProfile[];
}

/**
 * デバッグデータ
 */
export interface DebugData {
  selectedDate: string;
  aiMatches: MatchCandidate[];
  shiftPostings: ShiftPosting[];
  shiftRequests: ShiftRequest[];
  currentDate: string;
  timestamp: number;
}

/**
 * 管理者ダッシュボードの全状態
 */
export interface AdminDashboardState {
  // コアデータ
  currentDate: Date;
  selectedDate: string;
  assigned: AssignedShift[];
  requests: ShiftRequest[];
  postings: ShiftPosting[];
  userProfiles: UserProfileMap;
  ratings: PharmacistRating[];
  storeNgPharmacists: StoreNgPharmacistMap;
  storeNgPharmacies: StoreNgPharmacyMap;

  // システム状態
  loading: boolean;
  systemStatus: string;
  lastUpdated: Date;
  recruitmentStatus: RecruitmentStatus;
  expandedSections: ExpandedSections;

  // AIマッチング
  aiMatches: MatchCandidate[];
  aiMatchesByDate: AIMatchesByDate;
  useAIMatching: boolean;
  aiMatchingLoading: boolean;
  monthlyMatchingExecuted: boolean;

  // 手動マッチング
  manualMatches: ManualMatches;

  // フォーム状態
  showAddForms: ShowAddForms;
  newPosting: NewPostingForm;
  newRequest: NewRequestForm;
  editingPostingId: string | null;
  postingEditForm: Partial<ShiftPosting>;
  editingRequestId: string | null;
  requestEditForm: Partial<ShiftRequest>;
  editingUserId: string | null;
  userEditForm: Partial<EditingUser>;
  editingShift: EditingShift | null;

  // モーダル
  showEmergencyModal: boolean;
  showPasswordChangeModal: boolean;
  showDebugModal: boolean;
  debugData: DebugData | null;
}
