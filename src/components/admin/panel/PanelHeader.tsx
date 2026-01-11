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
    <div className="flex-shrink-0 p-1">
      <div className="flex items-center justify-end">
        <button
          onClick={onPasswordChange}
          className="text-xs text-gray-600 hover:text-purple-600 flex items-center space-x-1 px-2 py-1"
        >
          <Lock className="w-3 h-3" />
          <span>パスワード変更</span>
        </button>
      </div>
    </div>
  );
};
