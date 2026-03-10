/**
 * useInteractiveMatching.ts
 * インタラクティブマッチング（手動入れ替え可能なマッチング）を管理するカスタムフック
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { MatchCandidate } from '../../features/ai-matching/aiMatchingEngine';
import {
  getAvailableCandidatesForStore,
  reoptimizeWithLockedAssignments,
  LockedAssignment
} from '../../services/admin/MatchingService';

interface UseInteractiveMatchingProps {
  supabase: SupabaseClient;
  initialMatches: MatchCandidate[];
  date: string;
  requests: any[];
  postings: any[];
  assigned: any[];
  userProfiles: any;
  ratings: any[];
  storeNgPharmacists?: { [pharmacyId: string]: any[] };
  storeNgPharmacies?: { [pharmacistId: string]: any[] };
}

interface UseInteractiveMatchingReturn {
  matches: MatchCandidate[];
  lockedAssignments: LockedAssignment[];
  candidatesByStore: Map<string, any[]>;
  isReoptimizing: boolean;
  handlePharmacistChange: (storeKey: string, newPharmacistId: string) => void;
  resetToInitial: () => void;
}

export const useInteractiveMatching = ({
  supabase,
  initialMatches,
  date,
  requests,
  postings,
  assigned,
  userProfiles,
  ratings,
  storeNgPharmacists,
  storeNgPharmacies
}: UseInteractiveMatchingProps): UseInteractiveMatchingReturn => {
  // 現在のマッチング結果
  const [matches, setMatches] = useState<MatchCandidate[]>(initialMatches);

  // 固定された割り当て（手動変更）
  const [lockedAssignments, setLockedAssignments] = useState<LockedAssignment[]>([]);

  // 再最適化中フラグ
  const [isReoptimizing, setIsReoptimizing] = useState(false);

  // 初期マッチングが変更されたら更新
  useEffect(() => {
    setMatches(initialMatches || []);
  }, [initialMatches]);

  // 各店舗の候補者リストを生成（メモ化）
  const candidatesByStore = useMemo(() => {
    const map = new Map<string, any[]>();

    // データが不足している場合は空のマップを返す
    if (!postings || !Array.isArray(postings) || !userProfiles || !requests) {
      return map;
    }

    for (const posting of postings) {
      if (!posting || posting.date !== date) continue;

      const storeKey = `${posting.pharmacy_id}_${(posting.store_name || '').trim()}`;

      // この店舗に割り当て可能な全薬剤師を取得
      const candidates = getAvailableCandidatesForStore(
        storeKey,
        posting,
        requests.filter(r => r && r.date === date),
        userProfiles,
        ratings || [],
        requests,
        storeNgPharmacists,
        storeNgPharmacies
      );

      // 候補者情報を整形
      const formattedCandidates = candidates.map(c => {
        const pharmacistProfile = userProfiles[c.pharmacistId];

        // 薬剤師名の取得
        let pharmacistName = '薬剤師名未設定';
        if (pharmacistProfile) {
          if (pharmacistProfile.name && pharmacistProfile.name.trim()) {
            pharmacistName = pharmacistProfile.name.trim();
          } else if (pharmacistProfile.email && pharmacistProfile.email.trim()) {
            pharmacistName = pharmacistProfile.email.split('@')[0];
          } else if (c.pharmacistId) {
            pharmacistName = `薬剤師${c.pharmacistId.slice(-4)}`;
          }
        } else if (c.pharmacistId) {
          pharmacistName = `薬剤師${c.pharmacistId.slice(-4)}`;
        }

        // 現在他の薬局に割り当てられているかチェック（安全に）
        const currentAssignment = matches.find(m =>
          m && m.pharmacist && m.pharmacist.id === c.pharmacistId
        );
        const isAssignedElsewhere = currentAssignment && currentAssignment.pharmacy &&
          `${currentAssignment.pharmacy.id}_${(currentAssignment.pharmacy.store_name || '').trim()}` !== storeKey;

        return {
          pharmacistId: c.pharmacistId,
          pharmacistName,
          score: c.score,
          isAssignedElsewhere,
          assignedTo: isAssignedElsewhere && currentAssignment.pharmacy ? currentAssignment.pharmacy.name : null
        };
      });

      map.set(storeKey, formattedCandidates);
    }

    return map;
  }, [postings, requests, date, userProfiles, ratings, storeNgPharmacists, storeNgPharmacies, matches]);

  /**
   * 薬剤師を手動で入れ替え
   */
  const handlePharmacistChange = useCallback(async (storeKey: string, newPharmacistId: string) => {
    console.log(`🔄 薬剤師変更: ${storeKey} → ${newPharmacistId}`);

    // データが不足している場合は処理を中断
    if (!requests || !postings || !userProfiles) {
      console.warn('⚠️ 再最適化に必要なデータが不足しています');
      return;
    }

    setIsReoptimizing(true);

    try {
      // 既存の固定割り当てから該当店舗を除外
      const updatedLocked = lockedAssignments.filter(la => la.storeKey !== storeKey);

      // 新しい固定割り当てを追加
      updatedLocked.push({
        storeKey,
        pharmacistId: newPharmacistId
      });

      setLockedAssignments(updatedLocked);

      // 他の薬局からこの薬剤師を解除（もし割り当てられていれば）
      const previousLocked = updatedLocked.filter(la => la.pharmacistId !== newPharmacistId || la.storeKey === storeKey);

      // 再最適化を実行
      const result = reoptimizeWithLockedAssignments(
        previousLocked,
        (requests || []).filter(r => r && r.date === date),
        (postings || []).filter(p => p && p.date === date),
        date,
        assigned || [],
        userProfiles || {},
        ratings || [],
        requests || [],
        storeNgPharmacists,
        storeNgPharmacies
      );

      setMatches(result.matches || []);
      console.log(`✅ 再最適化完了: ${result.matches.length}件のマッチング`);

    } catch (error) {
      console.error('再最適化エラー:', error);
      alert('再最適化中にエラーが発生しました。');
    } finally {
      setIsReoptimizing(false);
    }
  }, [lockedAssignments, requests, postings, date, assigned, userProfiles, ratings, storeNgPharmacists, storeNgPharmacies]);

  /**
   * 初期状態にリセット
   */
  const resetToInitial = useCallback(() => {
    setMatches(initialMatches);
    setLockedAssignments([]);
  }, [initialMatches]);

  return {
    matches,
    lockedAssignments,
    candidatesByStore,
    isReoptimizing,
    handlePharmacistChange,
    resetToInitial
  };
};
