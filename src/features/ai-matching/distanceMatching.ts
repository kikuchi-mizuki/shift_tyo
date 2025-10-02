/**
 * 距離ベースのマッチング機能
 * 最寄駅情報を使用して薬剤師と薬局の距離を計算し、マッチングの優先度を決定
 */

import { supabase } from '../../lib/supabase';

export interface StationInfo {
  station_name: string;
  station_code: string;
  latitude: number;
  longitude: number;
}

export interface UserLocation {
  user_id: string;
  nearest_station_name: string;
  nearest_station_code: string;
  latitude?: number;
  longitude?: number;
  max_commute_time: number;
}

/**
 * 駅情報を取得
 */
export const getStationInfo = async (stationName: string): Promise<StationInfo | null> => {
  try {
    const { data, error } = await supabase
      .from('stations')
      .select('*')
      .ilike('station_name', `%${stationName}%`)
      .limit(1)
      .single();

    if (error || !data) {
      console.warn(`Station not found: ${stationName}`);
      return null;
    }

    return {
      station_name: data.station_name,
      station_code: data.station_code,
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude)
    };
  } catch (error) {
    console.error('Error fetching station info:', error);
    return null;
  }
};

/**
 * 2点間の距離を計算（ハバサイン公式）
 */
export const calculateDistance = (
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number => {
  const R = 6371; // 地球の半径（km）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * 通勤時間を推定（距離から）
 */
export const estimateCommuteTime = (distanceKm: number): number => {
  // 平均的な通勤速度を考慮（電車 + 徒歩）
  // 距離が短い場合は徒歩、長い場合は電車を想定
  if (distanceKm <= 2) {
    return Math.round(distanceKm * 12); // 徒歩 5km/h
  } else if (distanceKm <= 10) {
    return Math.round(distanceKm * 3); // 電車 20km/h
  } else {
    return Math.round(distanceKm * 2.5); // 電車 24km/h
  }
};

/**
 * 薬剤師と薬局の距離ベーススコアを計算
 */
export const calculateDistanceScore = async (
  pharmacist: UserLocation,
  pharmacy: UserLocation
): Promise<number> => {
  try {
    // 薬剤師の最寄駅情報を取得
    const pharmacistStation = await getStationInfo(pharmacist.nearest_station_name);
    if (!pharmacistStation) {
      console.warn(`Pharmacist station not found: ${pharmacist.nearest_station_name}`);
      return 0.5; // デフォルトスコア
    }

    // 薬局の最寄駅情報を取得
    const pharmacyStation = await getStationInfo(pharmacy.nearest_station_name);
    if (!pharmacyStation) {
      console.warn(`Pharmacy station not found: ${pharmacy.nearest_station_name}`);
      return 0.5; // デフォルトスコア
    }

    // まず公共交通の所要時間（Edge Function + キャッシュ）を試す
    let estimatedCommuteTime: number | null = null;
    try {
      const resp = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_transit_time',
          origin: pharmacistStation.station_name,
          destination: pharmacyStation.station_name
        })
      });
      const json = await resp.json();
      if (json && typeof json.minutes === 'number') {
        estimatedCommuteTime = json.minutes;
      }
    } catch (_) {}

    // 失敗時は直線距離→擬似通勤時間にフォールバック
    if (!estimatedCommuteTime) {
      const distance = calculateDistance(
        pharmacistStation.latitude, pharmacistStation.longitude,
        pharmacyStation.latitude, pharmacyStation.longitude
      );
      estimatedCommuteTime = estimateCommuteTime(distance);
    }

    // 薬剤師の最大通勤時間と比較
    if (estimatedCommuteTime > pharmacist.max_commute_time) {
      return 0.1; // 通勤時間が長すぎる場合は低スコア
    }

    // 通勤時間に基づくスコア（短いほど高い）
    // 0〜90分を主レンジとして正規化
    const normalized = Math.max(0, Math.min(90, estimatedCommuteTime));
    const timeScore = 1.0 - normalized / 90; // 0〜1
    const finalScore = Math.max(0.1, timeScore);
    
    console.log(`Distance matching: ${pharmacist.user_id} -> ${pharmacy.user_id}`);
    console.log(`Commute time (min): ${estimatedCommuteTime}`);
    console.log(`Final score (time-based): ${finalScore.toFixed(2)}`);

    return Math.max(0.1, Math.min(1.0, finalScore));
  } catch (error) {
    console.error('Error calculating distance score:', error);
    return 0.5; // エラー時はデフォルトスコア
  }
};

/**
 * 店舗毎の最寄駅情報を取得
 */
export const getStoreStationInfo = async (pharmacyId: string, storeName: string): Promise<StationInfo | null> => {
  try {
    const { data, error } = await supabase
      .from('store_stations')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .eq('store_name', storeName)
      .single();

    if (error || !data) {
      console.warn(`Store station not found: ${pharmacyId} - ${storeName}`);
      return null;
    }

    return {
      station_name: data.nearest_station_name,
      station_code: data.nearest_station_code,
      latitude: parseFloat(data.latitude || '0'),
      longitude: parseFloat(data.longitude || '0')
    };
  } catch (error) {
    console.error('Error fetching store station info:', error);
    return null;
  }
};

/**
 * 距離ベースのマッチング候補を生成（店舗毎対応）
 */
export const generateDistanceBasedMatches = async (
  requests: any[],
  postings: any[],
  userProfiles: any
): Promise<any[]> => {
  const matches: any[] = [];
  const usedPharmacists = new Set<string>();
  const pharmacyUsageCount = new Map<string, number>();

  // 薬剤師の位置情報を収集
  const pharmacistLocations: UserLocation[] = [];
  for (const request of requests) {
    const profile = userProfiles[request.pharmacist_id];
    if (profile && profile.nearest_station_name) {
      pharmacistLocations.push({
        user_id: request.pharmacist_id,
        nearest_station_name: profile.nearest_station_name,
        nearest_station_code: profile.nearest_station_code || '',
        latitude: profile.location_latitude,
        longitude: profile.location_longitude,
        max_commute_time: profile.max_commute_time || 60
      });
    }
  }

  // 距離ベースのスコアを計算してマッチング候補を生成
  const scoredMatches: Array<{ match: any; score: number }> = [];

  for (const request of requests) {
    const pharmacistLocation = pharmacistLocations.find(p => p.user_id === request.pharmacist_id);
    if (!pharmacistLocation) continue;

    for (const posting of postings) {
      // 基本的な互換性チェック
      if (request.date !== posting.date) continue;
      if (request.time_slot !== posting.time_slot) continue;

      // 店舗毎の最寄駅情報を取得
      const storeStation = await getStoreStationInfo(posting.pharmacy_id, posting.store_name || '');
      if (!storeStation) {
        // 店舗毎の最寄駅情報がない場合は、薬局全体の最寄駅情報を使用
        const profile = userProfiles[posting.pharmacy_id];
        if (!profile || !profile.nearest_station_name) continue;
        
        const pharmacyLocation: UserLocation = {
          user_id: posting.pharmacy_id,
          nearest_station_name: profile.nearest_station_name,
          nearest_station_code: profile.nearest_station_code || '',
          latitude: profile.location_latitude,
          longitude: profile.location_longitude,
          max_commute_time: 0
        };
        
        const distanceScore = await calculateDistanceScore(pharmacistLocation, pharmacyLocation);
        
        if (distanceScore > 0.3) {
          scoredMatches.push({
            match: {
              pharmacist_id: request.pharmacist_id,
              pharmacy_id: posting.pharmacy_id,
              date: posting.date,
              time_slot: posting.time_slot,
              start_time: posting.start_time,
              end_time: posting.end_time,
              status: 'confirmed',
              store_name: posting.store_name || '',
              memo: `Distance-based matching (pharmacy): ${distanceScore.toFixed(2)} score`,
              compatibility_score: distanceScore,
              distance_score: distanceScore
            },
            score: distanceScore
          });
        }
      } else {
        // 店舗毎の最寄駅情報を使用
        const pharmacyLocation: UserLocation = {
          user_id: posting.pharmacy_id,
          nearest_station_name: storeStation.station_name,
          nearest_station_code: storeStation.station_code,
          latitude: storeStation.latitude,
          longitude: storeStation.longitude,
          max_commute_time: 0
        };
        
        const distanceScore = await calculateDistanceScore(pharmacistLocation, pharmacyLocation);
        
        if (distanceScore > 0.3) {
          scoredMatches.push({
            match: {
              pharmacist_id: request.pharmacist_id,
              pharmacy_id: posting.pharmacy_id,
              date: posting.date,
              time_slot: posting.time_slot,
              start_time: posting.start_time,
              end_time: posting.end_time,
              status: 'confirmed',
              store_name: posting.store_name || '',
              memo: `Distance-based matching (store): ${distanceScore.toFixed(2)} score`,
              compatibility_score: distanceScore,
              distance_score: distanceScore
            },
            score: distanceScore
          });
        }
      }
    }
  }

  // スコア順にソート
  scoredMatches.sort((a, b) => b.score - a.score);

  // 最適な組み合わせを選択
  for (const { match } of scoredMatches) {
    const uniqueKey = `${match.pharmacy_id}_${match.store_name || 'default'}`;
    const currentUsage = pharmacyUsageCount.get(uniqueKey) || 0;
    const requiredStaff = postings.find(p => p.pharmacy_id === match.pharmacy_id && p.store_name === match.store_name)?.required_staff || 1;
    
    if (
      !usedPharmacists.has(match.pharmacist_id) &&
      currentUsage < requiredStaff
    ) {
      matches.push(match);
      usedPharmacists.add(match.pharmacist_id);
      pharmacyUsageCount.set(uniqueKey, currentUsage + 1);
    }
  }

  console.log(`Distance-based matching generated ${matches.length} matches`);
  return matches;
};
