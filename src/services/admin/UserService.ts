/**
 * UserService.ts
 * ユーザー管理ロジックを管理するサービス
 *
 * AdminDashboard.tsxから抽出されたユーザー管理関連のビジネスロジック
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { safeLength, safeArray, safeObject } from '../../utils/admin/arrayHelpers';

/**
 * ユーザー編集フォームの型定義
 */
export interface UserEditForm {
  name: string;
  store_names?: string;
  ng_list: string[];
}

/**
 * ユーザー編集を開始するための準備処理
 *
 * @param profile - ユーザープロフィール
 * @param storeNgPharmacists - 店舗別NG薬剤師リスト
 * @param userProfiles - ユーザープロフィール全体
 * @returns 編集フォーム初期値
 */
export const prepareUserEdit = (
  profile: any,
  storeNgPharmacists: { [pharmacyId: string]: any[] },
  userProfiles: any
): UserEditForm => {
  let ngList: string[] = [];

  if (profile.user_type === 'pharmacist') {
    // 薬剤師の場合はstore_ng_pharmaciesから読み込み
    const ngPharmacies = storeNgPharmacists[profile.id] || [];
    const pharmacyGroups: { [pharmacyId: string]: string[] } = {};

    ngPharmacies.forEach((ngPharmacy: any) => {
      const pharmacyId = ngPharmacy.pharmacy_id;
      const storeName = ngPharmacy.store_name;

      if (!pharmacyGroups[pharmacyId]) {
        pharmacyGroups[pharmacyId] = [];
      }

      pharmacyGroups[pharmacyId].push(storeName);
    });

    // 薬局の全店舗がNGの場合は薬局IDのみ、一部店舗のみNGの場合は店舗指定
    Object.entries(pharmacyGroups).forEach(([pharmacyId, stores]) => {
      const pharmacyProfile = userProfiles[pharmacyId];
      const allStoreNames = pharmacyProfile?.store_names || ['本店'];

      // 全店舗がNGに含まれているかチェック
      const allStoresInNg = allStoreNames.every((storeName: string) =>
        stores.includes(storeName)
      );

      if (allStoresInNg && safeLength(stores) === safeLength(allStoreNames)) {
        // 全店舗がNGの場合
        ngList.push(pharmacyId);
      } else {
        // 一部店舗のみNGの場合は店舗指定
        stores.forEach(store => {
          ngList.push(`${pharmacyId}_${store}`);
        });
      }
    });
  } else if (profile.user_type === 'pharmacy') {
    // 薬局の場合はstore_ng_pharmacistsから読み込み
    const storeNgData = safeObject(storeNgPharmacists);
    const ngPharmacists = safeArray(storeNgData[profile.id]);
    const pharmacistIds = new Set<string>();

    ngPharmacists.forEach((ngPharmacist: any) => {
      if (
        ngPharmacist &&
        typeof ngPharmacist === 'object' &&
        ngPharmacist.pharmacist_id
      ) {
        pharmacistIds.add(ngPharmacist.pharmacist_id);
      }
    });

    ngList = Array.from(pharmacistIds);
  } else {
    // その他の場合は従来通り
    ngList = Array.isArray(profile.ng_list) ? [...profile.ng_list] : [];
  }

  return {
    name: profile.name || '',
    store_names: Array.isArray(profile.store_names)
      ? profile.store_names.join(',')
      : '',
    ng_list: ngList
  };
};

/**
 * ユーザー情報を更新する
 *
 * @param profile - 更新対象のユーザープロフィール
 * @param userEditForm - 編集フォームデータ
 * @param supabase - Supabaseクライアント
 * @param user - 現在のログインユーザー
 * @param userProfiles - ユーザープロフィール全体
 * @returns 成功/失敗
 */
export const saveUserEdit = async (
  profile: any,
  userEditForm: UserEditForm,
  supabase: SupabaseClient,
  user: any,
  userProfiles: any
): Promise<{ success: boolean; message?: string }> => {
  try {
    const updates: any = { name: userEditForm.name };
    if (profile.user_type === 'pharmacy' || profile.user_type === 'store') {
      updates.store_names = (userEditForm.store_names || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s && s.length > 0);
    }

    // 薬剤師の場合、NG薬局設定をstore_ng_pharmaciesテーブルに保存
    if (profile.user_type === 'pharmacist') {
      if (!supabase) {
        return { success: false, message: 'Supabase client is not available' };
      }

      // 既存のNG薬局設定を削除
      const { error: deleteError } = await supabase
        .from('store_ng_pharmacies')
        .delete()
        .eq('pharmacist_id', profile.id);

      if (deleteError) {
        return {
          success: false,
          message: `既存NG薬局設定の削除に失敗: ${deleteError.message}`
        };
      }

      // 新しいNG薬局設定を追加
      const ngList = Array.isArray(userEditForm.ng_list)
        ? userEditForm.ng_list
        : String(userEditForm.ng_list || '')
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s && s.length > 0);

      if (safeLength(ngList) > 0) {
        const ngEntries = [];
        const seenEntries = new Set<string>();

        for (const ngId of ngList) {
          if (ngId.includes('_')) {
            // 店舗指定の場合
            const [pharmacyId, storeName] = ngId.split('_');
            const entryKey = `${profile.id}_${pharmacyId}_${storeName}`;

            if (!seenEntries.has(entryKey)) {
              seenEntries.add(entryKey);
              ngEntries.push({
                pharmacist_id: profile.id,
                pharmacy_id: pharmacyId,
                store_name: storeName
              });
            }
          } else {
            // 薬局全体の場合 - 全店舗を個別に保存
            const pharmacyProfile = userProfiles[ngId];
            const storeNames = pharmacyProfile?.store_names || ['本店'];

            storeNames.forEach((storeName: string) => {
              const entryKey = `${profile.id}_${ngId}_${storeName}`;

              if (!seenEntries.has(entryKey)) {
                seenEntries.add(entryKey);
                ngEntries.push({
                  pharmacist_id: profile.id,
                  pharmacy_id: ngId,
                  store_name: storeName
                });
              }
            });
          }
        }

        if (safeLength(ngEntries) > 0) {
          const { error: insertError } = await supabase
            .from('store_ng_pharmacies')
            .insert(ngEntries);

          if (insertError) {
            return {
              success: false,
              message: `NG薬局設定の保存に失敗: ${insertError.message}`
            };
          }
        }
      }
    } else if (profile.user_type === 'pharmacy') {
      // 薬局の場合、NG薬剤師設定をstore_ng_pharmacistsテーブルに保存
      // 既存のNG薬剤師設定を削除
      const { error: deleteError } = await supabase
        .from('store_ng_pharmacists')
        .delete()
        .eq('pharmacy_id', profile.id);

      if (deleteError) {
        return {
          success: false,
          message: `既存NG薬剤師設定の削除に失敗: ${deleteError.message}`
        };
      }

      // 新しいNG薬剤師設定を追加
      const ngList = Array.isArray(userEditForm.ng_list)
        ? userEditForm.ng_list
        : String(userEditForm.ng_list || '')
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s && s.length > 0);

      if (safeLength(ngList) > 0) {
        const ngEntries = [];
        const seenEntries = new Set<string>();
        const storeNames = profile.store_names || ['本店'];

        for (const ngId of ngList) {
          if (ngId.includes('_')) {
            // 店舗指定の場合
            const [pharmacyId, storeName] = ngId.split('_');
            const entryKey = `${profile.id}_${storeName}_${pharmacyId}`;

            if (!seenEntries.has(entryKey)) {
              seenEntries.add(entryKey);
              ngEntries.push({
                pharmacy_id: profile.id,
                store_name: storeName,
                pharmacist_id: pharmacyId
              });
            }
          } else {
            // 薬剤師全体の場合 - 全店舗でNG
            for (const storeName of storeNames) {
              const entryKey = `${profile.id}_${storeName}_${ngId}`;

              if (!seenEntries.has(entryKey)) {
                seenEntries.add(entryKey);
                ngEntries.push({
                  pharmacy_id: profile.id,
                  store_name: storeName,
                  pharmacist_id: ngId
                });
              }
            }
          }
        }

        if (safeLength(ngEntries) > 0) {
          const { error: insertError } = await supabase
            .from('store_ng_pharmacists')
            .insert(ngEntries);

          if (insertError) {
            return {
              success: false,
              message: `NG薬剤師設定の保存に失敗: ${insertError.message}`
            };
          }
        }

        // 互換: user_profiles.ng_list も反映
        try {
          await supabase
            .from('user_profiles')
            .update({ ng_list: ngList })
            .eq('id', profile.id);
        } catch (e) {
          console.warn('Failed to update legacy ng_list', e);
        }
      }
    } else {
      // その他の場合は従来通りng_listを保存
      updates.ng_list = Array.isArray(userEditForm.ng_list)
        ? userEditForm.ng_list
        : String(userEditForm.ng_list || '')
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s && s.length > 0);
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', profile.id);

    if (error) {
      return {
        success: false,
        message: `ユーザー更新に失敗: ${error.message}`
      };
    }

    return { success: true };
  } catch (e: any) {
    return {
      success: false,
      message: `ユーザー更新エラー: ${e?.message || 'Unknown error'}`
    };
  }
};

/**
 * ユーザーを削除する
 *
 * @param profile - 削除対象のユーザープロフィール
 * @param supabase - Supabaseクライアント
 * @returns 成功/失敗
 */
export const deleteUserProfile = async (
  profile: any,
  supabase: SupabaseClient
): Promise<{ success: boolean; message?: string }> => {
  try {
    console.log('Starting user deletion for:', profile.id, profile.name || profile.email);

    // 1) 関連レコードを先に削除
    // assigned_shifts
    console.log('Deleting assigned_shifts...');
    const assignedDelete = await supabase
      .from('assigned_shifts')
      .delete()
      .or(`pharmacist_id.eq.${profile.id},pharmacy_id.eq.${profile.id}`);
    if ((assignedDelete as any).error) {
      return {
        success: false,
        message: `assigned_shifts削除エラー: ${(assignedDelete as any).error.message}`
      };
    }

    // shift_requests（薬剤師）
    console.log('Deleting shift_requests...');
    const reqDelete = await supabase
      .from('shift_requests')
      .delete()
      .eq('pharmacist_id', profile.id);
    if ((reqDelete as any).error) {
      return {
        success: false,
        message: `shift_requests削除エラー: ${(reqDelete as any).error.message}`
      };
    }

    // shift_postings（薬局）
    console.log('Deleting shift_postings...');
    const postDelete = await supabase
      .from('shift_postings')
      .delete()
      .eq('pharmacy_id', profile.id);
    if ((postDelete as any).error) {
      return {
        success: false,
        message: `shift_postings削除エラー: ${(postDelete as any).error.message}`
      };
    }

    // store_ng_pharmacists（薬局のNG薬剤師設定）
    console.log('Deleting store_ng_pharmacists...');
    const ngPharmacistsDelete = await supabase
      .from('store_ng_pharmacists')
      .delete()
      .or(`pharmacy_id.eq.${profile.id},pharmacist_id.eq.${profile.id}`);
    if ((ngPharmacistsDelete as any).error) {
      console.warn('store_ng_pharmacists削除警告:', (ngPharmacistsDelete as any).error.message);
    }

    // store_ng_pharmacies（薬剤師のNG薬局設定）
    console.log('Deleting store_ng_pharmacies...');
    const ngPharmaciesDelete = await supabase
      .from('store_ng_pharmacies')
      .delete()
      .or(`pharmacist_id.eq.${profile.id},pharmacy_id.eq.${profile.id}`);
    if ((ngPharmaciesDelete as any).error) {
      console.warn('store_ng_pharmacies削除警告:', (ngPharmaciesDelete as any).error.message);
    }

    // pharmacist_ratings（薬剤師の評価）
    console.log('Deleting pharmacist_ratings...');
    const ratingsDelete = await supabase
      .from('pharmacist_ratings')
      .delete()
      .or(`pharmacist_id.eq.${profile.id},pharmacy_id.eq.${profile.id}`);
    if ((ratingsDelete as any).error) {
      console.warn('pharmacist_ratings削除警告:', (ratingsDelete as any).error.message);
    }

    // match_outcomes（AIマッチング結果）
    console.log('Deleting match_outcomes...');
    const matchOutcomesDelete = await supabase
      .from('match_outcomes')
      .delete()
      .or(`pharmacist_id.eq.${profile.id},pharmacy_id.eq.${profile.id}`);
    if ((matchOutcomesDelete as any).error) {
      console.warn('match_outcomes削除警告:', (matchOutcomesDelete as any).error.message);
    }

    // pharmacist_profiles（AIマッチング用プロフィール）
    console.log('Deleting pharmacist_profiles...');
    const pharmProfilesDelete = await supabase
      .from('pharmacist_profiles')
      .delete()
      .eq('user_id', profile.id);
    if ((pharmProfilesDelete as any).error) {
      console.warn('pharmacist_profiles削除警告:', (pharmProfilesDelete as any).error.message);
    }

    // pharmacy_profiles（AIマッチング用プロフィール）
    console.log('Deleting pharmacy_profiles...');
    const pharcyProfilesDelete = await supabase
      .from('pharmacy_profiles')
      .delete()
      .eq('user_id', profile.id);
    if ((pharcyProfilesDelete as any).error) {
      console.warn('pharmacy_profiles削除警告:', (pharcyProfilesDelete as any).error.message);
    }

    // 2) user_profilesを削除
    console.log('Deleting user_profiles...');
    const profileDelete = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', profile.id);
    if ((profileDelete as any).error) {
      return {
        success: false,
        message: `user_profiles削除エラー: ${(profileDelete as any).error.message}`
      };
    }

    // 3) auth.usersを削除（認証情報とパスワードを削除）
    console.log('Deleting auth user...');
    const { error: authError } = await supabase.auth.admin.deleteUser(profile.id);
    if (authError) {
      console.warn('auth.users削除警告:', authError.message);
      // auth削除失敗は警告のみ（すでにプロファイルは削除済み）
    }

    console.log('User deletion completed successfully');
    return { success: true };
  } catch (e: any) {
    return {
      success: false,
      message: `削除エラー: ${e?.message || 'Unknown error'}`
    };
  }
};
