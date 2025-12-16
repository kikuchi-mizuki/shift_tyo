/**
 * Debug script to check store names in database
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkStoreNames() {
  console.log('=== Checking user_profiles ===');

  // Check user_profiles for pharmacy 2ab9cd86-cbd4-479d-b0ce-25a009812657
  const { data: userProfile, error: userError } = await supabase
    .from('user_profiles')
    .select('id, name, store_name, user_type')
    .eq('id', '2ab9cd86-cbd4-479d-b0ce-25a009812657')
    .single();

  if (userError) {
    console.error('Error fetching user_profile:', userError);
  } else {
    console.log('User Profile:', userProfile);
    console.log('  name:', userProfile.name);
    console.log('  store_name:', userProfile.store_name);
  }

  console.log('\n=== Checking shift_postings for 2025-11-29 ===');

  // Check shift_postings for 2025-11-29
  const { data: postings, error: postingsError } = await supabase
    .from('shift_postings')
    .select('id, pharmacy_id, store_name, start_time, end_time, date')
    .eq('date', '2025-11-29')
    .order('pharmacy_id');

  if (postingsError) {
    console.error('Error fetching shift_postings:', postingsError);
  } else {
    console.log(`Found ${postings.length} postings for 2025-11-29:`);
    postings.forEach(p => {
      console.log(`  - pharmacy_id: ${p.pharmacy_id.substring(0, 8)}... store_name: "${p.store_name}"`);
    });
  }

  console.log('\n=== Checking assigned_shifts (pending) for 2025-11-29 ===');

  // Check assigned_shifts for 2025-11-29
  const { data: assigned, error: assignedError } = await supabase
    .from('assigned_shifts')
    .select('id, pharmacy_id, store_name, date, status, created_at')
    .eq('date', '2025-11-29')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10);

  if (assignedError) {
    console.error('Error fetching assigned_shifts:', assignedError);
  } else {
    console.log(`Found ${assigned.length} pending assigned_shifts for 2025-11-29:`);
    assigned.forEach(a => {
      console.log(`  - pharmacy_id: ${a.pharmacy_id.substring(0, 8)}... store_name: "${a.store_name}" created_at: ${a.created_at}`);
    });
  }
}

checkStoreNames().catch(console.error);
