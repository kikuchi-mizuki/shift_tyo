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

    // まずキャッシュから所要時間を確認
    let estimatedCommuteTime: number | null = null;
    try {
      console.log(`🔍 キャッシュ確認: ${pharmacistStation.station_name} -> ${pharmacyStation.station_name}`);
      
      const { data: cached, error: cacheError } = await supabase
        .from('station_travel_times')
        .select('minutes')
        .eq('origin_station_name', pharmacistStation.station_name)
        .eq('dest_station_name', pharmacyStation.station_name)
        .eq('provider', 'google')
        .maybeSingle();
      
      if (!cacheError && cached?.minutes) {
        estimatedCommuteTime = cached.minutes;
        console.log(`✅ キャッシュから取得: ${pharmacistStation.station_name} -> ${pharmacyStation.station_name} = ${cached.minutes} minutes`);
      } else {
        console.log(`📝 キャッシュなし: ${pharmacistStation.station_name} -> ${pharmacyStation.station_name}`);
        
        // キャッシュがない場合は直線距離計算を使用
        console.log(`🔄 フォールバック: 直線距離計算を使用`);
        const distance = calculateDistance(
          pharmacistStation.latitude, pharmacistStation.longitude,
          pharmacyStation.latitude, pharmacyStation.longitude
        );
        estimatedCommuteTime = estimateCommuteTime(distance);
        console.log(`📏 直線距離: ${distance.toFixed(2)}km, 推定時間: ${estimatedCommuteTime}分`);
        
        // 計算結果をデータベースに保存
        try {
          const { error: saveError } = await supabase
            .from('station_travel_times')
            .upsert({
              origin_station_name: pharmacistStation.station_name,
              dest_station_name: pharmacyStation.station_name,
              provider: 'geodesic',
              minutes: estimatedCommuteTime,
              last_used_at: new Date().toISOString(),
            }, { onConflict: 'origin_station_name, dest_station_name, provider' });
          
          if (!saveError) {
            console.log(`💾 直線距離計算結果をデータベースに保存: ${estimatedCommuteTime}分`);
          } else {
            console.warn('❌ データベース保存エラー:', saveError);
          }
        } catch (saveError) {
          console.warn('❌ データベース保存例外:', saveError);
        }
      }
    } catch (error) {
      console.warn('❌ キャッシュ確認エラー:', error);
      console.warn('❌ エラー詳細:', error.message, error.stack);
    }

    // 最終フォールバック（上記で既に処理済みの場合はスキップ）
    if (!estimatedCommuteTime) {
      console.log(`🔄 最終フォールバック: 直線距離計算を使用`);
      const distance = calculateDistance(
        pharmacistStation.latitude, pharmacistStation.longitude,
        pharmacyStation.latitude, pharmacyStation.longitude
      );
      estimatedCommuteTime = estimateCommuteTime(distance);
      console.log(`📏 直線距離: ${distance.toFixed(2)}km, 推定時間: ${estimatedCommuteTime}分`);
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
  console.log(`🎯 距離ベースマッチング開始: 希望${requests.length}件, 募集${postings.length}件`);
  console.log(`👥 ユーザープロフィール数: ${Object.keys(userProfiles || {}).length}件`);
  
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
      console.log(`📍 薬剤師位置情報: ${profile.name} - ${profile.nearest_station_name}`);
    } else {
      console.log(`⚠️ 薬剤師位置情報なし: ${request.pharmacist_id}`);
    }
  }
  
  console.log(`📍 位置情報を持つ薬剤師: ${pharmacistLocations.length}件`);

  // 距離ベースのスコアを計算してマッチング候補を生成
  const scoredMatches: Array<{ match: any; score: number }> = [];
  
  if (pharmacistLocations.length === 0) {
    console.log(`⚠️ 位置情報を持つ薬剤師が0件のため、距離ベースマッチングをスキップ`);
    console.log(`🔍 デバッグ: 薬剤師プロフィール詳細:`, Object.keys(userProfiles).map(id => ({
      id,
      name: userProfiles[id]?.name,
      nearest_station_name: userProfiles[id]?.nearest_station_name,
      location_latitude: userProfiles[id]?.location_latitude,
      location_longitude: userProfiles[id]?.location_longitude
    })));
    return [];
  }

  console.log(`🔍 距離ベースマッチング詳細開始: 希望${requests.length}件, 募集${postings.length}件`);
  
  for (const request of requests) {
    const pharmacistLocation = pharmacistLocations.find(p => p.user_id === request.pharmacist_id);
    if (!pharmacistLocation) {
      console.log(`⚠️ 薬剤師位置情報なし: ${request.pharmacist_id}`);
      continue;
    }
    
    console.log(`📍 薬剤師処理開始: ${request.pharmacist_id} (${pharmacistLocation.nearest_station_name})`);

    for (const posting of postings) {
      // 基本的な互換性チェック
      if (request.date !== posting.date) continue;
      if (request.time_slot !== posting.time_slot) continue;
      
      console.log(`🏪 薬局処理開始: ${posting.pharmacy_id} (${posting.store_name || '店舗名なし'})`);

      // 店舗毎の最寄駅情報を取得
      const storeStation = await getStoreStationInfo(posting.pharmacy_id, posting.store_name || '');
      console.log(`🏪 店舗駅情報:`, storeStation ? `取得済み (${storeStation.station_name})` : 'なし');
      
      if (!storeStation) {
        // 店舗毎の最寄駅情報がない場合は、薬局全体の最寄駅情報を使用
        const profile = userProfiles[posting.pharmacy_id];
        console.log(`🏥 薬局プロフィール:`, profile ? `取得済み (${profile.nearest_station_name})` : 'なし');
        if (!profile || !profile.nearest_station_name) {
          console.log(`⚠️ 薬局位置情報なし: ${posting.pharmacy_id}`);
          continue;
        }
        
        const pharmacyLocation: UserLocation = {
          user_id: posting.pharmacy_id,
          nearest_station_name: profile.nearest_station_name,
          nearest_station_code: profile.nearest_station_code || '',
          latitude: profile.location_latitude,
          longitude: profile.location_longitude,
          max_commute_time: 0
        };
        
        const distanceScore = await calculateDistanceScore(pharmacistLocation, pharmacyLocation);
        console.log(`📊 距離スコア計算: ${distanceScore.toFixed(2)} (閾値: 0.3)`);
        
        if (distanceScore > 0.3) {
          console.log(`✅ マッチング成立: 薬剤師${request.pharmacist_id} ↔ 薬局${posting.pharmacy_id} (スコア: ${distanceScore.toFixed(2)})`);
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
              distance_score: distanceScore,
              algorithm: 'distance_based'
            },
            score: distanceScore
          });
        } else {
          console.log(`❌ マッチング不成立: スコアが閾値を下回る (${distanceScore.toFixed(2)} <= 0.3)`);
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

  console.log(`🎯 距離ベースマッチング完了: ${matches.length}件のマッチを生成`);
  console.log(`📊 マッチ詳細:`, matches.map(m => ({
    pharmacist: m.pharmacist_id,
    pharmacy: m.pharmacy_id,
    store: m.store_name,
    score: m.distance_score
  })));
  return matches;
};
