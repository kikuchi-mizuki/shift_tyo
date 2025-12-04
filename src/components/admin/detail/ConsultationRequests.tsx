/**
 * ConsultationRequests.tsx
 * 要相談リクエスト表示コンポーネント
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { safeLength } from '../../../utils/admin/arrayHelpers';

interface ConsultationRequestsProps {
  consultRequests: any[];
  userProfiles: any;
}

export const ConsultationRequests: React.FC<ConsultationRequestsProps> = ({
  consultRequests,
  userProfiles
}) => {
  if (safeLength(consultRequests) === 0) {
    return null;
  }

  return (
    <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
      <div className="flex items-center space-x-2 mb-3">
        <AlertCircle className="w-4 h-4 text-purple-600" />
        <h4 className="text-sm font-semibold text-purple-800">
          要相談リクエスト ({safeLength(consultRequests)}件)
        </h4>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {consultRequests.map((request: any, index: number) => {
          const pharmacistProfile = userProfiles[request.pharmacist_id];
          return (
            <div key={index} className="bg-white rounded border px-2 py-1">
              <div className="text-xs text-gray-800 leading-snug break-words">
                {pharmacistProfile?.name || pharmacistProfile?.email || '薬剤師未設定'}
              </div>
              {request.memo && (
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {request.memo}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
