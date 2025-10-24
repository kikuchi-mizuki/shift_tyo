import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, Star, Brain, Zap, Bell, Lock } from 'lucide-react';

// カスタムフック
import { useAdminData } from '../hooks/useAdminData';
import { useAIMatching } from '../hooks/useAIMatching';
import { useUserManagement } from '../hooks/useUserManagement';
import { useShiftManagement } from '../hooks/useShiftManagement';

// コンポーネント
import AdminCalendar from './AdminCalendar';
import AdminMatchingPanel from './AdminMatchingPanel';
import AdminUserManagement from './AdminUserManagement';
import AdminStats from './AdminStats';
import EmergencyShiftRequest from './EmergencyShiftRequest';
import PasswordChangeModal from './PasswordChangeModal';
import DebugModal from './DebugModal';

// ユーティリティ
import { 
  getMonthName, 
  getDaysInMonth, 
  getMatchingStatus, 
  getConsultRequests,
  safeLength 
} from '../utils/adminUtils';

interface AdminDashboardProps {
  user: any;
}

const AdminDashboardRefactored: React.FC<AdminDashboardProps> = ({ user }) => {
  // カスタムフック
  const adminData = useAdminData();
  const aiMatching = useAIMatching();
  const userManagement = useUserManagement();
  const shiftManagement = useShiftManagement();

  // ローカル状態
  const [activeTab, setActiveTab] = useState<'calendar' | 'matching' | 'users' | 'stats'>('calendar');

  // 日付操作
  const handlePreviousMonth = () => {
    const newDate = new Date(shiftManagement.currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    shiftManagement.updateCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(shiftManagement.currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    shiftManagement.updateCurrentDate(newDate);
  };

  const handleDateSelect = (date: string) => {
    shiftManagement.updateSelectedDate(date);
  };

  // マッチング操作
  const handleRunMatching = async () => {
    if (!shiftManagement.selectedDate) return;
    
    try {
      const requests = await adminData.fetchShiftRequestsForDate(shiftManagement.selectedDate);
      const postings = await adminData.fetchShiftPostingsForDate(shiftManagement.selectedDate);
      
      if (aiMatching.useAIMatching) {
        const matches = await aiMatching.executeSimpleAIMatching(requests, postings);
        aiMatching.updateAiMatchesByDate(shiftManagement.selectedDate, matches);
      }
    } catch (error) {
      console.error('Error running matching:', error);
    }
  };

  const handleConfirmMatch = async (match: any) => {
    try {
      await shiftManagement.handleConfirmSingleMatch(match, shiftManagement.selectedDate);
      await adminData.loadAssignedShifts();
    } catch (error) {
      console.error('Error confirming match:', error);
    }
  };

  const handleCancelMatch = (match: any) => {
    // マッチキャンセルロジック
    console.log('Cancel match:', match);
  };

  // ユーザー管理操作
  const handleEditUser = async (user: any) => {
    try {
      await userManagement.saveEditUser(user);
      await adminData.loadAll();
    } catch (error) {
      console.error('Error editing user:', error);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (window.confirm('このユーザーを削除しますか？')) {
      try {
        await userManagement.deleteUser(user);
        await adminData.loadAll();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  // タブコンテンツのレンダリング
  const renderTabContent = () => {
    switch (activeTab) {
      case 'calendar':
        return (
          <AdminCalendar
            currentDate={shiftManagement.currentDate}
            selectedDate={shiftManagement.selectedDate}
            onDateSelect={handleDateSelect}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            getMonthName={getMonthName}
            getDaysInMonth={getDaysInMonth}
            getMatchingStatus={(date) => getMatchingStatus(date, adminData.assigned, adminData.requests, adminData.postings)}
            getConsultRequests={(date) => getConsultRequests(date, adminData.requests)}
            safeLength={safeLength}
          />
        );
      
      case 'matching':
        return (
          <AdminMatchingPanel
            selectedDate={shiftManagement.selectedDate}
            requests={adminData.requests}
            postings={adminData.postings}
            aiMatches={aiMatching.aiMatches}
            useAIMatching={aiMatching.useAIMatching}
            aiMatchingLoading={aiMatching.aiMatchingLoading}
            onRunMatching={handleRunMatching}
            onConfirmMatch={handleConfirmMatch}
            onCancelMatch={handleCancelMatch}
            onToggleAIMatching={() => aiMatching.setUseAIMatching(!aiMatching.useAIMatching)}
          />
        );
      
      case 'users':
        return (
          <AdminUserManagement
            userProfiles={adminData.userProfiles}
            expandedSections={userManagement.expandedSections}
            onToggleSection={userManagement.toggleSection}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            onOpenPasswordChange={userManagement.openPasswordChangeModal}
            onOpenDebugModal={userManagement.openDebugModal}
          />
        );
      
      case 'stats':
        return (
          <AdminStats
            assigned={adminData.assigned}
            requests={adminData.requests}
            postings={adminData.postings}
            userProfiles={adminData.userProfiles}
            systemStatus={adminData.systemStatus}
            lastUpdated={adminData.lastUpdated}
            recruitmentStatus={adminData.recruitmentStatus}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">管理者ダッシュボード</h1>
              <p className="text-gray-600 mt-1">シフト管理システム</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  adminData.systemStatus === 'active' ? 'bg-green-500' : 
                  adminData.systemStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                <span className="text-sm text-gray-600">
                  {adminData.systemStatus === 'active' ? '正常' : 
                   adminData.systemStatus === 'error' ? 'エラー' : '処理中'}
                </span>
              </div>
              
              <button
                onClick={shiftManagement.openEmergencyModal}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
              >
                <Bell className="h-4 w-4 mr-2" />
                緊急シフト
              </button>
            </div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'calendar', label: 'カレンダー', icon: Calendar },
              { id: 'matching', label: 'マッチング', icon: Brain },
              { id: 'users', label: 'ユーザー管理', icon: Lock },
              { id: 'stats', label: '統計', icon: Star }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* メインコンテンツ */}
        <div className="space-y-6">
          {renderTabContent()}
        </div>

        {/* モーダル */}
        {shiftManagement.showEmergencyModal && (
          <EmergencyShiftRequest
            onClose={shiftManagement.closeEmergencyModal}
            user={user}
          />
        )}

        {userManagement.showPasswordChangeModal && (
          <PasswordChangeModal
            onClose={userManagement.closePasswordChangeModal}
            user={user}
          />
        )}

        {userManagement.showDebugModal && (
          <DebugModal
            onClose={userManagement.closeDebugModal}
            data={userManagement.debugData}
          />
        )}
      </div>
    </div>
  );
};

export default AdminDashboardRefactored;
