import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface AdminRecruitmentManagementProps {
  className?: string;
}

interface RecruitmentStatus {
  is_open: boolean;
  updated_at: string;
  updated_by: string | null;
  notes: string | null;
}

const AdminRecruitmentManagement: React.FC<AdminRecruitmentManagementProps> = ({ className = '' }) => {
  const [recruitmentStatus, setRecruitmentStatus] = useState<RecruitmentStatus>({
    is_open: true,
    updated_at: '',
    updated_by: null,
    notes: null
  });

  // 募集状況を読み込む関数
  const loadRecruitmentStatus = async () => {
    try {
      // 固定レコードIDを直接参照（存在しない場合の誤検知を避ける）
      const FIXED_ID = '00000000-0000-0000-0000-000000000001';
      const { data, error } = await supabase
        .from('recruitment_status')
        .select('*')
        .eq('id', FIXED_ID)
        .single();
      
      if (error) {
        console.error('募集状況読み込みエラー:', error);
        return;
      }
      
      if (data) {
        setRecruitmentStatus({
          is_open: data.is_open,
          updated_at: data.updated_at,
          updated_by: data.updated_by,
          notes: data.notes
        });
      }
    } catch (error) {
      console.error('募集状況読み込みエラー:', error);
    }
  };

  // 募集締切/再開を切り替える関数
  const toggleRecruitmentStatus = async () => {
    try {
      // 権限チェック（管理者のみ）
      const { data: authInfo } = await supabase.auth.getUser();
      const currentUserId = authInfo?.user?.id;
      if (!currentUserId) {
        alert('ログイン情報を取得できません。再ログインしてください。');
        return;
      }
      const { data: me, error: meErr } = await supabase
        .from('user_profiles')
        .select('id,user_type,email')
        .eq('id', currentUserId)
        .maybeSingle();
      if (meErr) {
        console.error('管理者確認エラー:', meErr);
      }
      if (!me || me.user_type !== 'admin') {
        alert('この操作には管理者権限が必要です。管理者でログインしてください。');
        return;
      }

      // 固定IDへupsert（存在しなければ作成、あれば更新）
      const FIXED_ID = '00000000-0000-0000-0000-000000000001';

      const newStatus = !recruitmentStatus.is_open;
      const action = newStatus ? '再開' : '締切';
      
      // まず UPDATE を試みる（既存レコードがある前提）
      const debugInfo = {
        FIXED_ID,
        newStatus,
        action,
        currentUser: currentUserId,
        timestamp: new Date().toISOString()
      };
      
      console.log('=== 募集状況更新デバッグ ===');
      console.log('FIXED_ID:', FIXED_ID);
      console.log('newStatus:', newStatus);
      console.log('action:', action);
      console.log('current user:', currentUserId);
      
      // まずUPDATEを試行
      const { data: updatedRow, error } = await supabase
        .from('recruitment_status')
        .update({
          is_open: newStatus,
          notes: `募集を${action}しました (${new Date().toLocaleString('ja-JP')})`
        })
        .eq('id', FIXED_ID)
        .select('id,is_open,updated_at,notes');
      
      const resultInfo = {
        updatedRow,
        error,
        debugInfo
      };
      
      console.log('UPDATE結果:', resultInfo);
      console.log('updatedRow:', updatedRow);
      console.log('error:', error);
      
      if (error) {
        console.error('募集状況更新エラー:', error);
        const message = typeof error === 'object' && error !== null ? (error as any).message || (error as any).hint || JSON.stringify(error) : String(error);
        
        alert(`募集状況の更新に失敗しました:\n\n${message}`);
        return;
      }

      // UPDATEが成功した場合
      if (updatedRow && updatedRow.length > 0) {
        console.log('UPDATE成功:', updatedRow);
        setRecruitmentStatus(prev => ({
          ...prev,
          is_open: newStatus,
          updated_at: new Date().toISOString(),
          updated_by: currentUserId,
          notes: `募集を${action}しました (${new Date().toLocaleString('ja-JP')})`
        }));
        
        alert(`募集を${action}しました`);
        
        // 募集状況を再読み込み
        await loadRecruitmentStatus();
        return;
      } else {
        // レコードが存在しない場合はINSERTを試行
        console.log('レコードが存在しないため、INSERTを試行します');
        const { data: insertedRow, error: insertError } = await supabase
          .from('recruitment_status')
          .insert({
            id: FIXED_ID,
            is_open: newStatus,
            notes: `募集を${action}しました (${new Date().toLocaleString('ja-JP')})`
          })
          .select('id,is_open,updated_at,notes');

        if (insertError) {
          console.error('INSERTエラー:', insertError);
          const debugModal = `
=== 募集状況更新デバッグ情報 ===

【リクエスト情報】
- FIXED_ID: ${FIXED_ID}
- newStatus: ${newStatus}
- action: ${action}
- currentUser: ${currentUserId}
- timestamp: ${new Date().toISOString()}

【エラー情報】
- INSERT error: ${JSON.stringify(insertError, null, 2)}
          `;
          
          alert(`募集状況の更新に失敗しました。\n\n${debugModal}`);
          return;
        }
        
        console.log('INSERT成功:', insertedRow);
        setRecruitmentStatus(prev => ({
          ...prev,
          is_open: newStatus,
          updated_at: new Date().toISOString(),
          updated_by: currentUserId,
          notes: `募集を${action}しました (${new Date().toLocaleString('ja-JP')})`
        }));
        
        alert(`募集を${action}しました（新規作成）`);
        await loadRecruitmentStatus();
        return;
      }
      
    } catch (error) {
      console.error('募集状況切り替えエラー:', error);
      alert(`募集状況の切り替えに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // コンポーネントマウント時に募集状況を読み込み
  useEffect(() => {
    loadRecruitmentStatus();
  }, []);

  return (
    <div className={`bg-white rounded-lg shadow p-4 mb-4 ${className}`}>
      <button
        onClick={toggleRecruitmentStatus}
        className={`w-full py-2 px-4 rounded-lg font-medium text-sm ${
          recruitmentStatus.is_open 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        {recruitmentStatus.is_open ? '✋ 募集を締め切る' : '募集を再開する'}
      </button>
    </div>
  );
};

export default AdminRecruitmentManagement;
