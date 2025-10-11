-- LINE APIの包括的なテスト
-- このクエリをSupabase SQL Editorで実行してください

-- 1. LINE設定を確認
SELECT 
    'LINE_CHANNEL_ACCESS_TOKEN' as setting_name,
    CASE 
        WHEN current_setting('app.settings.line_channel_access_token', true) IS NOT NULL 
        THEN 'Set (length: ' || LENGTH(current_setting('app.settings.line_channel_access_token', true)) || ')'
        ELSE 'Not set'
    END as status;

-- 2. 環境変数の確認（可能な場合）
-- 注意: 実際のトークン値は表示されません（セキュリティ上）
SELECT 
    'Environment check' as info,
    'Check Supabase Dashboard > Settings > Environment Variables' as instruction;

-- 3. 実際のユーザーでLINE APIテストを実行
-- 注意: このクエリは実際のLINE APIを呼び出します
DO $$
DECLARE
    test_user_id TEXT;
    test_line_user_id TEXT;
    test_message TEXT;
    api_url TEXT;
    token TEXT;
    response JSONB;
BEGIN
    -- テスト用のユーザーを取得
    SELECT id, line_user_id 
    INTO test_user_id, test_line_user_id
    FROM user_profiles 
    WHERE user_type = 'pharmacist' 
        AND line_user_id IS NOT NULL 
        AND line_user_id != ''
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No pharmacist with LINE User ID found';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with user: % (LINE ID: %)', test_user_id, test_line_user_id;
    
    -- LINE API URL
    api_url := 'https://api.line.me/v2/bot/message/push';
    
    -- テストメッセージ
    test_message := '緊急シフト募集テスト - ' || NOW()::text;
    
    -- LINE APIを直接呼び出し
    -- 注意: 実際のトークンは環境変数から取得する必要があります
    BEGIN
        SELECT content INTO response
        FROM http((
            'POST',
            api_url,
            ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.settings.line_channel_access_token', true))],
            'application/json',
            json_build_object(
                'to', test_line_user_id,
                'messages', ARRAY[json_build_object(
                    'type', 'text',
                    'text', test_message
                )]
            )::text
        ));
        
        RAISE NOTICE 'LINE API Response: %', response;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'LINE API Error: %', SQLERRM;
    END;
    
END $$;
