import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import EmergencyShiftRequest from '../EmergencyShiftRequest';

interface AdminEmergencyShiftProps {
  className?: string;
}

const AdminEmergencyShift: React.FC<AdminEmergencyShiftProps> = ({ className = '' }) => {
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const handleEmergencyButtonClick = () => {
    console.error('=== EMERGENCY BUTTON CLICKED ===');
    console.error('Setting showEmergencyModal to true');
    setShowEmergencyModal(true);
  };

  const handleCloseModal = () => {
    console.error('=== CLOSING EMERGENCY MODAL ===');
    setShowEmergencyModal(false);
  };

  return (
    <div className={className}>
      {/* 緊急シフトリクエスト機能 */}
      <div className="flex justify-end">
        <button
          onClick={handleEmergencyButtonClick}
          className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          <Bell className="w-5 h-5" />
          LINEで呼びかける
        </button>
      </div>

      {/* 緊急シフトモーダル */}
      {showEmergencyModal && (
        (() => {
          console.error('=== RENDERING EMERGENCY MODAL ===');
          console.error('showEmergencyModal is true, rendering EmergencyShiftRequest');
          return (
            <EmergencyShiftRequest onClose={handleCloseModal} />
          );
        })()
      )}
    </div>
  );
};

export default AdminEmergencyShift;
