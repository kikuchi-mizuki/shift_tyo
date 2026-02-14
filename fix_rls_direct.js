// Direct SQL execution script
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const sql = readFileSync('./supabase/migrations/20260214000001_fix_admin_rls_policy_v2.sql', 'utf8');

async function executeSql() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      console.error('Error executing SQL:', error);
      process.exit(1);
    }

    console.log('✅ SQL executed successfully');
    console.log('Result:', data);
  } catch (err) {
    console.error('Exception:', err);
    process.exit(1);
  }
}

executeSql();
