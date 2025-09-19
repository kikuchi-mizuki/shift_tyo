-- シフト希望データの確認
SELECT COUNT(*) as total_requests FROM shift_requests;
SELECT COUNT(*) as requests_with_time FROM shift_requests WHERE start_time IS NOT NULL AND end_time IS NOT NULL;
SELECT id, pharmacist_id, date, time_slot, start_time, end_time FROM shift_requests WHERE start_time IS NOT NULL AND end_time IS NOT NULL LIMIT 5;

-- シフト募集データの確認
SELECT COUNT(*) as total_postings FROM shift_postings;
SELECT COUNT(*) as postings_with_time FROM shift_postings WHERE start_time IS NOT NULL AND end_time IS NOT NULL;
SELECT id, pharmacy_id, date, time_slot, start_time, end_time, required_staff FROM shift_postings WHERE start_time IS NOT NULL AND end_time IS NOT NULL LIMIT 5;
