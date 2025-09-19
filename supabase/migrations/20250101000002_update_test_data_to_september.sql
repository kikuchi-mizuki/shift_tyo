-- Update test data to September 2025
-- Delete old test data from January 2025
DELETE FROM shift_requests WHERE date >= '2025-01-01' AND date < '2025-02-01';
DELETE FROM shift_postings WHERE date >= '2025-01-01' AND date < '2025-02-01';

-- Insert new test data for September 2025
INSERT INTO shift_requests (pharmacist_id, date, time_slot, priority, start_time, end_time, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', '2025-09-15', 'morning', 'high', '09:00:00', '13:00:00', 'pending'),
('550e8400-e29b-41d4-a716-446655440001', '2025-09-16', 'afternoon', 'medium', '13:00:00', '18:00:00', 'pending'),
('550e8400-e29b-41d4-a716-446655440002', '2025-09-15', 'morning', 'high', '09:00:00', '13:00:00', 'pending'),
('550e8400-e29b-41d4-a716-446655440002', '2025-09-17', 'afternoon', 'low', '13:00:00', '18:00:00', 'pending')
ON CONFLICT DO NOTHING;

INSERT INTO shift_postings (pharmacy_id, date, time_slot, required_staff, start_time, end_time, status) VALUES
('550e8400-e29b-41d4-a716-446655440003', '2025-09-15', 'morning', 2, '09:00:00', '13:00:00', 'recruiting'),
('550e8400-e29b-41d4-a716-446655440003', '2025-09-16', 'afternoon', 1, '13:00:00', '18:00:00', 'recruiting'),
('550e8400-e29b-41d4-a716-446655440004', '2025-09-15', 'morning', 1, '09:00:00', '13:00:00', 'recruiting'),
('550e8400-e29b-41d4-a716-446655440004', '2025-09-17', 'afternoon', 1, '13:00:00', '18:00:00', 'recruiting')
ON CONFLICT DO NOTHING;
