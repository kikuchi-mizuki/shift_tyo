-- 最近作成されたペンディングマッチを確認
SELECT
  date,
  status,
  pharmacist_id,
  pharmacy_id,
  created_at
FROM assigned_shifts
WHERE status = 'pending'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
