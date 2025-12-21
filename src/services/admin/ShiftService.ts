/**
 * ShiftService.ts
 * シフト確定・取り消しロジックを管理するサービス
 *
 * AdminDashboard.tsxから抽出されたシフト管理関連のビジネスロジック
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { safeLength } from '../../utils/admin/arrayHelpers';

/**
 * 単一マッチを確定シフトとして保存する
 *
 * @param match - マッチング結果
 * @param date - 対象日付
 * @param supabase - Supabaseクライアント
 * @param userProfiles - ユーザープロフィール
 * @returns 成功/失敗
 */
export const confirmSingleMatch = async (
  match: any,
  date: string,
  supabase: SupabaseClient,
  userProfiles: any
): Promise<{ success: boolean; message?: string; data?: any }> => {
  try {
    // データ構造を判定（AIマッチング結果 vs assigned テーブルデータ）
    const isAIMatchResult = match.pharmacist && match.pharmacy;
    const isAssignedData = match.pharmacist_id && match.pharmacy_id;

    // バリデーション
    if (!match || (!isAIMatchResult && !isAssignedData)) {
      return { success: false, message: 'マッチングデータが不完全です' };
    }

    // IDを取得（どちらの構造でも対応）
    const pharmacistId = match.pharmacist?.id || match.pharmacist_id;
    const pharmacyId = match.pharmacy?.id || match.pharmacy_id;

    if (!pharmacistId || !pharmacyId) {
      return { success: false, message: '薬剤師または薬局のIDが不足しています' };
    }

    if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return { success: false, message: '日付フォーマットが不正です' };
    }

    // 店舗名を取得（複数のソースから優先順位をつけて取得）
    const storeName =
      match.store_name ||
      match.posting?.store_name ||
      match.pharmacy?.store_name ||
      userProfiles[pharmacyId]?.store_name ||
      '店舗名未設定';

    // 時間を取得
    const startTime = match.start_time || match.timeSlot?.start || match.posting?.start_time || '09:00:00';
    const endTime = match.end_time || match.timeSlot?.end || match.posting?.end_time || '18:00:00';

    // メモを作成
    let memo = '';
    if (match.compatibilityScore && match.reasons) {
      memo = `AIマッチング: ${match.compatibilityScore.toFixed(2)} score - ${match.reasons.join(', ')}`;
    } else if (match.memo) {
      memo = match.memo;
    } else {
      memo = 'AIマッチング結果から確定';
    }

    const shift = {
      pharmacist_id: pharmacistId,
      pharmacy_id: pharmacyId,
      date: date,
      time_slot: 'negotiable',
      start_time: startTime,
      end_time: endTime,
      status: 'confirmed',
      store_name: storeName,
      memo: memo
    };

    // 既存のシフトをチェック
    const { data: existingShifts, error: checkError } = await supabase
      .from('assigned_shifts')
      .select('id, status')
      .eq('pharmacist_id', shift.pharmacist_id)
      .eq('date', shift.date)
      .eq('time_slot', shift.time_slot);

    if (checkError) {
      return { success: false, message: `既存シフトチェックエラー: ${checkError.message}` };
    }

    let insertedData;
    if (existingShifts && existingShifts.length > 0) {
      // 既存のシフトがある場合は更新
      const existingShift = existingShifts[0];
      const { data: updatedData, error: updateError } = await supabase
        .from('assigned_shifts')
        .update({
          pharmacy_id: shift.pharmacy_id,
          start_time: shift.start_time,
          end_time: shift.end_time,
          status: shift.status,
          store_name: shift.store_name,
          memo: shift.memo,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingShift.id)
        .select();

      if (updateError) {
        return { success: false, message: `シフト更新エラー: ${updateError.message}` };
      }

      insertedData = updatedData;
    } else {
      // 新規シフトを挿入
      const { data: newData, error: insertError } = await supabase
        .from('assigned_shifts')
        .insert([shift])
        .select();

      if (insertError) {
        return { success: false, message: `シフト挿入エラー: ${insertError.message}` };
      }

      insertedData = newData;
    }

    // 対応する希望・募集のステータスを更新
    await supabase
      .from('shift_requests')
      .update({ status: 'confirmed' })
      .eq('pharmacist_id', shift.pharmacist_id)
      .eq('date', shift.date);

    await supabase
      .from('shift_postings')
      .update({ status: 'confirmed' })
      .eq('pharmacy_id', shift.pharmacy_id)
      .eq('date', shift.date)
      .eq('store_name', shift.store_name);

    return { success: true, data: insertedData };
  } catch (e: any) {
    return { success: false, message: `エラー: ${e?.message || 'Unknown error'}` };
  }
};

/**
 * 複数のシフトを一括確定する
 *
 * @param date - 対象日付
 * @param shifts - 確定するシフトリスト
 * @param supabase - Supabaseクライアント
 * @returns 成功/失敗
 */
export const confirmShiftsForDate = async (
  date: string,
  shifts: any[],
  supabase: SupabaseClient
): Promise<{ success: boolean; message?: string; data?: any }> => {
  try {
    if (!shifts || safeLength(shifts) === 0) {
      return { success: false, message: '確定するシフトがありません' };
    }

    // シフトをデータベースに保存
    const { data: insertResult, error } = await supabase
      .from('assigned_shifts')
      .insert(shifts)
      .select();

    if (error) {
      return { success: false, message: `データベース挿入エラー: ${error.message}` };
    }

    // 対応する希望・募集のステータスを'confirmed'に更新
    for (const shift of shifts) {
      const shiftTimeSlot = shift.start_time && shift.end_time ? 'fullday' : shift.time_slot || 'negotiable';

      // 薬剤師の希望を更新
      await supabase
        .from('shift_requests')
        .update({ status: 'confirmed' })
        .eq('pharmacist_id', shift.pharmacist_id)
        .eq('date', shift.date)
        .eq('time_slot', shiftTimeSlot);

      // 薬局の募集を更新
      await supabase
        .from('shift_postings')
        .update({ status: 'confirmed' })
        .eq('pharmacy_id', shift.pharmacy_id)
        .eq('date', shift.date)
        .eq('time_slot', shiftTimeSlot)
        .eq('store_name', shift.store_name || null);
    }

    return { success: true, data: insertResult };
  } catch (e: any) {
    return { success: false, message: `エラー: ${e?.message || 'Unknown error'}` };
  }
};

/**
 * 確定シフトを取り消す
 *
 * @param shift - 取り消すシフト
 * @param supabase - Supabaseクライアント
 * @returns 成功/失敗
 */
export const cancelConfirmedShift = async (
  shift: any,
  supabase: SupabaseClient
): Promise<{ success: boolean; message?: string }> => {
  try {
    // 対応する希望・募集のステータスを元に戻す
    await supabase
      .from('shift_requests')
      .update({ status: 'pending' })
      .eq('pharmacist_id', shift.pharmacist_id)
      .eq('date', shift.date)
      .eq('time_slot', shift.time_slot || 'negotiable');

    await supabase
      .from('shift_postings')
      .update({ status: 'open' })
      .eq('pharmacy_id', shift.pharmacy_id)
      .eq('date', shift.date)
      .eq('start_time', shift.start_time || '09:00:00')
      .eq('end_time', shift.end_time || '18:00:00')
      .eq('store_name', shift.store_name || null);

    // 確定シフトを削除
    const { error } = await supabase
      .from('assigned_shifts')
      .delete()
      .eq('id', shift.id);

    if (error) {
      return { success: false, message: `シフト削除エラー: ${error.message}` };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, message: `エラー: ${e?.message || 'Unknown error'}` };
  }
};
