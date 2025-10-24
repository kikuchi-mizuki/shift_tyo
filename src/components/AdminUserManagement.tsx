import React from 'react';
import { User, Building, Edit, Trash2, Lock, Settings } from 'lucide-react';

interface AdminUserManagementProps {
  userProfiles: any;
  expandedSections: {[key: string]: boolean};
  onToggleSection: (section: string) => void;
  onEditUser: (user: any) => void;
  onDeleteUser: (user: any) => void;
  onOpenPasswordChange: () => void;
  onOpenDebugModal: () => void;
}

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  userProfiles,
  expandedSections,
  onToggleSection,
  onEditUser,
  onDeleteUser,
  onOpenPasswordChange,
  onOpenDebugModal
}) => {
  const pharmacists = Object.values(userProfiles).filter((profile: any) => profile.user_type === 'pharmacist');
  const pharmacies = Object.values(userProfiles).filter((profile: any) => profile.user_type === 'pharmacy');

  return (
    <div className="space-y-6">
      {/* 管理機能ボタン */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center">
            <Settings className="h-5 w-5 mr-2 text-gray-600" />
            管理機能
          </h3>
          
          <div className="flex space-x-2">
            <button
              onClick={onOpenPasswordChange}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Lock className="h-4 w-4 mr-2" />
              パスワード変更
            </button>
            
            <button
              onClick={onOpenDebugModal}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center"
            >
              <Settings className="h-4 w-4 mr-2" />
              デバッグ
            </button>
          </div>
        </div>
      </div>

      {/* 薬剤師管理 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div
          className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
          onClick={() => onToggleSection('pharmacists')}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              薬剤師管理 ({pharmacists.length}名)
            </h3>
            <div className="text-sm text-gray-500">
              {expandedSections.pharmacists ? '閉じる' : '開く'}
            </div>
          </div>
        </div>
        
        {expandedSections.pharmacists && (
          <div className="p-4">
            <div className="space-y-3">
              {pharmacists.map((pharmacist: any) => (
                <div key={pharmacist.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{pharmacist.name}</div>
                      <div className="text-sm text-gray-600">{pharmacist.email}</div>
                      <div className="text-sm text-gray-600">{pharmacist.phone}</div>
                      {pharmacist.address && (
                        <div className="text-sm text-gray-600">{pharmacist.address}</div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onEditUser(pharmacist)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDeleteUser(pharmacist)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {pharmacists.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  登録された薬剤師はいません
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 薬局管理 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div
          className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
          onClick={() => onToggleSection('pharmacies')}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center">
              <Building className="h-5 w-5 mr-2 text-green-600" />
              薬局管理 ({pharmacies.length}件)
            </h3>
            <div className="text-sm text-gray-500">
              {expandedSections.pharmacies ? '閉じる' : '開く'}
            </div>
          </div>
        </div>
        
        {expandedSections.pharmacies && (
          <div className="p-4">
            <div className="space-y-3">
              {pharmacies.map((pharmacy: any) => (
                <div key={pharmacy.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{pharmacy.name}</div>
                      <div className="text-sm text-gray-600">{pharmacy.email}</div>
                      <div className="text-sm text-gray-600">{pharmacy.phone}</div>
                      {pharmacy.address && (
                        <div className="text-sm text-gray-600">{pharmacy.address}</div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onEditUser(pharmacy)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDeleteUser(pharmacy)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {pharmacies.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  登録された薬局はありません
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserManagement;
