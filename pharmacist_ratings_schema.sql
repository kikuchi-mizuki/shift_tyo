-- 薬剤師評価テーブル
CREATE TABLE IF NOT EXISTS pharmacist_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  pharmacist_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_shift_id UUID REFERENCES assigned_shifts(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pharmacy_id, pharmacist_id, assigned_shift_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_pharmacist_ratings_pharmacy_id ON pharmacist_ratings(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacist_ratings_pharmacist_id ON pharmacist_ratings(pharmacist_id);
CREATE INDEX IF NOT EXISTS idx_pharmacist_ratings_assigned_shift_id ON pharmacist_ratings(assigned_shift_id);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_pharmacist_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pharmacist_ratings_updated_at
  BEFORE UPDATE ON pharmacist_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_pharmacist_ratings_updated_at();

-- RLS (Row Level Security) の設定
ALTER TABLE pharmacist_ratings ENABLE ROW LEVEL SECURITY;

-- 薬局は自分の評価のみ閲覧・編集可能
CREATE POLICY "Pharmacies can view and edit their own ratings" ON pharmacist_ratings
  FOR ALL USING (pharmacy_id = auth.uid());

-- 薬剤師は自分の評価のみ閲覧可能
CREATE POLICY "Pharmacists can view their own ratings" ON pharmacist_ratings
  FOR SELECT USING (pharmacist_id = auth.uid());

-- 管理者は全ての評価を閲覧・編集可能
CREATE POLICY "Admins can view and edit all ratings" ON pharmacist_ratings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );
