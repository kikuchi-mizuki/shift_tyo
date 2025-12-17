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
    <div className="bg-purple-600 text-white p-4 rounded-t-lg flex-shrink-0">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">管理者パネル</h2>
        <div className="flex space-x-2">
          <button
            onClick={onPasswordChange}
            className="text-sm text-blue-100 hover:text-white flex items-center space-x-1"
          >
            <Lock className="w-3 h-3" />
            <span>パスワード変更</span>
          </button>
        </div>
      </div>
    </div>
  );
};
