-- マッチングスコア設定テーブル
-- 管理画面からスコアの重み（優先順位）を変更可能にする

CREATE TABLE IF NOT EXISTS matching_score_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- スコア要素の重み（0.0〜1.0、合計1.0）
  weight_rating NUMERIC(3,2) NOT NULL DEFAULT 0.30,
  weight_distance NUMERIC(3,2) NOT NULL DEFAULT 0.30,
  weight_request_count NUMERIC(3,2) NOT NULL DEFAULT 0.20,
  weight_acceptance_rate NUMERIC(3,2) NOT NULL DEFAULT 0.20,
  -- 希望回数のソート方向: 'asc' = 少ない方が優先, 'desc' = 多い方が優先
  request_count_order TEXT NOT NULL DEFAULT 'desc',
  -- メモ・説明
  description TEXT,
  -- 有効フラグ（1件のみ有効）
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 初期設定を挿入
INSERT INTO matching_score_config (
  weight_rating,
  weight_distance,
  weight_request_count,
  weight_acceptance_rate,
  request_count_order,
  description,
  is_active
) VALUES (
  0.30,
  0.30,
  0.20,
  0.20,
  'desc',
  'デフォルト設定: 評価30%, 距離30%, 応募回数20%, 承諾率20%',
  true
);

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_matching_score_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_matching_score_config_updated_at
  BEFORE UPDATE ON matching_score_config
  FOR EACH ROW
  EXECUTE FUNCTION update_matching_score_config_updated_at();

-- RLSを有効化
ALTER TABLE matching_score_config ENABLE ROW LEVEL SECURITY;

-- 管理者は読み書き可能
CREATE POLICY "Admin can manage matching_score_config"
  ON matching_score_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE matching_score_config IS 'マッチングスコアの重み設定。管理画面から変更可能。';
COMMENT ON COLUMN matching_score_config.weight_rating IS '薬剤師評価（評判）の重み';
COMMENT ON COLUMN matching_score_config.weight_distance IS '距離の重み';
COMMENT ON COLUMN matching_score_config.weight_request_count IS '応募回数の重み';
COMMENT ON COLUMN matching_score_config.weight_acceptance_rate IS '承諾率（お願いを受けてくれる率）の重み';
COMMENT ON COLUMN matching_score_config.request_count_order IS '応募回数の順序: desc=多い方が優先, asc=少ない方が優先';
