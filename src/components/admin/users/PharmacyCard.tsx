/**
 * PharmacyCard.tsx
 * 薬局カードコンポーネント
 */

import React from 'react';
import { safeLength } from '../../../utils/admin/arrayHelpers';

interface PharmacyCardProps {
  pharmacy: any;
  isEditing: boolean;
  editForm: any;
  onEditFormChange: (form: any) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export const PharmacyCard: React.FC<PharmacyCardProps> = React.memo(({
  pharmacy,
  isEditing,
  editForm,
  onEditFormChange,
  onEdit,
  onSave,
  onCancel,
  onDelete
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        {isEditing ? (
          <input
            className="text-sm border rounded px-2 py-1 w-1/2"
            value={editForm.name}
            onChange={(e) => onEditFormChange({ ...editForm, name: e.target.value })}
          />
        ) : (
          <h4 className="font-medium text-gray-800">
            {pharmacy.name || pharmacy.email || '名前未設定'}
          </h4>
        )}
        <span className="text-xs text-gray-500">{pharmacy.email}</span>
      </div>

      {/* 店舗名 */}
      <div className="mb-2">
        <div className="text-xs text-gray-600 mb-1">店舗名:</div>
        {isEditing ? (
          <input
            className="text-xs border rounded px-2 py-1 w-full"
            placeholder="カンマ区切りで入力 (例: 渋谷,新宿)"
            value={editForm.store_names}
            onChange={(e) => onEditFormChange({ ...editForm, store_names: e.target.value })}
          />
        ) : (
          <div className="text-sm">
            {pharmacy.store_names && safeLength(pharmacy.store_names) > 0 ? (
              <div className="flex flex-wrap gap-1">
                {pharmacy.store_names.map((storeName: string, idx: number) => (
                  <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    {storeName}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-500">未設定</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {isEditing ? (
          <>
            <button onClick={onSave} className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded">
              保存
            </button>
            <button onClick={onCancel} className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded">
              キャンセル
            </button>
          </>
        ) : (
          <>
            <button onClick={onEdit} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">
              編集
            </button>
            <button onClick={onDelete} className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
              削除
            </button>
          </>
        )}
      </div>
    </div>
  );
});
