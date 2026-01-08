import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

interface PasswordResetRequestProps {
  onBack: () => void;
  userType?: 'admin' | 'general';
}

export const PasswordResetRequest: React.FC<PasswordResetRequestProps> = ({
  onBack,
  userType = 'general'
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // パスワードリセットメールを送信
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message || 'パスワードリセットメールの送信に失敗しました');
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (error) {
      console.error('Password reset error:', error);
      setError('処理中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                メールを送信しました
              </h2>
              <p className="text-gray-600 mb-6">
                パスワードリセット用のリンクを <strong>{email}</strong> に送信しました。
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>次の手順:</strong>
                </p>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>メールボックスを確認してください</li>
                  <li>パスワードリセット用のリンクをクリック</li>
                  <li>新しいパスワードを設定してください</li>
                </ol>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                メールが届かない場合は、迷惑メールフォルダもご確認ください。
              </p>
              <button
                onClick={onBack}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>ログイン画面に戻る</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* ヘッダー */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-lg ${
              userType === 'admin'
                ? 'bg-gradient-to-br from-purple-500 to-indigo-500'
                : 'bg-gradient-to-br from-blue-500 to-blue-600'
            }`}>
              <Mail className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">AIシフトマネージャー</h1>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            パスワードリセット
          </h2>
          <p className="text-gray-600 text-sm">
            登録済みのメールアドレスを入力してください
          </p>
        </div>

        {/* リセット申請フォーム */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* メールアドレス */}
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="example@email.com"
                disabled={loading}
              />
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Mail className="w-4 h-4" />
              <span>{loading ? '送信中...' : 'リセットメールを送信'}</span>
            </button>
          </form>

          {/* 戻るボタン */}
          <div className="mt-4">
            <button
              onClick={onBack}
              className="w-full text-gray-600 hover:text-gray-800 text-sm flex items-center justify-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ログイン画面に戻る</span>
            </button>
          </div>
        </div>

        {/* 注意事項 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-yellow-800 text-sm font-medium mb-1">ご注意</p>
              <p className="text-yellow-700 text-xs">
                登録されていないメールアドレスを入力した場合でも、セキュリティのため同じメッセージが表示されます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
