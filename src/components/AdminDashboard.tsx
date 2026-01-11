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
import { exportMatchingCSV, exportShortageCSV, exportRequestsCSV, exportPostingsCSV, exportAllDataCSV } from '../utils/csvExport';

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
import { UserManagement } from './admin/users/UserManagement';
import EmergencyShiftRequest from './EmergencyShiftRequest';
import PasswordChangeModal from './PasswordChangeModal';

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
      setNewRequest({ pharmacist_id: '', date: '', time_slot: 'negotiable', start_time: '', end_time: '', memo: '' });
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

  // 日付選択ハンドラー
  const onDateSelect = (date: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;
    setSelectedDate(dateStr);
    handleDateSelect(dateStr);
  };

  // CSV出力ハンドラー
  const handleCSVExport = (type: 'matching' | 'shortage' | 'requests' | 'postings' | 'all') => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    switch (type) {
      case 'matching':
        exportMatchingCSV(assigned, userProfiles, year, month);
        break;
      case 'shortage':
        exportShortageCSV(postings, assigned, userProfiles, year, month);
        break;
      case 'requests':
        exportRequestsCSV(requests, userProfiles, year, month);
        break;
      case 'postings':
        exportPostingsCSV(postings, userProfiles, year, month);
        break;
      case 'all':
        exportAllDataCSV(assigned, postings, requests, userProfiles, year, month);
        break;
    }
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
    requests: (() => {
      const filtered = (requests || []).filter((r: any) => r.date === selectedDate && r.time_slot !== 'consult' && r.status !== 'confirmed');
      // 重複除去: 薬剤師ID + 開始時間 + 終了時間でユニーク化
      const seen = new Map<string, any>();
      filtered.forEach((r: any) => {
        const startTime = r.start_time ? String(r.start_time).substring(0, 5) : '';
        const endTime = r.end_time ? String(r.end_time).substring(0, 5) : '';
        const key = `${r.pharmacist_id}_${startTime}_${endTime}`;
        if (!seen.has(key)) {
          seen.set(key, r);
        }
      });
      return Array.from(seen.values());
    })(),
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
      <div className="flex flex-col gap-4 lg:gap-6 p-2 sm:p-4 lg:p-6">
        {/* カレンダーと管理パネル */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
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
            recruitmentStatus={recruitmentStatus}
            aiMatchingLoading={aiMatchingLoading}
            onToggleRecruitment={toggleRecruitmentStatus}
            onMonthlyMatching={async () => {
              try {
                await executeMonthlyMatching(currentDate);
                await loadAssignedShifts();
              } catch (error: any) {
                console.error('マッチング実行エラー:', error);
                alert('マッチング実行中にエラーが発生しました。');
              }
            }}
            onCSVExport={handleCSVExport}
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
          />
        </div>

        {/* ユーザー管理（カレンダーの下） */}
        <div className="w-full">
          <UserManagement
            pharmacies={pharmacies}
            pharmacists={pharmacists}
            ratings={ratings}
            storeNgPharmacies={storeNgPharmacies}
            expandedSections={expandedSections}
            editingUserId={editingUserId}
            userEditForm={userEditForm}
            userProfiles={userProfiles}
            onToggleSection={toggleSection}
            onEditFormChange={setUserEditForm}
            onEdit={handleEditUser}
            onSave={handleSaveUser}
            onCancel={() => setEditingUserId(null)}
            onDelete={handleDeleteUser}
          />
        </div>
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
          isOpen={showPasswordChangeModal}
          user={user}
          onClose={() => setShowPasswordChangeModal(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
