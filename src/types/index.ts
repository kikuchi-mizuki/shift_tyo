// Supabase Auth User型（実際の構造に対応）
export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
    user_type?: 'store' | 'pharmacist' | 'admin';
  };
}

// アプリケーション用のUser型
export interface User {
  id: string;
  name: string;
  email: string;
  type: 'store' | 'pharmacist' | 'admin';
  licenseNumber?: string; // 薬剤師免許番号
  pharmacyId?: string;
  experience?: number; // 経験年数
  specialties?: string[]; // 専門分野
  ngList?: string[]; // NG薬局/薬剤師のIDリスト
}

// user_profilesテーブルの型
export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  user_type: 'store' | 'pharmacist' | 'admin' | null;
  created_at?: string;
}

// pharmacist_requestsテーブルの型（実際のDB構造に対応）
export interface PharmacistRequest {
  id?: string;
  pharmacist_id: string;
  date: string;
  time_slot: string | null;
  start_time?: string | null;
  end_time?: string | null;
  memo?: string | null;
  created_at?: string;
}

// 後方互換性のため残す
export interface ShiftRequest {
  id: string;
  pharmacistId: string;
  date: string;
  timeSlot: 'morning' | 'afternoon' | 'fullday' | 'negotiable';
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
}

// assigned_shiftsテーブルの型（実際のDB構造に対応）
export interface AssignedShift {
  id: string;
  pharmacist_id: string;
  pharmacy_id: string;
  date: string;
  time_slot?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  store_name?: string | null;
  memo?: string | null;
  status: 'confirmed' | 'pending' | 'cancelled' | 'provisional';
  created_at?: string;
}

// 後方互換性のため残す
export interface LegacyAssignedShift {
  id: string;
  pharmacistId: string;
  pharmacyId: string;
  date: string;
  timeSlot: 'morning' | 'afternoon' | 'fullday' | 'negotiable';
  duration: number;
  hourlyRate: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'provisional';
}

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  type: 'hospital' | 'retail' | 'clinic';
  requirements: {
    minExperience: number;
    specialties: string[];
    maxPharmacists: number;
  };
  ngList?: string[]; // NG薬剤師のIDリスト
}

// pharmacy_postingsテーブルの型（実際のDB構造に対応）
export interface PharmacyPosting {
  id: string;
  pharmacy_id: string;
  date: string;
  time_slot?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  needed_staff: number;
  store_name?: string | null;
  memo?: string | null;
  status?: 'open' | 'filled' | 'cancelled';
  created_at?: string;
}

// 後方互換性のため残す
export interface ShiftPosting {
  id: string;
  pharmacyId: string;
  date: string;
  timeSlot: 'morning' | 'afternoon' | 'fullday' | 'negotiable';
  requiredPeople: number;
  hourlyRate: number;
  requirements?: string[];
  notes?: string;
  status: 'open' | 'filled' | 'cancelled';
  createdAt: string;
}

export interface SystemStatus {
  currentPhase: 'recruiting' | 'matching' | 'confirmed';
  lastUpdated: string;
  totalRequests: number;
  totalPostings: number;
  matchedShifts: number;
}

// 時間テンプレートの型
export interface TimeTemplate {
  name: string;
  start: string;
  end: string;
}

// 薬局プロフィールの型
export interface PharmacyProfile {
  id: string;
  name: string | null;
  email: string | null;
  user_type: 'store' | null;
  created_at?: string;
}