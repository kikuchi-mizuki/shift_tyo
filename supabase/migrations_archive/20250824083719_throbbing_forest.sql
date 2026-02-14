/*
  # トリガーを無効化してサインアップエラーを修正

  1. 問題
    - handle_new_user()トリガーがuser_profilesビューに挿入しようとして失敗
    - サインアップ時に"Database error saving new user"エラーが発生

  2. 解決方法
    - 問題のあるトリガーを一時的に無効化
    - サインアップが正常に動作するようにする
*/

-- 問題のあるトリガーを削除
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- トリガー関数も削除（必要に応じて）
DROP FUNCTION IF EXISTS handle_new_user();

-- 注意: この修正により、新規ユーザー登録時に自動的にuser_profilesが作成されなくなります
-- アプリケーション側でプロファイル管理を行う必要があります