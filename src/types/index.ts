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

export interface ShiftRequest {
  id: string;
  pharmacistId: string;
  date: string;
  timeSlot: 'morning' | 'afternoon' | 'fullday' | 'negotiable';
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AssignedShift {
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