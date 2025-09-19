-- Insert test data for shift_requests and shift_postings
-- This will help test the matching functionality

-- First, ensure we have some user_profiles to reference
INSERT INTO user_profiles (id, name, user_type, email) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'テスト薬剤師1', 'pharmacist', 'pharmacist1@test.com'),
('550e8400-e29b-41d4-a716-446655440002', 'テスト薬剤師2', 'pharmacist', 'pharmacist2@test.com'),
('550e8400-e29b-41d4-a716-446655440003', 'テスト薬局1', 'pharmacy', 'pharmacy1@test.com'),
('550e8400-e29b-41d4-a716-446655440004', 'テスト薬局2', 'pharmacy', 'pharmacy2@test.com')
ON CONFLICT (id) DO NOTHING;

-- Insert test shift requests
INSERT INTO shift_requests (pharmacist_id, date, time_slot, priority, start_time, end_time, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', '2025-01-15', 'morning', 'high', '09:00:00', '13:00:00', 'pending'),
('550e8400-e29b-41d4-a716-446655440001', '2025-01-16', 'afternoon', 'medium', '13:00:00', '18:00:00', 'pending'),
('550e8400-e29b-41d4-a716-446655440002', '2025-01-15', 'morning', 'high', '09:00:00', '13:00:00', 'pending'),
('550e8400-e29b-41d4-a716-446655440002', '2025-01-17', 'afternoon', 'low', '13:00:00', '18:00:00', 'pending')
ON CONFLICT DO NOTHING;

-- Insert test shift postings
INSERT INTO shift_postings (pharmacy_id, date, time_slot, required_staff, start_time, end_time, status) VALUES
('550e8400-e29b-41d4-a716-446655440003', '2025-01-15', 'morning', 2, '09:00:00', '13:00:00', 'recruiting'),
('550e8400-e29b-41d4-a716-446655440003', '2025-01-16', 'afternoon', 1, '13:00:00', '18:00:00', 'recruiting'),
('550e8400-e29b-41d4-a716-446655440004', '2025-01-15', 'morning', 1, '09:00:00', '13:00:00', 'recruiting'),
('550e8400-e29b-41d4-a716-446655440004', '2025-01-17', 'afternoon', 1, '13:00:00', '18:00:00', 'recruiting')
ON CONFLICT DO NOTHING;
