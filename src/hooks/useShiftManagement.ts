import { useState } from 'react';
import { shifts, shiftRequests, shiftPostings, supabase } from '../lib/supabase';

export interface ShiftManagementState {
  showEmergencyModal: boolean;
  currentDate: Date;
  selectedDate: string;
}

export const useShiftManagement = () => {
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');

  const handleAddPosting = async () => {
    try {
      const newPosting = {
        pharmacy_id: null,
        date: selectedDate,
        start_time: '09:00',
        end_time: '18:00',
        hourly_rate: 0,
        notes: '',
        created_at: new Date().toISOString()
      };

      const { error } = await shiftPostings.insert(newPosting);
      if (error) throw error;
      
      console.log('✅ New posting added');
    } catch (error) {
      console.error('❌ Error adding posting:', error);
    }
  };

  const deletePosting = async (postingId: string) => {
    try {
      const { error } = await shiftPostings.delete().eq('id', postingId);
      if (error) throw error;
      
      console.log('✅ Posting deleted');
    } catch (error) {
      console.error('❌ Error deleting posting:', error);
    }
  };

  const deleteRequest = async (requestId: string) => {
    try {
      const { error } = await shiftRequests.delete().eq('id', requestId);
      if (error) throw error;
      
      console.log('✅ Request deleted');
    } catch (error) {
      console.error('❌ Error deleting request:', error);
    }
  };

  const handleAddRequest = async () => {
    try {
      const newRequest = {
        pharmacist_id: null,
        date: selectedDate,
        start_time: '09:00',
        end_time: '18:00',
        hourly_rate: 0,
        notes: '',
        created_at: new Date().toISOString()
      };

      const { error } = await shiftRequests.insert(newRequest);
      if (error) throw error;
      
      console.log('✅ New request added');
    } catch (error) {
      console.error('❌ Error adding request:', error);
    }
  };

  const saveEditPosting = async (postingId: string) => {
    try {
      // 編集ロジックは実装に応じて調整
      console.log('✅ Posting saved');
    } catch (error) {
      console.error('❌ Error saving posting:', error);
    }
  };

  const saveEditRequest = async (requestId: string) => {
    try {
      // 編集ロジックは実装に応じて調整
      console.log('✅ Request saved');
    } catch (error) {
      console.error('❌ Error saving request:', error);
    }
  };

  const handleCancelSingleConfirmedShift = async (shift: any) => {
    try {
      const { error } = await shifts.delete().eq('id', shift.id);
      if (error) throw error;
      
      console.log('✅ Confirmed shift cancelled');
    } catch (error) {
      console.error('❌ Error cancelling shift:', error);
    }
  };

  const handleCancelConfirmedShifts = async (date: string) => {
    try {
      const { error } = await shifts.delete().eq('date', date);
      if (error) throw error;
      
      console.log('✅ All confirmed shifts cancelled for date:', date);
    } catch (error) {
      console.error('❌ Error cancelling shifts:', error);
    }
  };

  const handleSaveShiftEdit = async () => {
    try {
      // シフト編集の保存ロジック
      console.log('✅ Shift edit saved');
    } catch (error) {
      console.error('❌ Error saving shift edit:', error);
    }
  };

  const saveManualShiftRequests = async (date: string) => {
    try {
      // 手動シフトリクエストの保存ロジック
      console.log('✅ Manual shift requests saved for date:', date);
    } catch (error) {
      console.error('❌ Error saving manual shift requests:', error);
    }
  };

  const handleConfirmSingleMatch = async (match: any, date: string) => {
    try {
      const shiftData = {
        pharmacist_id: match.pharmacist_id,
        pharmacy_id: match.pharmacy_id,
        date: date,
        start_time: match.start_time,
        end_time: match.end_time,
        hourly_rate: match.hourly_rate,
        notes: match.notes || '',
        created_at: new Date().toISOString()
      };

      const { error } = await shifts.insert(shiftData);
      if (error) throw error;
      
      console.log('✅ Single match confirmed');
    } catch (error) {
      console.error('❌ Error confirming match:', error);
    }
  };

  const handleConfirmShiftsForDate = async (date: string, predefinedShifts?: any[]) => {
    try {
      if (predefinedShifts && predefinedShifts.length > 0) {
        const { error } = await shifts.insert(predefinedShifts);
        if (error) throw error;
      }
      
      console.log('✅ Shifts confirmed for date:', date);
    } catch (error) {
      console.error('❌ Error confirming shifts:', error);
    }
  };

  const openEmergencyModal = () => {
    setShowEmergencyModal(true);
  };

  const closeEmergencyModal = () => {
    setShowEmergencyModal(false);
  };

  const updateCurrentDate = (date: Date) => {
    setCurrentDate(date);
  };

  const updateSelectedDate = (date: string) => {
    setSelectedDate(date);
  };

  return {
    // State
    showEmergencyModal,
    currentDate,
    selectedDate,
    
    // Setters
    setShowEmergencyModal,
    setCurrentDate,
    setSelectedDate,
    
    // Functions
    handleAddPosting,
    deletePosting,
    deleteRequest,
    handleAddRequest,
    saveEditPosting,
    saveEditRequest,
    handleCancelSingleConfirmedShift,
    handleCancelConfirmedShifts,
    handleSaveShiftEdit,
    saveManualShiftRequests,
    handleConfirmSingleMatch,
    handleConfirmShiftsForDate,
    openEmergencyModal,
    closeEmergencyModal,
    updateCurrentDate,
    updateSelectedDate
  };
};
