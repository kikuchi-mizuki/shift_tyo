/*
  # station_travel_times: 駅間の所要時間キャッシュ

  - origin_station_name: 出発駅名（stations.station_nameと対応）
  - dest_station_name  : 到着駅名（stations.station_nameと対応）
  - provider          : 取得元（google/navitime/yahoo など）
  - minutes           : 所要時間（分）
  - last_used_at      : 直近で使用した日時（LRUメンテに利用）
*/

CREATE TABLE IF NOT EXISTS station_travel_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_station_name text NOT NULL,
  dest_station_name   text NOT NULL,
  provider            text NOT NULL DEFAULT 'google',
  minutes             integer NOT NULL CHECK (minutes > 0),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  last_used_at        timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_station_travel_times
  ON station_travel_times (lower(origin_station_name), lower(dest_station_name), lower(provider));

-- RLS（読み書きはEdge Functions/サーバーサイドから行う想定だが、一応認証ユーザーも読み取り可）
ALTER TABLE station_travel_times ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_travel_times" ON station_travel_times;
CREATE POLICY "read_travel_times" ON station_travel_times
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "write_travel_times_via_service" ON station_travel_times;
CREATE POLICY "write_travel_times_via_service" ON station_travel_times
  FOR ALL USING (
    -- auth無しのEdge Function(Service role) または 管理者
    (current_setting('request.jwt.claims', true)::jsonb ? 'role' AND (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

-- updated_atの自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_station_travel_times_updated_at ON station_travel_times;
CREATE TRIGGER trg_update_station_travel_times_updated_at
  BEFORE UPDATE ON station_travel_times
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

