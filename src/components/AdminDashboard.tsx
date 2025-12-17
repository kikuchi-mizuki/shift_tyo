/**
 * AdminDashboard.tsx
 * 管理者ダッシュボード - リファクタリング版
 *
 * Phase 1-4で抽出したサービス・フック・コンポーネントを統合し、
 * クリーンなアーキテクチャを実現
 */

import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Custom Hooks
import { useAdminData } from '../hooks/admin/useAdminData';
import { useAIMatching } from '../hooks/admin/useAIMatching';
import { useManualMatching } from '../hooks/admin/useManualMatching';
import { useCalendarState } from '../hooks/admin/useCalendarState';
import { useFormState } from '../hooks/admin/useFormState';

// Services
import { confirmSingleMatch, cancelConfirmedShift } from '../services/admin/ShiftService';
import { addPosting, deletePosting, addRequest, deleteRequest } from '../services/admin/PostingRequestService';
import { prepareUserEdit, saveUserEdit, deleteUserProfile } from '../services/admin/UserService';
import { analyzePharmacyShortage } from '../services/admin/AnalysisService';

// Components
import { AdminCalendar } from './admin/calendar/AdminCalendar';
import { AdminPanel } from './admin/panel/AdminPanel';
import { AdminEmergencyShift } from './AdminEmergencyShift';
import EmergencyShiftRequest from './EmergencyShiftRequest';
import PasswordChangeModal from './PasswordChangeModal';
import DebugModal from './DebugModal';

interface AdminDashboardProps {
  user: {
    id: string;
    email?: string;
    [key: string]: unknown;
  };
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  // カスタムフック: カレンダー状態管理
  const {
    currentDate,
    selectedDate,
    setSelectedDate,
    handlePrevMonth,
    handleNextMonth,
    handleDateSelect
  } = useCalendarState();

  // カスタムフック: データ取得・管理
  const {
    requests,
    postings,
    assigned,
    userProfiles,
    ratings,
    storeNgPharmacists,
    storeNgPharmacies,
    recruitmentStatus,
    loading,
    reload,
    loadAssignedShifts,
    toggleRecruitmentStatus
  } = useAdminData(supabase, user, currentDate);

  // カスタムフック: AIマッチング
  const {
    aiMatchesByDate,
    aiMatchingLoading,
    executeMatching,
    executeMonthlyMatching
  } = useAIMatching(supabase, requests, postings, assigned, userProfiles, ratings, storeNgPharmacists, storeNgPharmacies);

  // カスタムフック: 手動マッチング
  const {
    manualMatches,
    handlePharmacistSelection,
    saveManualShiftRequests
  } = useManualMatching(supabase);

  // カスタムフック: フォーム状態管理
  const {
    editingUserId,
    userEditForm,
    setEditingUserId,
    setUserEditForm,
    showAddPosting,
    newPosting,
    setShowAddPosting,
    setNewPosting,
    showAddRequest,
    newRequest,
    setShowAddRequest,
    setNewRequest,
    expandedSections,
    toggleSection
  } = useFormState();

  // モーダル表示状態
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [debugData, setDebugData] = useState<Record<string, unknown> | null>(null);

  // デバッグログ表示用
  const [debugLog, setDebugLog] = useState<string>('');
  const [showMatchingDebugModal, setShowMatchingDebugModal] = useState(false);
  const [matchingDebugInfo, setMatchingDebugInfo] = useState<any>(null);

  // 緊急シフト管理モード
  const [showEmergencyManagement, setShowEmergencyManagement] = useState(false);

  // ユーザー管理ハンドラー
  const handleEditUser = (profile: any) => {
    const editForm = prepareUserEdit(profile, storeNgPharmacists, userProfiles);
    setEditingUserId(profile.id);
    setUserEditForm(editForm);
  };

  const handleSaveUser = async (profile: any) => {
    const result = await saveUserEdit(profile, userEditForm, supabase, user, userProfiles);
    if (result.success) {
      setEditingUserId(null);
      await reload();
    } else {
      alert(result.message || '保存に失敗しました');
    }
  };

  const handleDeleteUser = async (profile: any) => {
    if (!confirm(`${profile.name || profile.email}を削除しますか？`)) return;
    const result = await deleteUserProfile(profile, supabase);
    if (result.success) {
      await reload();
    } else {
      alert(result.message || '削除に失敗しました');
    }
  };

  // シフト管理ハンドラー
  const handleConfirmMatch = async (match: any) => {
    const result = await confirmSingleMatch(match, selectedDate, supabase, userProfiles);
    if (result.success) {
      await loadAssignedShifts();
      await executeMatching(selectedDate);
    } else {
      alert(result.message || '確定に失敗しました');
    }
  };

  const handleCancelShift = async (shiftId: string) => {
    if (!confirm('このシフトを取り消しますか？')) return;
    const shift = assigned.find((s: any) => s.id === shiftId);
    if (!shift) return;

    const result = await cancelConfirmedShift(shift, supabase);
    if (result.success) {
      await loadAssignedShifts();
    } else {
      alert(result.message || '取り消しに失敗しました');
    }
  };

  // 募集・希望管理ハンドラー
  const handleAddPosting = async () => {
    const postingData = {
      ...newPosting,
      date: selectedDate,
      created_by: user.id
    };
    const result = await addPosting(postingData, supabase);
    if (result.success) {
      setShowAddPosting(false);
      setNewPosting({ pharmacy_id: '', date: '', time_slot: 'negotiable', start_time: '', end_time: '', required_staff: 1, store_name: '', memo: '' });
      await reload();
    } else {
      alert(result.message || '追加に失敗しました');
    }
  };

  const handleDeletePosting = async (postingId: string) => {
    if (!confirm('この募集を削除しますか？')) return;
    const result = await deletePosting(postingId, supabase);
    if (result.success) {
      await reload();
    } else {
      alert(result.message || '削除に失敗しました');
    }
  };

  const handleAddRequest = async () => {
    const requestData = {
      ...newRequest,
      date: selectedDate,
      status: 'pending'
    };
    const result = await addRequest(requestData, supabase);
    if (result.success) {
      setShowAddRequest(false);
      setNewRequest({ pharmacist_id: '', date: '', time_slot: 'negotiable', start_time: '', end_time: '', priority: 'medium', memo: '' });
      await reload();
    } else {
      alert(result.message || '追加に失敗しました');
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('この希望を削除しますか？')) return;
    const result = await deleteRequest(requestId, supabase);
    if (result.success) {
      await reload();
    } else {
      alert(result.message || '削除に失敗しました');
    }
  };

  // デバッグモーダル
  const handleDebugModal = () => {
    setDebugData({
      selectedDate,
      aiMatches: aiMatchesByDate[selectedDate] || [],
      requests: requests.filter((r: any) => r.date === selectedDate),
      postings: postings.filter((p: any) => p.date === selectedDate),
      assigned: assigned.filter((a: any) => a.date === selectedDate),
      currentDate: new Date().toISOString(),
      timestamp: Date.now()
    });
    setShowDebugModal(true);
  };

  // 日付選択ハンドラー
  const onDateSelect = (date: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;
    setSelectedDate(dateStr);
    handleDateSelect(dateStr);
  };

  // ユーザーリストの整理
  const pharmacies = Object.values(userProfiles).filter((p: any) => p && p.user_type === 'pharmacy' || p && p.user_type === 'store');
  const pharmacists = Object.values(userProfiles).filter((p: any) => p && p.user_type === 'pharmacist');
  const availablePharmacists = pharmacists.filter((p: any) => p && p.id);

  // 選択された日付のデータ
  const dayData = selectedDate ? {
    matches: (assigned || []).filter((s: any) => s.date === selectedDate && s.status === 'pending'),
    shortages: analyzePharmacyShortage(selectedDate, requests, postings, assigned, aiMatchesByDate, userProfiles),
    confirmedShifts: (assigned || []).filter((s: any) => s.date === selectedDate && s.status === 'confirmed'),
    postings: (postings || []).filter((p: any) => p.date === selectedDate && p.time_slot !== 'consult'),
    requests: (requests || []).filter((r: any) => r.date === selectedDate && r.time_slot !== 'consult' && r.status !== 'confirmed'),
    consultRequests: (requests || []).filter((r: any) => r.date === selectedDate && r.time_slot === 'consult')
  } : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* デバッグログ表示 */}
      {debugLog && (
        <div className="mx-2 sm:mx-4 lg:mx-6 bg-red-100 border-2 border-red-500 rounded-lg p-4">
          <div className="text-red-900 font-bold text-lg">{debugLog}</div>
        </div>
      )}

      {/* LINEで呼びかけるボタン - 非表示 */}
      {false && (
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowEmergencyModal(true)}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            <Bell className="w-5 h-5" />
            LINEで呼びかける
          </button>
        </div>
      )}

      {/* メインレイアウト */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 p-2 sm:p-4 lg:p-6">
          {/* カレンダー */}
          <AdminCalendar
            currentDate={currentDate}
            selectedDate={selectedDate}
            requests={requests}
            postings={postings}
            assigned={assigned}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onDateSelect={onDateSelect}
          />

          {/* 管理パネル */}
          <AdminPanel
            onPasswordChange={() => setShowPasswordChangeModal(true)}
            onDebug={handleDebugModal}
            recruitmentStatus={recruitmentStatus}
            aiMatchingLoading={aiMatchingLoading}
            onToggleRecruitment={toggleRecruitmentStatus}
            onMonthlyMatching={async () => {
              const debugInfo: any = {
                timestamp: new Date().toISOString(),
                currentDate: currentDate.toISOString(),
                executeMonthlyMatchingType: typeof executeMonthlyMatching,
                requestsCount: requests.length,
                postingsCount: postings.length,
                assignedCount: assigned.length,
                logs: []
              };

              debugInfo.logs.push('ボタンがクリックされました');

              try {
                debugInfo.logs.push('executeMonthlyMatching呼び出し開始');
                await executeMonthlyMatching(currentDate);
                debugInfo.logs.push('executeMonthlyMatching呼び出し完了');

                // マッチング結果を再読み込み
                debugInfo.logs.push('マッチング結果を再読み込み中');
                await loadAssignedShifts();
                debugInfo.logs.push('マッチング結果の再読み込み完了');

                debugInfo.success = true;
              } catch (error: any) {
                debugInfo.logs.push('エラー: ' + error.message);
                debugInfo.error = error.message;
                debugInfo.success = false;
              }

              setMatchingDebugInfo(debugInfo);
              setShowMatchingDebugModal(true);
            }}
            selectedDate={selectedDate}
            dateDetailProps={dayData ? {
              selectedDate,
              dayData,
              userProfiles,
              availablePharmacists,
              manualMatches,
              showAddForms: { posting: showAddPosting, request: showAddRequest },
              newPosting,
              newRequest,
              onClose: () => setSelectedDate(''),
              onConfirmMatch: handleConfirmMatch,
              onPharmacistSelect: (pharmacyId, index, pharmacistId) => {
                const newMatches = [...(manualMatches[pharmacyId] || [])];
                newMatches[index] = pharmacistId;
                handlePharmacistSelection(pharmacyId, pharmacistId, true);
              },
              onSaveManualMatches: () => saveManualShiftRequests(selectedDate, postings),
              onCancelShift: handleCancelShift,
              onTogglePostingForm: () => setShowAddPosting(!showAddPosting),
              onPostingChange: setNewPosting,
              onAddPosting: handleAddPosting,
              onDeletePosting: handleDeletePosting,
              onToggleRequestForm: () => setShowAddRequest(!showAddRequest),
              onRequestChange: setNewRequest,
              onAddRequest: handleAddRequest,
              onDeleteRequest: handleDeleteRequest
            } : undefined}
            userManagementProps={{
              pharmacies,
              pharmacists,
              ratings,
              storeNgPharmacies,
              expandedSections,
              editingUserId,
              userEditForm,
              userProfiles,
              onToggleSection: toggleSection,
              onEditFormChange: setUserEditForm,
              onEdit: handleEditUser,
              onSave: handleSaveUser,
              onCancel: () => setEditingUserId(null),
              onDelete: handleDeleteUser
            }}
          />
        </div>

      {/* モーダル */}
      {showEmergencyModal && (
        <EmergencyShiftRequest
          user={user}
          onClose={() => setShowEmergencyModal(false)}
        />
      )}

      {showPasswordChangeModal && (
        <PasswordChangeModal
          user={user}
          onClose={() => setShowPasswordChangeModal(false)}
        />
      )}

      {showDebugModal && debugData && (
        <DebugModal
          debugData={debugData}
          onClose={() => setShowDebugModal(false)}
        />
      )}

      {showMatchingDebugModal && matchingDebugInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-purple-600">マッチング実行デバッグ情報</h2>

              <div className="space-y-4">
                <div className="bg-gray-100 p-4 rounded">
                  <h3 className="font-bold text-lg mb-2">実行状態</h3>
                  <div className={`text-2xl font-bold ${matchingDebugInfo.success ? 'text-green-600' : 'text-red-600'}`}>
                    {matchingDebugInfo.success ? '✓ 成功' : '✗ エラー'}
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded">
                  <h3 className="font-bold mb-2">基本情報</h3>
                  <div className="space-y-1 text-sm font-mono">
                    <div>実行時刻: {matchingDebugInfo.timestamp}</div>
                    <div>対象月: {matchingDebugInfo.currentDate}</div>
                    <div>関数型: {matchingDebugInfo.executeMonthlyMatchingType}</div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded">
                  <h3 className="font-bold mb-2">データ数</h3>
                  <div className="space-y-1 text-sm">
                    <div>募集数: {matchingDebugInfo.postingsCount}</div>
                    <div>希望数: {matchingDebugInfo.requestsCount}</div>
                    <div>確定シフト数: {matchingDebugInfo.assignedCount}</div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded">
                  <h3 className="font-bold mb-2">実行ログ</h3>
                  <div className="space-y-1 text-sm font-mono">
                    {matchingDebugInfo.logs.map((log: string, i: number) => (
                      <div key={i}>• {log}</div>
                    ))}
                  </div>
                </div>

                {matchingDebugInfo.error && (
                  <div className="bg-red-50 p-4 rounded border-2 border-red-300">
                    <h3 className="font-bold mb-2 text-red-600">エラー詳細</h3>
                    <div className="text-sm font-mono text-red-800">{matchingDebugInfo.error}</div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowMatchingDebugModal(false)}
                className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
