import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const sqlStatements = [
  `DROP POLICY IF EXISTS "Allow view shift requests" ON shift_requests;`,
  `DROP POLICY IF EXISTS "sr_sel_auth" ON shift_requests;`,
  `CREATE POLICY "Allow view shift requests" ON shift_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = pharmacist_id
  OR
  (SELECT user_type FROM user_profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
);`,
  `COMMENT ON POLICY "Allow view shift requests" ON shift_requests IS
'Pharmacists can view their own requests, admins can view all. Fixed with direct SELECT instead of EXISTS.';`
];

async function executeSql() {
  console.log('🚀 Executing RLS policy fix...\n');

  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i];
    console.log(`📝 Step ${i + 1}/${sqlStatements.length}:`);
    console.log(sql.substring(0, 80) + '...\n');

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({ query: sql })
      });

      if (!response.ok) {
        // Try alternative approach using query parameter
        const { data, error } = await supabase.rpc('query', { query_text: sql });

        if (error) {
          console.error(`❌ Error:`, error);
        } else {
          console.log(`✅ Success\n`);
        }
      } else {
        console.log(`✅ Success\n`);
      }
    } catch (err) {
      console.error(`❌ Exception:`, err.message, '\n');
    }
  }

  console.log('✅ All steps completed!');
  console.log('\nℹ️  If there were errors, please run the SQL manually in Supabase Dashboard.');
}

executeSql();
