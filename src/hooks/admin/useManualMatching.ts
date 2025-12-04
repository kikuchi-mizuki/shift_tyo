/**
 * useManualMatching.ts
 * 手動マッチング管理を行うカスタムフック
 */

import { useState, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { safeLength, safeObject } from '../../utils/admin/arrayHelpers';

interface UseManualMatchingReturn {
  manualMatches: { [pharmacyId: string]: string[] };
  handlePharmacistSelection: (pharmacyId: string, pharmacistId: string, isSelected: boolean) => void;
  saveManualShiftRequests: (date: string, postings: any[]) => Promise<void>;
  clearManualMatches: () => void;
}

export const useManualMatching = (
  supabase: SupabaseClient
): UseManualMatchingReturn => {
  const [manualMatches, setManualMatches] = useState<{ [pharmacyId: string]: string[] }>({});

  /**
   * 薬剤師選択ハンドラー
   */
  const handlePharmacistSelection = useCallback(
    (pharmacyId: string, pharmacistId: string, isSelected: boolean) => {
      setManualMatches(prev => {
        const current = prev[pharmacyId] || [];
        if (isSelected) {
          return { ...prev, [pharmacyId]: [...current, pharmacistId] };
        } else {
          return { ...prev, [pharmacyId]: current.filter(id => id !== pharmacistId) };
        }
      });
    },
    []
  );

  /**
   * 手動マッチングを希望シフトとして保存
   */
  const saveManualShiftRequests = useCallback(
    async (date: string, postings: any[]) => {
      try {
        const shiftRequests: any[] = [];

        if (!manualMatches || Object.keys(safeObject(manualMatches)).length === 0) {
          alert('希望シフトとして保存する薬剤師が選択されていません。');
          return;
        }

        // 各薬局のマッチングを処理
        for (const [pharmacyId, pharmacistIds] of Object.entries(manualMatches)) {
          if (!Array.isArray(pharmacistIds) || pharmacistIds.length === 0) {
            continue;
          }

          // 該当する募集を探す
          const posting = postings.find(p => p.pharmacy_id === pharmacyId && p.date === date);

          if (!posting) {
            console.warn(`薬局 ${pharmacyId} の募集が見つかりません`);
            continue;
          }

          // 選択された薬剤師ごとに希望シフトを作成
          for (const pharmacistId of pharmacistIds) {
            shiftRequests.push({
              pharmacist_id: pharmacistId,
              date: date,
              start_time: posting.start_time || '09:00:00',
              end_time: posting.end_time || '18:00:00',
              time_slot: 'negotiable',
              priority: 'medium',
              status: 'pending',
              memo: `管理者による手動マッチング (薬局: ${pharmacyId})`
            });
          }
        }

        if (safeLength(shiftRequests) === 0) {
          alert('保存する希望シフトがありません。');
          return;
        }

        // データベースに保存
        const { error } = await supabase
          .from('shift_requests')
          .insert(shiftRequests);

        if (error) {
          console.error('手動マッチング保存エラー:', error);
          alert(`保存に失敗しました: ${error.message}`);
          return;
        }

        alert(`${safeLength(shiftRequests)}件の希望シフトを保存しました`);
        setManualMatches({});

      } catch (error) {
        console.error('手動マッチング保存エラー:', error);
        alert('保存に失敗しました');
      }
    },
    [manualMatches, supabase]
  );

  /**
   * 手動マッチングをクリア
   */
  const clearManualMatches = useCallback(() => {
    setManualMatches({});
  }, []);

  return {
    manualMatches,
    handlePharmacistSelection,
    saveManualShiftRequests,
    clearManualMatches
  };
};
