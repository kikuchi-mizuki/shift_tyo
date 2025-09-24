-- データベースの状況を確認するためのデバッグクエリ

-- 1. shift_postingsテーブルの制約を確認
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'shift_postings'::regclass;

-- 2. 重複している募集データを確認
SELECT 
    pharmacy_id,
    date,
    store_name,
    time_slot,
    status,
    COUNT(*) as duplicate_count,
    array_agg(id) as ids
FROM shift_postings 
GROUP BY pharmacy_id, date, store_name, time_slot, status
HAVING COUNT(*) > 1;

-- 3. 確定済みステータスの募集を確認
SELECT 
    id,
    pharmacy_id,
    date,
    store_name,
    time_slot,
    status,
    created_at,
    updated_at
FROM shift_postings 
WHERE status = 'confirmed'
ORDER BY date, pharmacy_id;

-- 4. ステータス別の募集数を確認
SELECT 
    status,
    COUNT(*) as count
FROM shift_postings 
GROUP BY status
ORDER BY status;

-- 5. 特定の日付の募集データを確認（例：2025-01-27）
SELECT 
    id,
    pharmacy_id,
    date,
    store_name,
    time_slot,
    status,
    start_time,
    end_time
FROM shift_postings 
WHERE date = '2025-01-27'
ORDER BY pharmacy_id, time_slot;
