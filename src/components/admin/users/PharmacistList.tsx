/**
 * PharmacistList.tsx
 * 薬剤師一覧表示コンポーネント
 */

import React from 'react';
import { PharmacistCard } from './PharmacistCard';
import { safeLength } from '../../../utils/admin/arrayHelpers';

interface PharmacistListProps {
  pharmacists: any[];
  ratings: any[];
  storeNgPharmacies: { [pharmacistId: string]: any[] };
  expanded: boolean;
  editingUserId: string | null;
  editForm: any;
  userProfiles: any;
  onToggle: () => void;
  onEditFormChange: (form: any) => void;
  onEdit: (pharmacist: any) => void;
  onSave: (pharmacist: any) => void;
  onCancel: () => void;
  onDelete: (pharmacist: any) => void;
}

export const PharmacistList: React.FC<PharmacistListProps> = ({
  pharmacists,
  ratings,
  storeNgPharmacies,
  expanded,
  editingUserId,
  editForm,
  userProfiles,
  onToggle,
  onEditFormChange,
  onEdit,
  onSave,
  onCancel,
  onDelete
}) => {
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg flex items-center justify-between"
      >
        <span className="font-medium text-gray-800">
          薬剤師一覧 ({safeLength(pharmacists)}件)
        </span>
        <span className="text-gray-500">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {safeLength(pharmacists) === 0 ? (
            <div className="text-sm text-gray-500">登録されている薬剤師はありません</div>
          ) : (
            pharmacists.map((pharmacist: any) => (
              <PharmacistCard
                key={pharmacist.id}
                pharmacist={pharmacist}
                ratings={ratings}
                ngPharmacies={storeNgPharmacies[pharmacist.id] || []}
                isEditing={editingUserId === pharmacist.id}
                editForm={editForm}
                userProfiles={userProfiles}
                onEditFormChange={onEditFormChange}
                onEdit={() => onEdit(pharmacist)}
                onSave={() => onSave(pharmacist)}
                onCancel={onCancel}
                onDelete={() => onDelete(pharmacist)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};
