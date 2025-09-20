-- AI Matching System Tables
-- マッチング結果の記録と学習データの保存用テーブル

-- マッチング結果テーブル
CREATE TABLE IF NOT EXISTS match_outcomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacist_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  satisfaction_score DECIMAL(3,2) CHECK (satisfaction_score >= 0 AND satisfaction_score <= 5),
  efficiency_score DECIMAL(3,2) CHECK (efficiency_score >= 0 AND efficiency_score <= 5),
  feedback TEXT,
  completion_time TIMESTAMP,
  no_show BOOLEAN DEFAULT false,
  early_leave BOOLEAN DEFAULT false,
  additional_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_match_outcomes_pharmacist_id ON match_outcomes(pharmacist_id);
CREATE INDEX IF NOT EXISTS idx_match_outcomes_pharmacy_id ON match_outcomes(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_match_outcomes_date ON match_outcomes(date);
CREATE INDEX IF NOT EXISTS idx_match_outcomes_success ON match_outcomes(success);

-- 学習データテーブル
CREATE TABLE IF NOT EXISTS learning_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  input_data JSONB NOT NULL,
  output_data JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_learning_data_input ON learning_data USING GIN (input_data);
CREATE INDEX IF NOT EXISTS idx_learning_data_output ON learning_data USING GIN (output_data);
CREATE INDEX IF NOT EXISTS idx_learning_data_created_at ON learning_data(created_at);

-- 薬剤師プロファイル拡張テーブル
CREATE TABLE IF NOT EXISTS pharmacist_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  skills TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  preferred_pharmacy_types TEXT[] DEFAULT '{}',
  max_commute_time INTEGER DEFAULT 60, -- 分単位
  preferred_time_slots TEXT[] DEFAULT '{}',
  total_shifts INTEGER DEFAULT 0,
  average_satisfaction DECIMAL(3,2) DEFAULT 0 CHECK (average_satisfaction >= 0 AND average_satisfaction <= 5),
  completion_rate DECIMAL(3,2) DEFAULT 1.0 CHECK (completion_rate >= 0 AND completion_rate <= 1),
  no_show_rate DECIMAL(3,2) DEFAULT 0 CHECK (no_show_rate >= 0 AND no_show_rate <= 1),
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 薬局プロファイル拡張テーブル
CREATE TABLE IF NOT EXISTS pharmacy_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  pharmacy_type VARCHAR(50) DEFAULT 'community',
  pharmacy_size VARCHAR(20) DEFAULT 'medium',
  specialties TEXT[] DEFAULT '{}',
  required_skills TEXT[] DEFAULT '{}',
  experience_level VARCHAR(20) DEFAULT 'intermediate',
  special_needs TEXT[] DEFAULT '{}',
  average_pharmacist_satisfaction DECIMAL(3,2) DEFAULT 0 CHECK (average_pharmacist_satisfaction >= 0 AND average_pharmacist_satisfaction <= 5),
  retention_rate DECIMAL(3,2) DEFAULT 1.0 CHECK (retention_rate >= 0 AND retention_rate <= 1),
  work_environment DECIMAL(3,2) DEFAULT 0 CHECK (work_environment >= 0 AND work_environment <= 5),
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_pharmacist_profiles_user_id ON pharmacist_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_profiles_user_id ON pharmacy_profiles(user_id);

-- マッチング履歴テーブル
CREATE TABLE IF NOT EXISTS matching_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  matching_type VARCHAR(20) NOT NULL, -- 'rule_based', 'ai_based', 'hybrid'
  total_requests INTEGER DEFAULT 0,
  total_postings INTEGER DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  average_compatibility_score DECIMAL(3,2) DEFAULT 0,
  execution_time_ms INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_matching_history_date ON matching_history(date);
CREATE INDEX IF NOT EXISTS idx_matching_history_type ON matching_history(matching_type);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーの作成
CREATE TRIGGER update_match_outcomes_updated_at BEFORE UPDATE ON match_outcomes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pharmacist_profiles_updated_at BEFORE UPDATE ON pharmacist_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pharmacy_profiles_updated_at BEFORE UPDATE ON pharmacy_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- DISABLED: サンプルデータの挿入（既存のuser_profilesから）
-- INSERT INTO pharmacist_profiles (user_id, skills, experience_years, rating, preferred_pharmacy_types, max_commute_time, preferred_time_slots, total_shifts, average_satisfaction, completion_rate, no_show_rate)
SELECT 
  id,
  ARRAY['調剤', '服薬指導'] as skills,
  FLOOR(RANDOM() * 10) + 1 as experience_years,
  ROUND((RANDOM() * 2 + 3)::numeric, 1) as rating, -- 3.0-5.0の範囲
  ARRAY['community', 'hospital'] as preferred_pharmacy_types,
  FLOOR(RANDOM() * 60) + 30 as max_commute_time, -- 30-90分
  ARRAY['morning', 'afternoon', 'full'] as preferred_time_slots,
  FLOOR(RANDOM() * 100) + 10 as total_shifts,
  ROUND((RANDOM() * 2 + 3)::numeric, 1) as average_satisfaction,
  ROUND((RANDOM() * 0.2 + 0.8)::numeric, 2) as completion_rate, -- 0.8-1.0
  ROUND((RANDOM() * 0.1)::numeric, 2) as no_show_rate -- 0-0.1
FROM user_profiles 
WHERE user_type = 'pharmacist'
ON CONFLICT (user_id) DO NOTHING;

-- INSERT INTO pharmacy_profiles (user_id, pharmacy_type, pharmacy_size, specialties, required_skills, experience_level, special_needs, average_pharmacist_satisfaction, retention_rate, work_environment)
SELECT 
  id,
  CASE 
    WHEN RANDOM() < 0.6 THEN 'community'
    WHEN RANDOM() < 0.8 THEN 'hospital'
    ELSE 'clinic'
  END as pharmacy_type,
  CASE 
    WHEN RANDOM() < 0.3 THEN 'small'
    WHEN RANDOM() < 0.7 THEN 'medium'
    ELSE 'large'
  END as pharmacy_size,
  ARRAY['一般調剤', '在宅医療'] as specialties,
  ARRAY['調剤', '服薬指導', '在宅医療'] as required_skills,
  CASE 
    WHEN RANDOM() < 0.3 THEN 'junior'
    WHEN RANDOM() < 0.7 THEN 'intermediate'
    ELSE 'senior'
  END as experience_level,
  ARRAY['多言語対応', '小児科対応'] as special_needs,
  ROUND((RANDOM() * 2 + 3)::numeric, 1) as average_pharmacist_satisfaction,
  ROUND((RANDOM() * 0.3 + 0.7)::numeric, 2) as retention_rate, -- 0.7-1.0
  ROUND((RANDOM() * 2 + 3)::numeric, 1) as work_environment
FROM user_profiles 
WHERE user_type = 'pharmacy'
ON CONFLICT (user_id) DO NOTHING;

-- DISABLED: 既存の確定シフトからマッチング結果を生成
-- INSERT INTO match_outcomes (pharmacist_id, pharmacy_id, date, start_time, end_time, success, satisfaction_score, efficiency_score, feedback, completion_time, no_show, early_leave)
SELECT 
  pharmacist_id,
  pharmacy_id,
  date,
  start_time::TIME,
  end_time::TIME,
  true as success,
  ROUND((RANDOM() * 2 + 3)::numeric, 1) as satisfaction_score, -- 3.0-5.0
  ROUND((RANDOM() * 2 + 3)::numeric, 1) as efficiency_score, -- 3.0-5.0
  'AIマッチングシステムによる自動生成データ' as feedback,
  NOW() as completion_time,
  false as no_show,
  false as early_leave
FROM assigned_shifts 
WHERE status = 'confirmed'
ON CONFLICT DO NOTHING;

-- DISABLED: 学習データの生成
-- INSERT INTO learning_data (input_data, output_data, metadata)
SELECT 
  jsonb_build_object(
    'pharmacist_id', pharmacist_id,
    'pharmacy_id', pharmacy_id,
    'date', date,
    'start_time', start_time,
    'end_time', end_time,
    'day_of_week', EXTRACT(DOW FROM date),
    'is_weekend', EXTRACT(DOW FROM date) IN (0, 6),
    'season', CASE 
      WHEN EXTRACT(MONTH FROM date) BETWEEN 3 AND 5 THEN 'spring'
      WHEN EXTRACT(MONTH FROM date) BETWEEN 6 AND 8 THEN 'summer'
      WHEN EXTRACT(MONTH FROM date) BETWEEN 9 AND 11 THEN 'autumn'
      ELSE 'winter'
    END
  ) as input_data,
  jsonb_build_object(
    'success', success,
    'satisfaction', satisfaction_score,
    'efficiency', efficiency_score
  ) as output_data,
  jsonb_build_object(
    'version', '1.0',
    'generated_at', NOW(),
    'source', 'historical_data'
  ) as metadata
FROM match_outcomes
WHERE success = true;

-- DISABLED: マッチング履歴の生成
-- INSERT INTO matching_history (date, matching_type, total_requests, total_postings, matched_count, success_rate, average_compatibility_score, execution_time_ms, metadata)
SELECT 
  date,
  'rule_based' as matching_type,
  FLOOR(RANDOM() * 20) + 5 as total_requests,
  FLOOR(RANDOM() * 15) + 3 as total_postings,
  FLOOR(RANDOM() * 10) + 2 as matched_count,
  ROUND((RANDOM() * 0.3 + 0.7)::numeric, 2) as success_rate, -- 0.7-1.0
  ROUND((RANDOM() * 0.3 + 0.7)::numeric, 2) as average_compatibility_score, -- 0.7-1.0
  FLOOR(RANDOM() * 5000) + 1000 as execution_time_ms, -- 1-6秒
  jsonb_build_object(
    'algorithm_version', '1.0',
    'notes', 'Historical matching data'
  ) as metadata
FROM (
  SELECT DISTINCT date FROM match_outcomes
) dates;

-- 権限の設定
GRANT ALL ON match_outcomes TO authenticated;
GRANT ALL ON learning_data TO authenticated;
GRANT ALL ON pharmacist_profiles TO authenticated;
GRANT ALL ON pharmacy_profiles TO authenticated;
GRANT ALL ON matching_history TO authenticated;

-- RLS (Row Level Security) の設定
ALTER TABLE match_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_history ENABLE ROW LEVEL SECURITY;

-- RLS ポリシーの作成
CREATE POLICY "Users can view their own match outcomes" ON match_outcomes
  FOR SELECT USING (auth.uid() = pharmacist_id OR auth.uid() = pharmacy_id);

CREATE POLICY "Users can view their own profiles" ON pharmacist_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own profiles" ON pharmacy_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all data" ON match_outcomes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can view all data" ON learning_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can view all data" ON pharmacist_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can view all data" ON pharmacy_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can view all data" ON matching_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );
