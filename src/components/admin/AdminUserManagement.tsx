import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { safeLength } from '../../utils/calendarUtils';

interface AdminUserManagementProps {
  userProfiles: any;
  storeNgPharmacists: {[pharmacyId: string]: any[]};
  storeNgPharmacies: {[pharmacistId: string]: any[]};
  ratings: any[];
  expandedSections: {[key: string]: boolean};
  onToggleSection: (section: string) => void;
  onEditUser: (user: any) => void;
  onDeleteUser: (user: any) => void;
  onSaveEditUser: (user: any) => void;
  onCancelEdit: () => void;
  editingUserId: string | null;
  userEditForm: any;
  setUserEditForm: (form: any) => void;
}

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  userProfiles,
  storeNgPharmacists,
  storeNgPharmacies,
  ratings,
  expandedSections,
  onToggleSection,
  onEditUser,
  onDeleteUser,
  onSaveEditUser,
  onCancelEdit,
  editingUserId,
  userEditForm,
  setUserEditForm
}) => {
  // ユーザーデータを整理する関数
  const getOrganizedUserData = () => {
    const pharmacies: any[] = [];
    const pharmacists: any[] = [];

    Object.entries(userProfiles || {}).forEach(([id, profile]: [string, any]) => {
      if (profile.user_type === 'pharmacy') {
        pharmacies.push({ id, ...profile });
      } else if (profile.user_type === 'pharmacist') {
        pharmacists.push({ id, ...profile });
      }
    });

    return { pharmacies, pharmacists };
  };

  const { pharmacies, pharmacists } = getOrganizedUserData();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">ユーザー管理</h2>
      
      <div className="space-y-4">
        {/* 薬局一覧 */}
        <div className="border border-gray-200 rounded-lg">
          <button
            onClick={() => {
              console.log('Pharmacies section toggle clicked, current state:', expandedSections.pharmacies);
              onToggleSection('pharmacies');
            }}
            className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg flex items-center justify-between"
          >
            <span className="font-medium text-gray-800">
              薬局一覧 ({safeLength(pharmacies)}件)
            </span>
            <span className="text-gray-500">
              {expandedSections.pharmacies ? '▼' : '▶'}
            </span>
          </button>
          
          {expandedSections.pharmacies && (
            <div className="p-4 space-y-3">
              {safeLength(pharmacies) === 0 ? (
                <div className="text-sm text-gray-500">登録されている薬局はありません</div>
              ) : (
                pharmacies.map((pharmacy: any) => {
                  console.log('薬局表示デバッグ:', {
                    pharmacyId: pharmacy.id,
                    pharmacyName: pharmacy.name,
                    pharmacyEmail: pharmacy.email,
                    pharmacyData: pharmacy
                  });
                  
                  return (
                    <div key={pharmacy.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        {editingUserId === pharmacy.id ? (
                          <input
                            className="text-sm border rounded px-2 py-1 w-1/2"
                            value={userEditForm.name}
                            onChange={(e) => setUserEditForm({ ...userEditForm, name: e.target.value })}
                          />
                        ) : (
                          <h4 className="font-medium text-gray-800">{pharmacy.name || pharmacy.email || '名前未設定'}</h4>
                        )}
                        <span className="text-xs text-gray-500">{pharmacy.email}</span>
                      </div>
                      
                      {/* 店舗名 */}
                      <div className="mb-2">
                        <div className="text-xs text-gray-600 mb-1">店舗名:</div>
                        {editingUserId === pharmacy.id ? (
                          <input
                            className="text-xs border rounded px-2 py-1 w-full"
                            placeholder="カンマ区切りで入力 (例: 渋谷,新宿)"
                            value={userEditForm.store_names}
                            onChange={(e) => setUserEditForm({ ...userEditForm, store_names: e.target.value })}
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
                        {editingUserId === pharmacy.id ? (
                          <>
                            <button onClick={() => onSaveEditUser(pharmacy)} className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded">保存</button>
                            <button onClick={onCancelEdit} className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded">キャンセル</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => {
                              console.log('Edit button clicked for pharmacy:', pharmacy.id);
                              onEditUser(pharmacy);
                            }} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">編集</button>
                            <button onClick={() => {
                              console.log('Delete button clicked for pharmacy:', pharmacy);
                              onDeleteUser(pharmacy);
                            }} className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">削除</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* 薬剤師一覧 */}
        <div className="border border-gray-200 rounded-lg">
          <button
            onClick={() => onToggleSection('pharmacists')}
            className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg flex items-center justify-between"
          >
            <span className="font-medium text-gray-800">
              薬剤師一覧 ({safeLength(pharmacists)}件)
            </span>
            <span className="text-gray-500">
              {expandedSections.pharmacists ? '▼' : '▶'}
            </span>
          </button>
          
          {expandedSections.pharmacists && (
            <div className="p-4 space-y-3">
              {safeLength(pharmacists) === 0 ? (
                <div className="text-sm text-gray-500">登録されている薬剤師はありません</div>
              ) : (
                pharmacists.map((pharmacist: any) => {
                  console.log('薬剤師表示デバッグ:', {
                    pharmacistId: pharmacist.id,
                    pharmacistName: pharmacist.name,
                    pharmacistEmail: pharmacist.email,
                    pharmacistData: pharmacist
                  });
                  console.log('薬剤師名前詳細:', {
                    id: pharmacist.id,
                    name: pharmacist.name,
                    email: pharmacist.email,
                    hasName: !!pharmacist.name,
                    nameIsEmpty: !pharmacist.name || pharmacist.name.trim() === '',
                    nameIsEmail: pharmacist.name === pharmacist.email?.split('@')[0],
                    displayName: pharmacist.name || pharmacist.email || '名前未設定'
                  });
                  
                  return (
                    <div key={pharmacist.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        {editingUserId === pharmacist.id ? (
                          <input
                            className="text-sm border rounded px-2 py-1 w-1/2"
                            value={userEditForm.name}
                            onChange={(e) => setUserEditForm({ ...userEditForm, name: e.target.value })}
                          />
                        ) : (
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-800">
                              {pharmacist.name && pharmacist.name.trim() !== '' 
                                ? pharmacist.name 
                                : pharmacist.email || '名前未設定'
                              }
                            </h4>
                            {(() => {
                              const pharmacistRatings = Array.isArray(ratings) ? ratings.filter(r => r.pharmacist_id === pharmacist.id) : [];
                              if (safeLength(pharmacistRatings) > 0) {
                                const average = pharmacistRatings.reduce((sum, r) => sum + r.rating, 0) / safeLength(pharmacistRatings);
                                return (
                                  <div className="flex items-center space-x-1">
                                    <div className="flex">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`w-3 h-3 ${
                                            star <= Math.round(average)
                                              ? 'text-yellow-400 fill-current'
                                              : 'text-gray-300'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      {average.toFixed(1)}/5 ({safeLength(pharmacistRatings)}件)
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <span className="text-xs text-gray-400 px-2 py-1 rounded bg-gray-100">
                                  評価なし
                                </span>
                              );
                            })()}
                          </div>
                        )}
                        <span className="text-xs text-gray-500">{pharmacist.email}</span>
                      </div>
                      
                      {/* NG薬局・店舗リスト */}
                      <div>
                        <div className="text-xs text-gray-600 mb-1">NG薬局・店舗:</div>
                        {editingUserId === pharmacist.id ? (
                          <div className="space-y-2">
                            {Object.entries(userProfiles || {})
                              .filter(([_, profile]: [string, any]) => (profile as any).user_type === 'pharmacy')
                              .map(([id, profile]: [string, any]) => {
                                const pharmacyName = (profile as any).name || (profile as any).email || id;
                                // 薬局全体が選択されているか、または個別店舗が選択されているかをチェック
                                const isPharmacySelected = userEditForm.ng_list.includes(id);
                                const hasIndividualStores = userEditForm.ng_list.some((ngId: string) => ngId.startsWith(`${id}_`));
                                const checked = isPharmacySelected || hasIndividualStores;
                                
                                return (
                                  <div key={id} className="border rounded p-2">
                                    <label className="inline-flex items-center gap-1 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        className="accent-red-600"
                                        checked={checked}
                                        onChange={(e) => {
                                          const next = new Set<string>(userEditForm.ng_list);
                                          
                                          if (e.target.checked) {
                                            // 薬局全体を選択する場合
                                            // 1. 薬局IDを追加
                                            next.add(id);
                                            // 2. その薬局の店舗個別選択は削除しない（全店舗選択として扱う）
                                          } else {
                                            // 薬局全体の選択を解除する場合
                                            next.delete(id);
                                            // その薬局の店舗個別選択もすべて削除
                                            const pharmacyProfile = userProfiles[id];
                                            const storeNames = pharmacyProfile?.store_names || ['本店'];
                                            storeNames.forEach((storeName: string) => {
                                              next.delete(`${id}_${storeName}`);
                                            });
                                          }
                                          
                                          setUserEditForm({ ...userEditForm, ng_list: Array.from(next) });
                                        }}
                                      />
                                      <span className="font-medium">{pharmacyName}</span>
                                    </label>
                                    
                                    {/* 店舗選択 */}
                                    <div className="ml-6 mt-1 space-y-1">
                                      {((profile as any).store_names || ['本店']).map((storeName: string) => {
                                        const storeId = `${id}_${storeName}`;
                                        const isStoreSelected = userEditForm.ng_list.includes(storeId);
                                        const isPharmacySelectedForStore = userEditForm.ng_list.includes(id);
                                        const storeChecked = isStoreSelected;
                                        
                                        return (
                                          <label key={storeId} className="inline-flex items-center gap-1 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              className="accent-red-600"
                                              checked={storeChecked}
                                              disabled={false}
                                              onChange={(e) => {
                                                const next = new Set<string>(userEditForm.ng_list);
                                                
                                                if (e.target.checked) {
                                                  // 店舗を選択する場合
                                                  next.add(storeId);
                                                  // 薬局全体の選択は削除（個別店舗選択が優先）
                                                  next.delete(id);
                                                } else {
                                                  // 店舗選択を解除する場合
                                                  next.delete(storeId);
                                                  // その薬局の他の店舗が選択されているかチェック
                                                  const otherStoresSelected = ((profile as any).store_names || ['本店'])
                                                    .filter((name: string) => name !== storeName)
                                                    .some((name: string) => next.has(`${id}_${name}`));
                                                  
                                                  // 他の店舗が選択されていない場合、薬局全体の選択も削除
                                                  if (!otherStoresSelected) {
                                                    next.delete(id);
                                                  }
                                                }
                                                
                                                setUserEditForm({ ...userEditForm, ng_list: Array.from(next) });
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
                            {(() => {
                              // store_ng_pharmaciesテーブルからNG薬局情報を取得
                              const ngPharmacies = storeNgPharmacies[pharmacist.id] || [];
                              
                              // デバッグログ
                              console.log('NG薬局表示デバッグ:', {
                                pharmacistId: pharmacist.id,
                                pharmacistName: pharmacist.name,
                                ngPharmacies: ngPharmacies,
                                storeNgPharmacies: storeNgPharmacies,
                                storeNgPharmaciesKeys: Object.keys(storeNgPharmacies || {}),
                                allPharmacistIds: Object.keys(userProfiles || {}).filter(id => userProfiles[id]?.user_type === 'pharmacist')
                              });
                              
                              if (safeLength(ngPharmacies) === 0) {
                                return <span className="text-gray-400">NG設定なし</span>;
                              }
                              
                              return (
                                <div className="space-y-1">
                                  {ngPharmacies.map((ngPharmacy: any, index: number) => {
                                    const pharmacyName = userProfiles[ngPharmacy.pharmacy_id]?.name || 'Unknown';
                                    const storeName = ngPharmacy.store_name || '本店';
                                    return (
                                      <div key={index} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">
                                        {pharmacyName} - {storeName}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        {editingUserId === pharmacist.id ? (
                          <>
                            <button onClick={() => onSaveEditUser(pharmacist)} className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded">保存</button>
                            <button onClick={onCancelEdit} className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded">キャンセル</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => {
                              console.log('Edit button clicked for pharmacist:', pharmacist.id);
                              onEditUser(pharmacist);
                            }} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">編集</button>
                            <button onClick={() => {
                              console.log('Delete button clicked for pharmacist:', pharmacist);
                              onDeleteUser(pharmacist);
                            }} className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">削除</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserManagement;
