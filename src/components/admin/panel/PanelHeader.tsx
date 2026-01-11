/**
 * PanelHeader.tsx
 * 管理者パネルヘッダーコンポーネント
 */

import React from 'react';
import { Lock } from 'lucide-react';

interface PanelHeaderProps {
  onPasswordChange: () => void;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  onPasswordChange
}) => {
  return (
    <div className="bg-purple-600 text-white p-2 rounded-t-lg flex-shrink-0">
      <div className="flex items-center justify-end">
        <button
          onClick={onPasswordChange}
          className="text-xs text-blue-100 hover:text-white flex items-center space-x-1 px-2 py-1"
        >
          <Lock className="w-3 h-3" />
          <span>パスワード変更</span>
        </button>
      </div>
    </div>
  );
};
