-- 緊急シフト募集で使用されるユーザーデータを詳細確認
-- このクエリをSupabase SQL Editorで実行してください

-- 1. 薬剤師ユーザーの詳細情報を確認
SELECT 
    id,
    name,
    email,
    user_type,
    line_user_id,
    line_notification_enabled,
    nearest_station_name,
    created_at,
    updated_at
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY name;

-- 2. LINE連携済みの薬剤師のみを確認
SELECT 
    id,
    name,
    email,
    line_user_id,
    line_notification_enabled,
    LENGTH(line_user_id) as line_user_id_length,
    CASE 
        WHEN line_user_id IS NULL THEN 'LINE User ID is NULL'
        WHEN line_user_id = '' THEN 'LINE User ID is empty string'
        WHEN LENGTH(line_user_id) < 10 THEN 'LINE User ID seems too short'
        ELSE 'LINE User ID looks valid'
    END as line_user_id_status
FROM user_profiles 
WHERE user_type = 'pharmacist' 
    AND line_user_id IS NOT NULL 
    AND line_user_id != ''
ORDER BY name;

-- 3. 通知設定を確認
SELECT 
    id,
    name,
    line_notification_enabled,
    line_user_id,
    CASE 
        WHEN line_notification_enabled = true AND line_user_id IS NOT NULL AND line_user_id != '' 
        THEN 'Ready for LINE notifications'
        WHEN line_notification_enabled = false 
        THEN 'LINE notifications disabled by user'
        WHEN line_user_id IS NULL OR line_user_id = '' 
        THEN 'No LINE User ID'
        ELSE 'Unknown status'
    END as notification_status
FROM user_profiles 
WHERE user_type = 'pharmacist'
ORDER BY notification_status, name;

-- 4. 緊急通知用の対象ユーザー（send-emergency-shiftと同じ条件）
SELECT 
    id,
    name,
    email,
    line_user_id,
    line_notification_enabled,
    nearest_station_name
FROM user_profiles 
WHERE user_type = 'pharmacist'
    AND line_user_id IS NOT NULL 
    AND line_user_id != ''
    -- 緊急通知の場合は通知設定を無視（send-line-notificationの修正後）
ORDER BY name;
