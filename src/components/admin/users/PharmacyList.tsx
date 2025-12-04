/**
 * PharmacyList.tsx
 * 薬局一覧表示コンポーネント
 */

import React from 'react';
import { PharmacyCard } from './PharmacyCard';
import { safeLength } from '../../../utils/admin/arrayHelpers';

interface PharmacyListProps {
  pharmacies: any[];
  expanded: boolean;
  editingUserId: string | null;
  editForm: any;
  onToggle: () => void;
  onEditFormChange: (form: any) => void;
  onEdit: (pharmacy: any) => void;
  onSave: (pharmacy: any) => void;
  onCancel: () => void;
  onDelete: (pharmacy: any) => void;
}

export const PharmacyList: React.FC<PharmacyListProps> = ({
  pharmacies,
  expanded,
  editingUserId,
  editForm,
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
          薬局一覧 ({safeLength(pharmacies)}件)
        </span>
        <span className="text-gray-500">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {safeLength(pharmacies) === 0 ? (
            <div className="text-sm text-gray-500">登録されている薬局はありません</div>
          ) : (
            pharmacies.map((pharmacy: any) => (
              <PharmacyCard
                key={pharmacy.id}
                pharmacy={pharmacy}
                isEditing={editingUserId === pharmacy.id}
                editForm={editForm}
                onEditFormChange={onEditFormChange}
                onEdit={() => onEdit(pharmacy)}
                onSave={() => onSave(pharmacy)}
                onCancel={onCancel}
                onDelete={() => onDelete(pharmacy)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};
