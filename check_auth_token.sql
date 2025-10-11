-- 認証トークンの確認と更新

-- 1. 現在の認証トークンの有効性を確認
-- 注意: 実際のトークンは環境変数や設定から取得する必要があります

-- 2. 新しい認証トークンでトリガー関数を更新するSQL
-- 以下のSQLで、YOUR_NEW_ANON_KEYを実際の新しいトークンに置き換えてください

/*
-- 認証トークンを更新するためのトリガー関数修正版
CREATE OR REPLACE FUNCTION notify_shift_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  pharmacist_record RECORD;
  pharmacy_record RECORD;
  time_info TEXT;
  pharmacist_message TEXT;
  formatted_date TEXT;
  response_status INTEGER;
  response_body TEXT;
BEGIN
  -- 既存のロジックは同じ...
  
  -- http拡張機能を使ってEdge Functionを直接呼び出し
  BEGIN
    SELECT status, content INTO response_status, response_body
    FROM http((
      'POST',
      'https://wjgterfwurmvosawzbjs.supabase.co/functions/v1/send-line-notification',
      ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer YOUR_NEW_ANON_KEY_HERE')  -- ここを新しいトークンに置き換え
      ],
      'application/json',
      json_build_object(
        'userId', NEW.pharmacist_id,
        'message', pharmacist_message,
        'notificationType', 'shift_confirmed',
        'metadata', json_build_object(
          'shiftDate', NEW.date,
          'timeSlot', NEW.time_slot,
          'storeName', NEW.store_name
        )
      )::text
    ));
    
    -- レスポンス処理...
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

-- 3. 手動でLINE通知をテストするためのSQL
-- 実際のユーザーIDとメッセージに置き換えてください
/*
SELECT http((
  'POST',
  'https://wjgterfwurmvosawzbjs.supabase.co/functions/v1/send-line-notification',
  ARRAY[
    http_header('Content-Type', 'application/json'),
    http_header('Authorization', 'Bearer YOUR_NEW_ANON_KEY_HERE')
  ],
  'application/json',
  json_build_object(
    'userId', 'YOUR_USER_ID_HERE',
    'message', 'テスト通知です',
    'notificationType', 'shift_confirmed'
  )::text
));
*/
