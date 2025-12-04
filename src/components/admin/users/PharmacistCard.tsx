/**
 * PharmacistCard.tsx
 * 薬剤師カードコンポーネント
 */

import React from 'react';
import { Star } from 'lucide-react';
import { safeLength } from '../../../utils/admin/arrayHelpers';

interface PharmacistCardProps {
  pharmacist: any;
  ratings: any[];
  ngPharmacies: any[];
  isEditing: boolean;
  editForm: any;
  userProfiles: any;
  onEditFormChange: (form: any) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export const PharmacistCard: React.FC<PharmacistCardProps> = ({
  pharmacist,
  ratings,
  ngPharmacies,
  isEditing,
  editForm,
  userProfiles,
  onEditFormChange,
  onEdit,
  onSave,
  onCancel,
  onDelete
}) => {
  // 評価を計算
  const pharmacistRatings = ratings.filter(r => r.pharmacist_id === pharmacist.id);
  const hasRatings = safeLength(pharmacistRatings) > 0;
  const averageRating = hasRatings
    ? pharmacistRatings.reduce((sum, r) => sum + r.rating, 0) / safeLength(pharmacistRatings)
    : 0;

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
          <div className="flex items-center space-x-2">
            <h4 className="font-medium text-gray-800">
              {pharmacist.name && pharmacist.name.trim() !== ''
                ? pharmacist.name
                : pharmacist.email || '名前未設定'}
            </h4>
            {hasRatings ? (
              <div className="flex items-center space-x-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3 h-3 ${
                        star <= Math.round(averageRating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {averageRating.toFixed(1)}/5 ({safeLength(pharmacistRatings)}件)
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-400 px-2 py-1 rounded bg-gray-100">
                評価なし
              </span>
            )}
          </div>
        )}
        <span className="text-xs text-gray-500">{pharmacist.email}</span>
      </div>

      {/* NG薬局・店舗リスト */}
      <div>
        <div className="text-xs text-gray-600 mb-1">NG薬局・店舗:</div>
        {isEditing ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(userProfiles || {})
              .filter(([_, profile]: [string, any]) => profile.user_type === 'pharmacy')
              .map(([id, profile]: [string, any]) => {
                const pharmacyName = profile.name || profile.email || id;
                const isPharmacySelected = editForm.ng_list.includes(id);
                const hasIndividualStores = editForm.ng_list.some((ngId: string) => ngId.startsWith(`${id}_`));
                const checked = isPharmacySelected || hasIndividualStores;

                return (
                  <div key={id} className="border rounded p-2">
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-red-600"
                        checked={checked}
                        onChange={(e) => {
                          const next = new Set<string>(editForm.ng_list);
                          if (e.target.checked) {
                            next.add(id);
                          } else {
                            next.delete(id);
                            const storeNames = profile.store_names || ['本店'];
                            storeNames.forEach((storeName: string) => {
                              next.delete(`${id}_${storeName}`);
                            });
                          }
                          onEditFormChange({ ...editForm, ng_list: Array.from(next) });
                        }}
                      />
                      <span className="font-medium">{pharmacyName}</span>
                    </label>

                    {/* 店舗選択 */}
                    <div className="ml-6 mt-1 space-y-1">
                      {(profile.store_names || ['本店']).map((storeName: string) => {
                        const storeId = `${id}_${storeName}`;
                        const storeChecked = editForm.ng_list.includes(storeId);

                        return (
                          <label key={storeId} className="inline-flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              className="accent-red-600"
                              checked={storeChecked}
                              onChange={(e) => {
                                const next = new Set<string>(editForm.ng_list);
                                if (e.target.checked) {
                                  next.add(storeId);
                                  next.delete(id);
                                } else {
                                  next.delete(storeId);
                                }
                                onEditFormChange({ ...editForm, ng_list: Array.from(next) });
                              }}
                            />
                            <span className="text-xs">{storeName}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-sm">
            {safeLength(ngPharmacies) === 0 ? (
              <span className="text-gray-400">NG設定なし</span>
            ) : (
              <div className="space-y-1">
                {ngPharmacies.map((ngPharmacy: any, index: number) => {
                  const pharmacyName = userProfiles[ngPharmacy.pharmacy_id]?.name || 'Unknown';
                  const storeName = ngPharmacy.store_name || '本店';
                  return (
                    <div key={index} className="text-xs bg-red-50 text-red-800 px-2 py-1 rounded">
                      {pharmacyName} - {storeName}
                    </div>
                  );
                })}
              </div>
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
};
