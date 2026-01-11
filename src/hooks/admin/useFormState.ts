/**
 * useFormState.ts
 * フォーム状態管理を行うカスタムフック
 */

import { useState, useCallback } from 'react';
import { UserEditForm } from '../../services/admin/UserService';

interface UseFormStateReturn {
  // ユーザー編集
  editingUserId: string | null;
  userEditForm: UserEditForm;
  setEditingUserId: (id: string | null) => void;
  setUserEditForm: (form: UserEditForm | ((prev: UserEditForm) => UserEditForm)) => void;

  // 募集追加
  showAddPosting: boolean;
  newPosting: any;
  setShowAddPosting: (show: boolean) => void;
  setNewPosting: (posting: any | ((prev: any) => any)) => void;

  // 希望追加
  showAddRequest: boolean;
  newRequest: any;
  setShowAddRequest: (show: boolean) => void;
  setNewRequest: (request: any | ((prev: any) => any)) => void;

  // システム状態
  systemStatus: string;
  lastUpdated: Date;
  setSystemStatus: (status: string) => void;
  setLastUpdated: (date: Date) => void;

  // セクション展開状態
  expandedSections: { [key: string]: boolean };
  toggleSection: (section: string) => void;
}

export const useFormState = (): UseFormStateReturn => {
  // ユーザー編集
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userEditForm, setUserEditForm] = useState<UserEditForm>({
    name: '',
    store_names: '',
    ng_list: []
  });

  // 募集追加
  const [showAddPosting, setShowAddPosting] = useState(false);
  const [newPosting, setNewPosting] = useState<any>({
    pharmacy_id: '',
    date: '',
    time_slot: 'fullday',
    start_time: '',
    end_time: '',
    required_staff: 1,
    store_name: '',
    memo: ''
  });

  // 希望追加
  const [showAddRequest, setShowAddRequest] = useState(false);
  const [newRequest, setNewRequest] = useState<any>({
    pharmacist_id: '',
    date: '',
    time_slot: 'fullday',
    start_time: '',
    end_time: '',
    memo: ''
  });

  // システム状態
  const [systemStatus, setSystemStatus] = useState('pending');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // セクション展開状態
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    pharmacies: false,
    pharmacists: false
  });

  /**
   * セクション展開状態を切り替え
   */
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  return {
    editingUserId,
    userEditForm,
    setEditingUserId,
    setUserEditForm,
    showAddPosting,
    newPosting,
    setShowAddPosting,
    setNewPosting,
    showAddRequest,
    newRequest,
    setShowAddRequest,
    setNewRequest,
    systemStatus,
    lastUpdated,
    setSystemStatus,
    setLastUpdated,
    expandedSections,
    toggleSection
  };
};
