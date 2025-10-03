// Edge Functionを直接テストするスクリプト
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wjgterfwurmvosawzbjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ3RlcmZ3dXJtdm9zYXd6YmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4MDAsImV4cCI6MjA1MDU1MDgwMH0.bDs2CtZ9dJ0eN0vRUPA7CtR6VqYeYW1m747_IUYJxGE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEdgeFunction() {
  console.log('=== Edge Function テスト開始 ===');
  
  try {
    const { data, error } = await supabase.functions.invoke('api', {
      body: {
        action: 'get_transit_time',
        origin: '渋谷',
        destination: '新宿'
      }
    });
    
    console.log('Edge Function レスポンス:');
    console.log('Data:', data);
    console.log('Error:', error);
    
    if (error) {
      console.error('Edge Function エラー:', error);
    } else {
      console.log('Edge Function 成功:', data);
    }
    
  } catch (err) {
    console.error('Edge Function 呼び出しエラー:', err);
  }
  
  // station_travel_timesテーブルの内容を確認
  console.log('\n=== station_travel_times テーブル確認 ===');
  try {
    const { data: travelTimes, error: travelError } = await supabase
      .from('station_travel_times')
      .select('*');
    
    console.log('station_travel_times データ:');
    console.log('Data:', travelTimes);
    console.log('Error:', travelError);
    console.log('件数:', travelTimes?.length || 0);
    
  } catch (err) {
    console.error('station_travel_times 取得エラー:', err);
  }
}

testEdgeFunction();
