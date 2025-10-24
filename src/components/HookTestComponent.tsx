import React from 'react';
import { useAdminData } from '../hooks/useAdminData';
import { useAIMatching } from '../hooks/useAIMatching';
import { useUserManagement } from '../hooks/useUserManagement';
import { useShiftManagement } from '../hooks/useShiftManagement';

const HookTestComponent: React.FC = () => {
  // 各フックをテスト
  const adminData = useAdminData();
  const aiMatching = useAIMatching();
  const userManagement = useUserManagement();
  const shiftManagement = useShiftManagement();

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">カスタムフック動作確認</h2>
      
      {/* useAdminData テスト */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800">useAdminData</h3>
        <div className="text-sm">
          <p>Loading: {adminData.loading ? 'Yes' : 'No'}</p>
          <p>System Status: {adminData.systemStatus}</p>
          <p>Assigned: {adminData.assigned.length}</p>
          <p>Requests: {adminData.requests.length}</p>
          <p>Postings: {adminData.postings.length}</p>
        </div>
      </div>

      {/* useAIMatching テスト */}
      <div className="bg-purple-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-purple-800">useAIMatching</h3>
        <div className="text-sm">
          <p>AI Engine: {aiMatching.aiMatchingEngine ? 'Initialized' : 'Not initialized'}</p>
          <p>Data Collector: {aiMatching.dataCollector ? 'Initialized' : 'Not initialized'}</p>
          <p>Use AI Matching: {aiMatching.useAIMatching ? 'Yes' : 'No'}</p>
          <p>AI Matches: {aiMatching.aiMatches.length}</p>
          <p>Loading: {aiMatching.aiMatchingLoading ? 'Yes' : 'No'}</p>
        </div>
      </div>

      {/* useUserManagement テスト */}
      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-green-800">useUserManagement</h3>
        <div className="text-sm">
          <p>Expanded Sections: {JSON.stringify(userManagement.expandedSections)}</p>
          <p>Password Modal: {userManagement.showPasswordChangeModal ? 'Open' : 'Closed'}</p>
          <p>Debug Modal: {userManagement.showDebugModal ? 'Open' : 'Closed'}</p>
        </div>
        <div className="mt-2 space-x-2">
          <button 
            onClick={() => userManagement.toggleSection('pharmacists')}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm"
          >
            Toggle Pharmacists
          </button>
          <button 
            onClick={userManagement.openPasswordChangeModal}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
          >
            Open Password Modal
          </button>
        </div>
      </div>

      {/* useShiftManagement テスト */}
      <div className="bg-orange-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-orange-800">useShiftManagement</h3>
        <div className="text-sm">
          <p>Current Date: {shiftManagement.currentDate.toLocaleDateString()}</p>
          <p>Selected Date: {shiftManagement.selectedDate || 'None'}</p>
          <p>Emergency Modal: {shiftManagement.showEmergencyModal ? 'Open' : 'Closed'}</p>
        </div>
        <div className="mt-2 space-x-2">
          <button 
            onClick={() => shiftManagement.updateSelectedDate('2024-01-15')}
            className="px-3 py-1 bg-orange-600 text-white rounded text-sm"
          >
            Set Date
          </button>
          <button 
            onClick={shiftManagement.openEmergencyModal}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm"
          >
            Open Emergency
          </button>
        </div>
      </div>
    </div>
  );
};

export default HookTestComponent;
