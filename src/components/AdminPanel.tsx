import React, { useState } from 'react';
import { Shield, RotateCcw } from 'lucide-react';
import { SystemStatus, AssignedShift, ShiftRequest, ShiftPosting } from '../types';

interface AdminPanelProps {
  systemStatus: SystemStatus;
  onStatusChange?: (status: SystemStatus['currentPhase']) => void;
  onRegenerateSchedule: () => void;
  shifts?: AssignedShift[];
  requests?: ShiftRequest[];
  postings?: ShiftPosting[];
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  systemStatus,
  _onStatusChange,
  onRegenerateSchedule,
  _shifts,
  _requests,
  _postings
}) => {
  const [_isRegenerating, _setIsRegenerating] = useState(false);


  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6" />
          <h2 className="text-2xl font-bold">管理者パネル</h2>
        </div>
        <p className="text-purple-100 mt-2">システム全体の状態管理と調整</p>
      </div>

      <div className="p-6">
        {/* 操作パネル */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">システム操作</h3>
          <div className="space-y-3">
            <button
              onClick={onRegenerateSchedule}
              disabled={isRegenerating}
              className={`w-full flex items-center justify-center space-x-2 py-3 px-6 rounded-lg font-medium focus:ring-4 transition-all duration-200 disabled:opacity-50 ${
                systemStatus.currentPhase === 'confirmed' 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-200'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>
                {systemStatus.currentPhase === 'confirmed' ? 'シフト確定済み' :
                 'シフト確定・調整実行'}
              </span>
            </button>
            
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <strong>注意:</strong> シフト確定を実行すると、現在の仮シフトが最終確定され、
              変更できなくなります。慎重に実行してください。
            </div>
          </div>
        </div>

        {/* 最終更新情報 */}
        <div className="text-sm text-gray-500 border-t border-gray-200 pt-4">
          最終更新: {new Date(systemStatus.lastUpdated).toLocaleString('ja-JP')}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
