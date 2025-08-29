import { supabase } from '../../lib/supabase';

export type Slot = 'am' | 'pm' | 'full';

// 1) 募集作成 API
export async function createStoreOpening({
  date,
  slot,
  requiredCount
}: {
  date: string;
  slot: Slot;
  requiredCount: number;
}) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('認証が必要です');
  }

  const { data, error } = await supabase
    .from('store_openings')
    .insert({
      store_id: user.id,
      date,
      slot,
      required_count: requiredCount,
      status: 'open'
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// 2) 希望登録 API
export async function createAvailability({
  date,
  slot
}: {
  date: string;
  slot: Slot;
}) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('認証が必要です');
  }

  const { error } = await supabase
    .from('availabilities')
    .insert({
      pharmacist_id: user.id,
      date,
      slot
    });

  // 一意重複(23505)は無視、その他エラーは throw
  if (error && error.code !== '23505') {
    throw error;
  }
}

// 3) マッチング実行（RPC）
export async function runMatching({
  date,
  slot
}: {
  date: string;
  slot: Slot;
}) {
  const { error } = await supabase.rpc('match_openings', {
    date,
    slot
  });

  if (error) {
    throw error;
  }
}

// 4) マッチ確定
export async function confirmMatch({
  matchId
}: {
  matchId: number;
}) {
  const { data, error } = await supabase
    .from('matches')
    .update({ status: 'confirmed' })
    .eq('id', matchId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}