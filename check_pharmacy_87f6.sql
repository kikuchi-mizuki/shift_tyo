SELECT id, pharmacy_id, date, time_slot, start_time, end_time, store_name FROM shift_postings WHERE date = '2025-01-27' AND pharmacy_id LIKE '%87f6%' ORDER BY start_time;
