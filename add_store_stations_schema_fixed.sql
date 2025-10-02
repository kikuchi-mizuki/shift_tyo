/*
  # 店舗毎の最寄駅情報を管理するテーブル（修正版）
  
  Supabase対応版 - PostGISの代わりに標準的な地理空間関数を使用
*/

-- 店舗毎の最寄駅情報テーブルを作成
CREATE TABLE IF NOT EXISTS store_stations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  nearest_station_name text NOT NULL,
  nearest_station_code text,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(pharmacy_id, store_name)
);

-- RLSを有効化
ALTER TABLE store_stations ENABLE ROW LEVEL SECURITY;

-- RLSポリシーを作成
CREATE POLICY "Pharmacies can view their store stations" ON store_stations
  FOR SELECT USING (auth.uid() = pharmacy_id);

CREATE POLICY "Pharmacies can insert their store stations" ON store_stations
  FOR INSERT WITH CHECK (auth.uid() = pharmacy_id);

CREATE POLICY "Pharmacies can update their store stations" ON store_stations
  FOR UPDATE USING (auth.uid() = pharmacy_id);

CREATE POLICY "Pharmacies can delete their store stations" ON store_stations
  FOR DELETE USING (auth.uid() = pharmacy_id);

-- 管理者は全ての店舗駅情報を管理可能
CREATE POLICY "Admins can manage all store stations" ON store_stations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- インデックスを作成（PostGISなし版）
CREATE INDEX IF NOT EXISTS idx_store_stations_pharmacy_id ON store_stations(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_store_stations_store_name ON store_stations(store_name);
CREATE INDEX IF NOT EXISTS idx_store_stations_lat_lon ON store_stations(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 更新日時トリガーを追加
CREATE TRIGGER update_store_stations_updated_at
  BEFORE UPDATE ON store_stations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 駅情報から座標を自動取得する関数
CREATE OR REPLACE FUNCTION update_store_station_coordinates()
RETURNS TRIGGER AS $$
BEGIN
  -- 駅情報から座標を取得
  IF NEW.nearest_station_name IS NOT NULL THEN
    SELECT latitude, longitude INTO NEW.latitude, NEW.longitude
    FROM stations 
    WHERE station_name ILIKE '%' || NEW.nearest_station_name || '%'
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 座標自動取得トリガー
CREATE TRIGGER trigger_update_store_station_coordinates
  BEFORE INSERT OR UPDATE ON store_stations
  FOR EACH ROW
  EXECUTE FUNCTION update_store_station_coordinates();

-- コメントを追加
COMMENT ON TABLE store_stations IS '店舗毎の最寄駅情報';
COMMENT ON COLUMN store_stations.pharmacy_id IS '薬局のユーザーID';
COMMENT ON COLUMN store_stations.store_name IS '店舗名';
COMMENT ON COLUMN store_stations.nearest_station_name IS '最寄駅名';
COMMENT ON COLUMN store_stations.nearest_station_code IS '駅コード';
COMMENT ON COLUMN store_stations.latitude IS '緯度（駅情報から自動取得）';
COMMENT ON COLUMN store_stations.longitude IS '経度（駅情報から自動取得）';
