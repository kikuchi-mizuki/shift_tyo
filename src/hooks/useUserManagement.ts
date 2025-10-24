import { useState } from 'react';
import { supabase } from '../lib/supabase';

export interface UserManagementState {
  expandedSections: {[key: string]: boolean};
  showPasswordChangeModal: boolean;
  showDebugModal: boolean;
  debugData: any;
}

export const useUserManagement = () => {
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    pharmacies: false,
    pharmacists: false
  });
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleDebugModal = async () => {
    try {
      // 現在の日付のデバッグデータを収集
      const currentDate = new Date().toISOString().split('T')[0];
      
      const [requestsData, postingsData, assignedData] = await Promise.all([
        supabase.from('shift_requests').select('*').eq('date', currentDate),
        supabase.from('shift_postings').select('*').eq('date', currentDate),
        supabase.from('shifts').select('*').eq('date', currentDate)
      ]);

      const debugInfo = {
        date: currentDate,
        requests: requestsData.data || [],
        postings: postingsData.data || [],
        assigned: assignedData.data || [],
        timestamp: new Date().toISOString()
      };

      setDebugData(debugInfo);
      setShowDebugModal(true);
    } catch (error) {
      console.error('Error collecting debug data:', error);
    }
  };

  const saveEditUser = async (profile: any) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          address: profile.address,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;
      console.log('✅ User profile updated successfully');
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  };

  const deleteUser = async (profile: any) => {
    try {
      // 関連データの削除
      await Promise.all([
        supabase.from('shift_requests').delete().eq('pharmacist_id', profile.id),
        supabase.from('shift_postings').delete().eq('pharmacy_id', profile.id),
        supabase.from('shifts').delete().or(`pharmacist_id.eq.${profile.id},pharmacy_id.eq.${profile.id}`),
        supabase.from('pharmacist_ratings').delete().eq('pharmacist_id', profile.id)
      ]);

      // ユーザープロファイルの削除
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', profile.id);

      if (error) throw error;
      console.log('✅ User deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  };

  const openPasswordChangeModal = () => {
    setShowPasswordChangeModal(true);
  };

  const closePasswordChangeModal = () => {
    setShowPasswordChangeModal(false);
  };

  const openDebugModal = () => {
    handleDebugModal();
  };

  const closeDebugModal = () => {
    setShowDebugModal(false);
    setDebugData(null);
  };

  return {
    // State
    expandedSections,
    showPasswordChangeModal,
    showDebugModal,
    debugData,
    
    // Setters
    setExpandedSections,
    setShowPasswordChangeModal,
    setShowDebugModal,
    setDebugData,
    
    // Functions
    toggleSection,
    handleDebugModal,
    saveEditUser,
    deleteUser,
    openPasswordChangeModal,
    closePasswordChangeModal,
    openDebugModal,
    closeDebugModal
  };
};
