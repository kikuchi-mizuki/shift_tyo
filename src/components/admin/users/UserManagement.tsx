/**
 * UserManagement.tsx
 * ユーザー管理コンテナコンポーネント
 */

import React from 'react';
import { PharmacyList } from './PharmacyList';
import { PharmacistList } from './PharmacistList';

interface UserManagementProps {
  pharmacies: any[];
  pharmacists: any[];
  ratings: any[];
  storeNgPharmacies: { [pharmacistId: string]: any[] };
  expandedSections: { pharmacies: boolean; pharmacists: boolean };
  editingUserId: string | null;
  userEditForm: any;
  userProfiles: any;
  onToggleSection: (section: 'pharmacies' | 'pharmacists') => void;
  onEditFormChange: (form: any) => void;
  onEdit: (user: any) => void;
  onSave: (user: any) => void;
  onCancel: () => void;
  onDelete: (user: any) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  pharmacies,
  pharmacists,
  ratings,
  storeNgPharmacies,
  expandedSections,
  editingUserId,
  userEditForm,
  userProfiles,
  onToggleSection,
  onEditFormChange,
  onEdit,
  onSave,
  onCancel,
  onDelete
}) => {
  return (
    <div className="space-y-4">
      <PharmacyList
        pharmacies={pharmacies}
        expanded={expandedSections.pharmacies}
        editingUserId={editingUserId}
        editForm={userEditForm}
        onToggle={() => onToggleSection('pharmacies')}
        onEditFormChange={onEditFormChange}
        onEdit={onEdit}
        onSave={onSave}
        onCancel={onCancel}
        onDelete={onDelete}
      />

      <PharmacistList
        pharmacists={pharmacists}
        ratings={ratings}
        storeNgPharmacies={storeNgPharmacies}
        expanded={expandedSections.pharmacists}
        editingUserId={editingUserId}
        editForm={userEditForm}
        userProfiles={userProfiles}
        onToggle={() => onToggleSection('pharmacists')}
        onEditFormChange={onEditFormChange}
        onEdit={onEdit}
        onSave={onSave}
        onCancel={onCancel}
        onDelete={onDelete}
      />
    </div>
  );
};
