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
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // デバッグログを追加する関数
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setDebugLogs(prev => [...prev, logMessage]);
    console.log(logMessage);
  };

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
    setDebugLogs([]); // ログをリセット
    setShowDebugModal(true); // デバッグモーダルを表示
    
    try {
      addDebugLog('=== LINE認証コード生成開始 ===');
      
      // 認証状態を確認
      addDebugLog('認証状態を確認中...');
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      addDebugLog(`認証ユーザー: ${authUser ? '認証済み' : '未認証'}`);
      if (authUser) {
        addDebugLog(`認証ユーザーID: ${authUser.id}`);
      }
      addDebugLog(`PropsユーザーID: ${userId}`);
      if (authError) {
        addDebugLog(`認証エラー: ${authError.message}`);
      }

      if (!authUser) {
        addDebugLog('❌ 認証されていません');
        alert('認証されていません。ログインし直してください。');
        return;
      }

      // 6桁のランダムな英数字コードを生成
      addDebugLog('認証コードを生成中...');
      const code = Array.from({ length: 6 }, () =>
        '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 36)]
      ).join('');

      // 有効期限は15分後
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      addDebugLog(`生成されたコード: ${code}`);
      addDebugLog(`有効期限: ${expiresAt.toISOString()}`);

      // ユーザープロフィールの存在確認
      addDebugLog('ユーザープロフィールを確認中...');
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, name, email, user_type')
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        addDebugLog(`❌ プロフィール取得エラー: ${profileError.message}`);
        addDebugLog(`プロフィールエラーコード: ${profileError.code}`);
      } else {
        addDebugLog(`✅ プロフィール確認: ${profileData.name || profileData.email}`);
      }

      // 認証ユーザーIDを使用して挿入
      addDebugLog('データベースに挿入中...');
      addDebugLog(`挿入データ: user_id=${authUser.id}, auth_code=${code}, expires_at=${expiresAt.toISOString()}`);
      
      const { data, error } = await supabase
        .from('line_auth_codes')
        .insert([
          {
            user_id: authUser.id, // 認証ユーザーIDを使用
            auth_code: code,
            expires_at: expiresAt.toISOString(),
          },
        ])
        .select(); // 挿入されたデータを返す

      if (data) {
        addDebugLog(`✅ 挿入成功: ${JSON.stringify(data)}`);
      }

      if (error) {
        addDebugLog(`❌ 挿入エラー: ${error.message}`);
        addDebugLog(`エラーコード: ${error.code}`);
        addDebugLog(`エラー詳細: ${JSON.stringify(error.details)}`);
        addDebugLog(`ヒント: ${error.hint || 'なし'}`);
        
        // テーブルが存在しない場合の特別な処理
        if (error.code === 'PGRST116' || error.message.includes('relation "line_auth_codes" does not exist')) {
          addDebugLog('❌ テーブルが見つかりません');
          alert('データベースの設定が完了していません。管理者にお問い合わせください。\n\nエラー: テーブルが見つかりません');
        } else if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
          addDebugLog('❌ RLS認証エラー - RLSポリシーの問題の可能性');
          addDebugLog('解決方法: fix_line_auth_policies.sqlをSupabaseで実行してください');
          
          // RLSポリシーの問題の場合、詳細な情報を提供
          alert(`認証エラーが発生しました。\n\n考えられる原因:\n1. RLSポリシーの設定問題\n2. ユーザープロフィールの不整合\n\n解決方法:\n1. Supabaseダッシュボードで fix_line_auth_policies.sql を実行\n2. または一時的にRLSを無効化\n\n詳細: ${error.message}`);
        } else if (error.code === '42501' || error.message.includes('violates row-level security policy')) {
          addDebugLog('❌ RLSポリシー違反エラー');
          addDebugLog('原因: ユーザープロフィールが存在しない可能性が高い');
          addDebugLog('解決方法: fix_missing_user_profile.sqlをSupabaseで実行してください');
          
          alert(`データベースの権限エラーが発生しました。\n\n原因:\nユーザープロフィールがデータベースに存在しません\n\n解決方法:\n1. SupabaseダッシュボードのSQL Editorを開く\n2. fix_missing_user_profile.sql の内容を実行\n3. 必要に応じてメールアドレスと名前を修正\n\n詳細: ${error.message}`);
        } else if (error.code === '23505' || error.message.includes('duplicate key')) {
          addDebugLog('❌ 認証コード重複');
          alert('認証コードが重複しています。再度お試しください。');
        } else if (error.code === '23503' || error.message.includes('foreign key')) {
          addDebugLog('❌ 外部キー制約エラー - ユーザーIDがuser_profilesに存在しない');
          alert('ユーザー情報に問題があります。管理者にお問い合わせください。\n\n詳細: ' + error.message);
        } else {
          addDebugLog(`❌ その他のエラー: ${error.message}`);
          alert(`認証コードの生成に失敗しました: ${error.message || error.code || 'Unknown error'}\n\n詳細はデバッグモーダルで確認してください。`);
        }
        return;
      }

      addDebugLog('✅ 認証コード生成成功！');
      setAuthCode(code);
      setShowCode(true);
    } catch (error) {
      addDebugLog(`❌ 予期しないエラー: ${error instanceof Error ? error.message : String(error)}`);
      alert('エラーが発生しました。管理者にお問い合わせください。\n\n詳細はデバッグモーダルで確認してください。');
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
                  href="https://lin.ee/ILWr2G0"
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

      {/* デバッグモーダル */}
      {showDebugModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">🔍 LINE認証コード生成 デバッグログ</h3>
              <button
                onClick={() => setShowDebugModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
                {debugLogs.length === 0 ? (
                  <div className="text-gray-400">ログを待機中...</div>
                ) : (
                  debugLogs.map((log, index) => (
                    <div key={index} className="whitespace-pre-wrap">{log}</div>
                  ))
                )}
              </div>
            </div>
            <div className="flex justify-between p-4 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(debugLogs.join('\n'));
                  alert('ログをクリップボードにコピーしました');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                📋 ログをコピー
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={() => setDebugLogs([])}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                >
                  🗑️ ログをクリア
                </button>
                <button
                  onClick={() => setShowDebugModal(false)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

