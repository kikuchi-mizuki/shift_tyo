-- マッチングロジックの修正提案
-- 現在の完全包含制約を部分適合に変更

-- 1. 現在のマッチング制約を確認
SELECT 
  'current_constraint' as analysis,
  '薬剤師の希望時間が薬局の募集時間を完全にカバーする必要' as constraint_description,
  'rs <= ps && re >= pe' as logic_condition;

-- 2. 部分適合マッチングの提案
SELECT 
  'proposed_constraint' as analysis,
  '薬剤師の希望時間と薬局の募集時間が重複する部分がある' as constraint_description,
  'rs < pe && re > ps' as logic_condition;

-- 3. 実際の時間重複を確認
SELECT 
  'time_overlap_analysis' as analysis,
  r.pharmacist_id,
  r.start_time as request_start,
  r.end_time as request_end,
  p.pharmacy_id,
  p.start_time as posting_start,
  p.end_time as posting_end,
  CASE 
    WHEN r.start_time <= p.start_time AND r.end_time >= p.end_time THEN '完全適合（現在の制約）'
    WHEN r.start_time < p.end_time AND r.end_time > p.start_time THEN '部分適合（提案）'
    ELSE '不適合'
  END as compatibility,
  CASE 
    WHEN r.start_time < p.end_time AND r.end_time > p.start_time THEN 
      CONCAT(
        '重複時間: ',
        GREATEST(r.start_time, p.start_time),
        ' - ',
        LEAST(r.end_time, p.end_time)
      )
    ELSE '重複なし'
  END as overlap_time
FROM shift_requests r
CROSS JOIN shift_postings p
WHERE r.date = '2025-10-01' 
  AND p.date = '2025-10-01'
ORDER BY compatibility DESC, r.pharmacist_id, p.pharmacy_id;
