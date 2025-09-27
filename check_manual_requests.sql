SELECT id, pharmacist_id, date, time_slot, start_time, end_time, memo FROM shift_requests WHERE date = '2025-01-27' AND memo LIKE '%手動選択%' ORDER BY created_at DESC LIMIT 5;
