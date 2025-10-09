import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, Check, X, Copy, ExternalLink } from 'lucide-react';

interface LineIntegrationProps {
  userId: string;
}

export const LineIntegration: React.FC<LineIntegrationProps> = ({ userId }) => {
  const [isLinked, setIsLinked] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [authCode, setAuthCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // LINE連携状態を確認
  useEffect(() => {
    checkLineStatus();
  }, [userId]);

  const checkLineStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('line_user_id, line_notification_enabled')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setIsLinked(!!data.line_user_id);
        setIsEnabled(data.line_notification_enabled ?? true);
      }
    } catch (error) {
      console.error('Error checking LINE status:', error);
    } finally {
      setLoading(false);
    }
  };

  // 認証コードを生成
  const generateAuthCode = async () => {
    setIsGenerating(true);
    try {
      // 6桁のランダムな英数字コードを生成
      const code = Array.from({ length: 6 }, () =>
        '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 36)]
      ).join('');

      // 有効期限は15分後
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      const { error } = await supabase
        .from('line_auth_codes')
        .insert([
          {
            user_id: userId,
            auth_code: code,
            expires_at: expiresAt.toISOString(),
          },
        ]);

      if (error) {
        console.error('Error generating auth code:', error);
        alert('認証コードの生成に失敗しました');
        return;
      }

      setAuthCode(code);
      setShowCode(true);
    } catch (error) {
      console.error('Error:', error);
      alert('エラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  // コピー機能
  const copyToClipboard = () => {
    navigator.clipboard.writeText(authCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // LINE連携を解除
  const unlinkLine = async () => {
    if (!confirm('LINE連携を解除しますか？\n通知を受け取れなくなります。')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          line_user_id: null,
          line_notification_enabled: false,
        })
        .eq('id', userId);

      if (error) {
        console.error('Error unlinking LINE:', error);
        alert('LINE連携の解除に失敗しました');
        return;
      }

      setIsLinked(false);
      setShowCode(false);
      setAuthCode('');
      alert('LINE連携を解除しました');
    } catch (error) {
      console.error('Error:', error);
      alert('エラーが発生しました');
    }
  };

  // 通知のON/OFF切り替え
  const toggleNotification = async () => {
    try {
      const newEnabled = !isEnabled;
      const { error } = await supabase
        .from('user_profiles')
        .update({ line_notification_enabled: newEnabled })
        .eq('id', userId);

      if (error) {
        console.error('Error toggling notification:', error);
        alert('通知設定の変更に失敗しました');
        return;
      }

      setIsEnabled(newEnabled);
    } catch (error) {
      console.error('Error:', error);
      alert('エラーが発生しました');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold">LINE通知設定</h3>
        </div>
        {isLinked && (
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-600 font-medium">連携済み</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {!isLinked ? (
          // 未連携の場合
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-2">
                LINE通知を設定すると、以下の通知を受け取れます：
              </p>
              <ul className="text-sm text-blue-700 space-y-1 ml-4 list-disc">
                <li>シフト確定の通知</li>
                <li>前日のリマインド</li>
                <li>緊急シフト募集</li>
              </ul>
            </div>

            {!showCode ? (
              <button
                onClick={generateAuthCode}
                disabled={isGenerating}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {isGenerating ? '生成中...' : 'LINE連携を開始する'}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">認証コード（15分間有効）</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white border-2 border-green-500 rounded-lg p-4 text-center">
                      <span className="text-3xl font-mono font-bold text-green-600 tracking-wider">
                        {authCode}
                      </span>
                    </div>
                    <button
                      onClick={copyToClipboard}
                      className="p-3 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                      title="コピー"
                    >
                      {copied ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-yellow-800 mb-2">次の手順で連携してください：</p>
                  <ol className="text-sm text-yellow-700 space-y-2 ml-4 list-decimal">
                    <li>下のボタンからLINE Botを友だち追加</li>
                    <li>Botのトーク画面で上記の認証コードを送信</li>
                    <li>連携完了のメッセージが届いたら完了！</li>
                  </ol>
                </div>

                <a
                  href="https://line.me/R/ti/p/@YOUR_LINE_BOT_ID"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#00B900] text-white py-3 px-4 rounded-lg hover:bg-[#00A000] transition-colors font-medium"
                >
                  <ExternalLink className="w-5 h-5" />
                  LINE Botを友だち追加
                </a>

                <button
                  onClick={() => {
                    setShowCode(false);
                    setAuthCode('');
                  }}
                  className="w-full text-gray-600 py-2 px-4 hover:text-gray-800 transition-colors text-sm"
                >
                  キャンセル
                </button>
              </div>
            )}
          </>
        ) : (
          // 連携済みの場合
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                LINE通知が有効になっています。シフトの確定や前日リマインドを受け取れます。
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">通知</p>
                <p className="text-sm text-gray-600">シフト確定・リマインド等の通知</p>
              </div>
              <button
                onClick={toggleNotification}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isEnabled ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <button
              onClick={unlinkLine}
              className="w-full flex items-center justify-center gap-2 text-red-600 py-2 px-4 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
            >
              <X className="w-4 h-4" />
              LINE連携を解除
            </button>
          </>
        )}
      </div>
    </div>
  );
};

