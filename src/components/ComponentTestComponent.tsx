import React, { useState } from 'react';
import AdminCalendar from './AdminCalendar';
import AdminMatchingPanel from './AdminMatchingPanel';
import AdminUserManagement from './AdminUserManagement';
import AdminStats from './AdminStats';
import { useAdminData } from '../hooks/useAdminData';
import { useAIMatching } from '../hooks/useAIMatching';
import { useUserManagement } from '../hooks/useUserManagement';
import { useShiftManagement } from '../hooks/useShiftManagement';
import { getMonthName, getDaysInMonth, getMatchingStatus, getConsultRequests, safeLength } from '../utils/adminUtils';

const ComponentTestComponent: React.FC = () => {
  const [activeComponent, setActiveComponent] = useState<'calendar' | 'matching' | 'users' | 'stats'>('calendar');
  
  // フックを使用
  const adminData = useAdminData();
  const aiMatching = useAIMatching();
  const userManagement = useUserManagement();
  const shiftManagement = useShiftManagement();

  const renderComponent = () => {
    switch (activeComponent) {
      case 'calendar':
        return (
          <AdminCalendar
            currentDate={shiftManagement.currentDate}
            selectedDate={shiftManagement.selectedDate}
            onDateSelect={(date) => shiftManagement.updateSelectedDate(date)}
            onPreviousMonth={() => {
              const newDate = new Date(shiftManagement.currentDate);
              newDate.setMonth(newDate.getMonth() - 1);
              shiftManagement.updateCurrentDate(newDate);
            }}
            onNextMonth={() => {
              const newDate = new Date(shiftManagement.currentDate);
              newDate.setMonth(newDate.getMonth() + 1);
              shiftManagement.updateCurrentDate(newDate);
            }}
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
            onRunMatching={async () => {
              console.log('Running matching...');
            }}
            onConfirmMatch={(match) => {
              console.log('Confirming match:', match);
            }}
            onCancelMatch={(match) => {
              console.log('Cancelling match:', match);
            }}
            onToggleAIMatching={() => {
              aiMatching.setUseAIMatching(!aiMatching.useAIMatching);
            }}
          />
        );
      
      case 'users':
        return (
          <AdminUserManagement
            userProfiles={adminData.userProfiles}
            expandedSections={userManagement.expandedSections}
            onToggleSection={userManagement.toggleSection}
            onEditUser={(user) => {
              console.log('Editing user:', user);
            }}
            onDeleteUser={(user) => {
              console.log('Deleting user:', user);
            }}
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
        return <div>コンポーネントを選択してください</div>;
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">分離コンポーネント動作確認</h2>
      
      {/* コンポーネント選択 */}
      <div className="flex space-x-2 mb-4">
        {[
          { id: 'calendar', label: 'カレンダー' },
          { id: 'matching', label: 'マッチング' },
          { id: 'users', label: 'ユーザー管理' },
          { id: 'stats', label: '統計' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveComponent(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeComponent === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 選択されたコンポーネントを表示 */}
      <div className="border border-gray-200 rounded-lg p-4">
        {renderComponent()}
      </div>
    </div>
  );
};

export default ComponentTestComponent;
