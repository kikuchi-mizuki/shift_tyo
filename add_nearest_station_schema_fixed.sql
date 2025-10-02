/*
  # 最寄駅機能のためのデータベーススキーマ拡張（修正版）
  
  Supabase対応版 - PostGISの代わりに標準的な地理空間関数を使用
*/

-- user_profilesテーブルに最寄駅関連カラムを追加
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS nearest_station_name text,
ADD COLUMN IF NOT EXISTS nearest_station_code text,
ADD COLUMN IF NOT EXISTS location_latitude decimal(10, 8),
ADD COLUMN IF NOT EXISTS location_longitude decimal(11, 8),
ADD COLUMN IF NOT EXISTS max_commute_time integer DEFAULT 60; -- 分単位

-- 駅情報テーブルを作成
CREATE TABLE IF NOT EXISTS stations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  station_name text NOT NULL,
  station_code text UNIQUE,
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  line_name text,
  prefecture text,
  city text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 駅情報のインデックスを作成（PostGISなし版）
CREATE INDEX IF NOT EXISTS idx_stations_name ON stations(station_name);
CREATE INDEX IF NOT EXISTS idx_stations_code ON stations(station_code);
CREATE INDEX IF NOT EXISTS idx_stations_lat_lon ON stations(latitude, longitude);

-- ユーザープロフィールの位置情報インデックス（PostGISなし版）
CREATE INDEX IF NOT EXISTS idx_user_profiles_lat_lon ON user_profiles(location_latitude, location_longitude)
WHERE location_latitude IS NOT NULL AND location_longitude IS NOT NULL;

-- コメントを追加
COMMENT ON COLUMN user_profiles.nearest_station_name IS '最寄駅名';
COMMENT ON COLUMN user_profiles.nearest_station_code IS '最寄駅コード';
COMMENT ON COLUMN user_profiles.location_latitude IS '緯度';
COMMENT ON COLUMN user_profiles.location_longitude IS '経度';
COMMENT ON COLUMN user_profiles.max_commute_time IS '最大通勤時間（分）';

-- 距離計算用の関数を作成（ハバサイン公式）
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 decimal, lon1 decimal, 
  lat2 decimal, lon2 decimal
) RETURNS decimal AS $$
DECLARE
  R decimal := 6371; -- 地球の半径（km）
  dLat decimal;
  dLon decimal;
  a decimal;
  c decimal;
BEGIN
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);
  
  a := sin(dLat/2) * sin(dLat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dLon/2) * sin(dLon/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- 通勤時間推定関数
CREATE OR REPLACE FUNCTION estimate_commute_time(distance_km decimal)
RETURNS integer AS $$
BEGIN
  -- 距離に基づく通勤時間推定（分）
  IF distance_km <= 2 THEN
    RETURN ROUND(distance_km * 12); -- 徒歩 5km/h
  ELSIF distance_km <= 10 THEN
    RETURN ROUND(distance_km * 3); -- 電車 20km/h
  ELSE
    RETURN ROUND(distance_km * 2.5); -- 電車 24km/h
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 最寄駅検索用の関数を作成
CREATE OR REPLACE FUNCTION find_nearby_stations(
  user_lat decimal,
  user_lon decimal,
  max_distance_km decimal DEFAULT 10
) RETURNS TABLE (
  station_name text,
  station_code text,
  distance_km decimal
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.station_name,
    s.station_code,
    calculate_distance(user_lat, user_lon, s.latitude, s.longitude) as distance_km
  FROM stations s
  WHERE calculate_distance(user_lat, user_lon, s.latitude, s.longitude) <= max_distance_km
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;
