/**
 * AnalysisService.ts
 * シフト不足分析ロジックを管理するサービス
 *
 * AdminDashboard.tsxから抽出された分析関連のビジネスロジック
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { safeLength, safeObject } from '../../utils/admin/arrayHelpers';
import { filterConfirmedRequestsAndPostings } from './MatchingService';
import type {
  PharmacyDetails,
  ShortageAnalysis,
  ShortagePharmacy,
  UserProfileMap,
  PharmacistRequest,
  PharmacyPosting
} from '../../types';

/**
 * 薬局の詳細情報をデータベースから取得する関数
 */
export const getPharmacyDetails = async (
  supabase: SupabaseClient,
  pharmacyId: string
): Promise<PharmacyDetails | null> => {
  if (!supabase) return null;

  try {
    const { data: pharmacyProfile, error } = await supabase
      .from('user_profiles')
      .select('name, store_name, email, phone')
      .eq('id', pharmacyId)
      .eq('user_type', 'pharmacy')
      .single();

    if (error) {
      console.warn(`薬局詳細取得エラー [${pharmacyId}]:`, error);
      return null;
    }

    return pharmacyProfile;
  } catch (error) {
    console.error(`薬局詳細取得エラー [${pharmacyId}]:`, error);
    return null;
  }
};

/**
 * 月次の不足状況を分析する関数
 *
 * @param matchesByDate - 日付別のマッチング結果
 * @param requests - シフト希望リスト
 * @param postings - シフト募集リスト
 * @param userProfiles - ユーザープロフィール
 * @returns 不足情報
 */
export const analyzeMonthlyShortage = (
  matchesByDate: { [date: string]: any[] },
  requests: PharmacistRequest[],
  postings: PharmacyPosting[],
  userProfiles: UserProfileMap
): ShortageAnalysis => {
  const shortagePharmacies: ShortagePharmacy[] = [];
  let totalShortage = 0;

  // matchesByDateが空の場合は、全postingsから分析
  const datesToAnalyze = Object.keys(safeObject(matchesByDate)).length > 0
    ? Object.keys(safeObject(matchesByDate))
    : Array.from(new Set(postings?.map(p => p.date) || []));

  // 各日付の不足状況を分析
  datesToAnalyze.forEach(date => {
    const allDayRequests = Array.isArray(requests)
      ? requests.filter((r: any) => r.date === date)
      : [];
    const allDayPostings = Array.isArray(postings)
      ? postings.filter((p: any) => p.date === date)
      : [];

    // 確定済みステータスの希望・募集を除外
    const { filteredRequests: dayRequests, filteredPostings: dayPostings } =
      filterConfirmedRequestsAndPostings(allDayRequests, allDayPostings);
    const dayMatches = matchesByDate[date] || [];

    // 薬局ごとの募集数とマッチ数を計算
    const pharmacyNeeds: {
      [pharmacyId: string]: {
        id: string;
        name: string;
        store_name: string;
        required: number;
        matched: number;
        shortage: number;
        postings: any[];
      };
    } = {};

    // 募集数を集計（required_staffを使用）
    dayPostings.forEach(posting => {
      const pharmacyId = posting.pharmacy_id;
      if (!pharmacyNeeds[pharmacyId]) {
        pharmacyNeeds[pharmacyId] = {
          id: pharmacyId,
          name: userProfiles[pharmacyId]?.name || `薬局${pharmacyId ? pharmacyId.slice(-4) : 'unknown'}`,
          store_name: posting.store_name || '店舗名なし',
          required: 0,
          matched: 0,
          shortage: 0,
          postings: []
        };
      }
      // required_staffフィールドを使用（デフォルトは1）
      const requiredStaff = posting.required_staff || 1;
      pharmacyNeeds[pharmacyId].required += requiredStaff;
      pharmacyNeeds[pharmacyId].postings.push(posting);
    });

    // マッチ数を集計
    dayMatches.forEach(match => {
      const pharmacyId = match.pharmacy.id;
      if (pharmacyNeeds[pharmacyId]) {
        pharmacyNeeds[pharmacyId].matched++;
      }
    });

    // 不足数を計算
    Object.values(pharmacyNeeds).forEach(pharmacy => {
      pharmacy.shortage = Math.max(0, pharmacy.required - pharmacy.matched);
      if (pharmacy.shortage > 0) {
        totalShortage += pharmacy.shortage;
        shortagePharmacies.push({
          ...pharmacy,
          date: date,
          store_name: pharmacy.postings[0]?.store_name || '',
          start_time: pharmacy.postings[0]?.start_time || '',
          end_time: pharmacy.postings[0]?.end_time || ''
        });
      }
    });
  });

  return {
    totalShortage,
    shortagePharmacies
  };
};

/**
 * マッチング結果を考慮した不足薬局分析関数
 *
 * @param date - 対象日付
 * @param dayMatches - その日のマッチング結果
 * @param requests - シフト希望リスト
 * @param postings - シフト募集リスト
 * @param assigned - 確定済みシフトリスト
 * @param userProfiles - ユーザープロフィール
 * @returns 不足薬局リスト
 */
export const analyzePharmacyShortageWithMatches = (
  date: string,
  dayMatches: any[],
  requests: any[],
  postings: any[],
  assigned: any[],
  userProfiles: any
): any[] => {
  const allDayRequests = Array.isArray(requests)
    ? requests.filter((r: any) => r.date === date)
    : [];
  const allDayPostings = Array.isArray(postings)
    ? postings.filter((p: any) => p.date === date)
    : [];

  // 確定済みステータスの希望・募集を除外
  const { filteredRequests: dayRequests, filteredPostings: dayPostings } =
    filterConfirmedRequestsAndPostings(allDayRequests, allDayPostings);

  // 薬局・店舗ごとの募集数とマッチ数を計算（店舗ごとに個別管理）
  const pharmacyNeeds: {
    [key: string]: {
      id: string;
      name: string;
      store_name: string;
      start_time: string;
      end_time: string;
      required: number;
      matched: number;
      shortage: number;
      postings: any[];
    };
  } = {};

  // 募集数を集計（店舗・時間帯ごとに個別）
  dayPostings.forEach(posting => {
    const pharmacyId = posting.pharmacy_id;
    const storeName = posting.store_name || '店舗名なし';
    const startTime = posting.start_time ? String(posting.start_time).substring(0, 5) : '09:00';
    const endTime = posting.end_time ? String(posting.end_time).substring(0, 5) : '18:00';
    // 薬局ID + 店舗名 + 時間帯の組み合わせでユニークキーを作成
    const uniqueKey = `${pharmacyId}_${storeName}_${startTime}_${endTime}`;

    if (!pharmacyNeeds[uniqueKey]) {
      pharmacyNeeds[uniqueKey] = {
        id: pharmacyId,
        name: userProfiles[pharmacyId]?.name || `薬局${pharmacyId ? pharmacyId.slice(-4) : 'unknown'}`,
        store_name: storeName,
        start_time: startTime,
        end_time: endTime,
        required: 0,
        matched: 0,
        shortage: 0,
        postings: []
      };
    }
    // required_staffフィールドを使用（デフォルトは1）
    const requiredStaff = posting.required_staff || 1;
    pharmacyNeeds[uniqueKey].required += requiredStaff;
    pharmacyNeeds[uniqueKey].postings.push(posting);
  });

  // マッチ数を集計（店舗・時間帯ごとに個別）
  // 1. AIマッチング結果から
  dayMatches.forEach(match => {
    const pharmacyId = match.pharmacy.id;
    // 店舗名は元の募集データから取得する必要がある
    const matchingPosting = dayPostings.find(p => p.pharmacy_id === pharmacyId);
    const storeName = matchingPosting?.store_name || '店舗名なし';
    const startTime = match.start_time ? String(match.start_time).substring(0, 5) : '09:00';
    const endTime = match.end_time ? String(match.end_time).substring(0, 5) : '18:00';
    const uniqueKey = `${pharmacyId}_${storeName}_${startTime}_${endTime}`;

    if (pharmacyNeeds[uniqueKey]) {
      pharmacyNeeds[uniqueKey].matched++;
    }
  });

  // 2. 確定済みシフトから
  const confirmedShifts = Array.isArray(assigned)
    ? assigned.filter((s: any) => s?.date === date && s?.status === 'confirmed')
    : [];

  confirmedShifts.forEach(shift => {
    const pharmacyId = shift.pharmacy_id;
    const storeName = shift.store_name || '店舗名なし';
    const startTime = shift.start_time ? String(shift.start_time).substring(0, 5) : '09:00';
    const endTime = shift.end_time ? String(shift.end_time).substring(0, 5) : '18:00';
    const uniqueKey = `${pharmacyId}_${storeName}_${startTime}_${endTime}`;

    if (pharmacyNeeds[uniqueKey]) {
      pharmacyNeeds[uniqueKey].matched++;
    }
  });

  // 不足数を計算
  Object.values(pharmacyNeeds).forEach(pharmacy => {
    pharmacy.shortage = Math.max(0, pharmacy.required - pharmacy.matched);
  });

  // 不足がある薬局のみを配列で返す
  const shortagePharmacies = Object.values(pharmacyNeeds).filter(
    pharmacy => pharmacy.shortage > 0
  );

  return shortagePharmacies;
};

/**
 * 薬局の不足状況を分析する関数
 *
 * @param date - 対象日付
 * @param requests - シフト希望リスト
 * @param postings - シフト募集リスト
 * @param assigned - 確定済みシフトリスト
 * @param aiMatchesByDate - 日付別AIマッチング結果
 * @param userProfiles - ユーザープロフィール
 * @returns 不足薬局リスト
 */
export const analyzePharmacyShortage = (
  date: string,
  requests: any[],
  postings: any[],
  assigned: any[],
  aiMatchesByDate: { [date: string]: any[] },
  userProfiles: any
): any[] => {
  const allDayRequests = Array.isArray(requests)
    ? requests.filter((r: any) => r.date === date)
    : [];
  const allDayPostings = Array.isArray(postings)
    ? postings.filter((p: any) => p.date === date)
    : [];

  // 確定済みステータスの希望・募集を除外
  const { filteredRequests: dayRequests, filteredPostings: dayPostings } =
    filterConfirmedRequestsAndPostings(allDayRequests, allDayPostings);
  const dayMatches = aiMatchesByDate[date] || [];

  console.log('🔍 [analyzePharmacyShortage] 開始:', date);
  console.log('入力 - aiMatchesByDate:', aiMatchesByDate);
  console.log('入力 - dayMatches:', dayMatches);

  // 🔧 FIX: aiMatchesByDateが空でも、assignedテーブルからpendingマッチングを取得
  const pendingMatches = Array.isArray(assigned)
    ? assigned.filter((s: any) => s?.date === date && s?.status === 'pending')
    : [];

  // aiMatchesByDateが空の場合は、assignedから取得したpendingマッチングを使用
  const effectiveDayMatches = dayMatches.length > 0 ? dayMatches : pendingMatches;

  console.log('📊 effectiveDayMatches (使用するマッチング):', effectiveDayMatches.length, '件');

  // マッチング済みの薬局IDを取得
  const matchedPharmacyIds = new Set(effectiveDayMatches.map(match => match.pharmacy?.id || match.pharmacy_id));

  // 薬局・店舗ごとの募集数とマッチ数を計算（店舗ごとに個別管理）
  const pharmacyNeeds: {
    [key: string]: {
      id: string;
      name: string;
      store_name: string;
      start_time: string;
      end_time: string;
      required: number;
      matched: number;
      shortage: number;
      postings: any[];
    };
  } = {};

  // 募集数を集計（店舗・時間帯ごとに個別）
  console.log('📋 募集を集計中...', dayPostings.length, '件');
  dayPostings.forEach(posting => {
    const pharmacyId = posting.pharmacy_id;
    const storeName = posting.store_name || '店舗名なし';
    const startTime = posting.start_time ? String(posting.start_time).substring(0, 5) : '09:00';
    const endTime = posting.end_time ? String(posting.end_time).substring(0, 5) : '18:00';
    // 薬局ID + 店舗名 + 時間帯の組み合わせでユニークキーを作成
    const uniqueKey = `${pharmacyId}_${storeName}_${startTime}_${endTime}`;

    console.log(`  - 募集: pharmacyId=${pharmacyId}, storeName=${storeName}, time=${startTime}-${endTime}, uniqueKey=${uniqueKey}, required_staff=${posting.required_staff || 1}`);

    if (!pharmacyNeeds[uniqueKey]) {
      pharmacyNeeds[uniqueKey] = {
        id: pharmacyId,
        name: userProfiles[pharmacyId]?.name || `薬局${pharmacyId ? pharmacyId.slice(-4) : 'unknown'}`,
        store_name: storeName,
        start_time: startTime,
        end_time: endTime,
        required: 0,
        matched: 0,
        shortage: 0,
        postings: []
      };
    }
    // required_staffフィールドを使用（デフォルトは1）
    const requiredStaff = posting.required_staff || 1;
    pharmacyNeeds[uniqueKey].required += requiredStaff;
    pharmacyNeeds[uniqueKey].postings.push(posting);
  });

  console.log('📦 pharmacyNeeds 初期状態:', pharmacyNeeds);

  // マッチ数を集計（店舗・時間帯ごとに個別）
  // 1. AIマッチング結果 + pending状態のマッチングから
  console.log('📝 マッチング結果を集計中... (effectiveDayMatches)');
  effectiveDayMatches.forEach(match => {
    const pharmacyId = match.pharmacy?.id || match.pharmacy_id;
    // 店舗名を正しく取得（match.pharmacy.store_name, match.store_name, またはpostingから）
    let storeName = match.pharmacy?.store_name || match.store_name;
    if (!storeName) {
      const matchingPosting = dayPostings.find(p => p.pharmacy_id === pharmacyId);
      storeName = matchingPosting?.store_name || '店舗名なし';
    }
    // 時間帯を取得
    const startTime = match.start_time ? String(match.start_time).substring(0, 5) : '09:00';
    const endTime = match.end_time ? String(match.end_time).substring(0, 5) : '18:00';
    const uniqueKey = `${pharmacyId}_${storeName}_${startTime}_${endTime}`;

    console.log(`  - マッチ: pharmacyId=${pharmacyId}, storeName=${storeName}, time=${startTime}-${endTime}, uniqueKey=${uniqueKey}`);
    if (pharmacyNeeds[uniqueKey]) {
      pharmacyNeeds[uniqueKey].matched++;
      console.log(`    ✓ matched++, 現在=${pharmacyNeeds[uniqueKey].matched}`);
    } else {
      console.log(`    ✗ pharmacyNeedsに該当なし`);
    }
  });

  // 2. 確定済みシフトから
  const confirmedShifts = Array.isArray(assigned)
    ? assigned.filter((s: any) => s?.date === date && s?.status === 'confirmed')
    : [];

  console.log('📝 確定済みシフトを集計中...', confirmedShifts.length, '件');
  confirmedShifts.forEach(shift => {
    const pharmacyId = shift.pharmacy_id;
    const storeName = shift.store_name || '店舗名なし';
    const startTime = shift.start_time ? String(shift.start_time).substring(0, 5) : '09:00';
    const endTime = shift.end_time ? String(shift.end_time).substring(0, 5) : '18:00';
    const uniqueKey = `${pharmacyId}_${storeName}_${startTime}_${endTime}`;

    if (pharmacyNeeds[uniqueKey]) {
      pharmacyNeeds[uniqueKey].matched++;
    }
  });

  // 不足数を計算
  console.log('📊 最終計算:');
  Object.values(pharmacyNeeds).forEach(pharmacy => {
    pharmacy.shortage = Math.max(0, pharmacy.required - pharmacy.matched);
    console.log(`  ${pharmacy.name} (${pharmacy.store_name}): required=${pharmacy.required}, matched=${pharmacy.matched}, shortage=${pharmacy.shortage}`);
  });

  // 不足がある薬局のみを配列で返す
  const shortagePharmacies = Object.values(pharmacyNeeds).filter(
    pharmacy => pharmacy.shortage > 0
  );

  console.log('✅ 不足薬局数:', shortagePharmacies.length);
  console.log('不足薬局リスト:', shortagePharmacies.map(p => `${p.name} (${p.store_name})`));

  return shortagePharmacies;
};
