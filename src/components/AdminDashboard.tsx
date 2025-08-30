import React, { useState, useEffect } from 'react';
import { Calendar, Shield, RefreshCw, AlertCircle } from 'lucide-react';
import { shifts, shiftRequests, shiftPostings, testConnection } from '../lib/supabase';

interface AdminDashboardProps {
  user: any;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [assigned, setAssigned] = useState([]);
  const [requests, setRequests] = useState([]);
  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState('pending');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    loadAll();
    runConnectionTests();
  }, [user, currentDate]);

  const loadAll = async () => {
    try {
      const { data: a } = await shifts.getShifts();
      setAssigned(a || []);
      const { data: r } = await shiftRequests.getRequests('', 'admin' as any);
      setRequests(r || []);
      const { data: p } = await shiftPostings.getPostings('', 'admin' as any);
      setPostings(p || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [] as (number|null)[];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
  };

  const runConnectionTests = async () => {
    console.log('Running admin connection tests...');
    const shiftRequestsTest = await testConnection.testShiftRequestsTable();
    const shiftPostingsTest = await testConnection.testShiftPostingsTable();
    const assignedShiftsTest = await testConnection.testAssignedShiftsTable();
    
    const results = {
      shiftRequests: shiftRequestsTest,
      shiftPostings: shiftPostingsTest,
      assignedShifts: assignedShiftsTest,
      timestamp: new Date().toISOString()
    };
    
    console.log('Admin connection test results:', results);
    setTestResults(results);
  };

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleConfirmShifts = async () => {
    try {
      console.log('handleConfirmShifts called');
      console.log('Current requests:', requests);
      console.log('Current postings:', postings);
      
      // 希望シフトと募集シフトをマッチングして確定済みシフトを作成
      const confirmedShifts = [];
      
      // 各日付で希望と募集をマッチング
      const dateGroups = new Map();
      
      // 希望シフトを日付ごとにグループ化
      requests.forEach((request: any) => {
        if (!dateGroups.has(request.date)) {
          dateGroups.set(request.date, { requests: [], postings: [] });
        }
        dateGroups.get(request.date).requests.push(request);
      });
      
      // 募集シフトを日付ごとにグループ化
      postings.forEach((posting: any) => {
        if (!dateGroups.has(posting.date)) {
          dateGroups.set(posting.date, { requests: [], postings: [] });
        }
        dateGroups.get(posting.date).postings.push(posting);
      });
      
      console.log('Date groups:', dateGroups);
      
      // マッチング処理
      dateGroups.forEach((group, date) => {
        console.log(`Processing date ${date}:`, group);
        group.requests.forEach((request: any) => {
          // 同じ日付・時間帯の募集があればマッチング
          const matchingPosting = group.postings.find((posting: any) => 
            posting.time_slot === request.time_slot
          );
          
          if (matchingPosting) {
            const confirmedShift = {
              pharmacist_id: request.pharmacist_id,
              pharmacy_id: matchingPosting.pharmacy_id,
              date: date,
              time_slot: request.time_slot,
              status: 'confirmed',
              created_at: new Date().toISOString()
            };
            console.log('Creating confirmed shift:', confirmedShift);
            confirmedShifts.push(confirmedShift);
          }
        });
      });

      console.log('Final confirmed shifts:', confirmedShifts);

      if (confirmedShifts.length === 0) {
        alert('マッチングできるシフトがありません。希望シフトと募集シフトの日付・時間帯が一致するものを確認してください。');
        return;
      }

      // ユーザーIDの妥当性チェック
      const invalidShifts = confirmedShifts.filter(shift => 
        !shift.pharmacist_id || !shift.pharmacy_id || 
        shift.pharmacist_id === 'test-pharmacist-id' || 
        shift.pharmacy_id === 'test-pharmacy-id'
      );
      
      if (invalidShifts.length > 0) {
        console.error('Invalid shifts found:', invalidShifts);
        alert('無効なユーザーIDが含まれています。シフトの確定に失敗しました。');
        return;
      }

      // 重複チェック：既存のシフトを確認
      console.log('Checking for existing shifts...');
      try {
        const { data: existingShiftsData, error: existingShiftsError } = await shifts.getShifts();
        
        if (existingShiftsError) {
          console.warn('Failed to get existing shifts, proceeding without duplicate check:', existingShiftsError);
          // エラーが発生した場合は重複チェックをスキップ
          const uniqueShifts = confirmedShifts;
          console.log('Proceeding with all shifts (no duplicate check):', uniqueShifts);
          
          // Supabaseに確定済みシフトを保存
          console.log('Calling createConfirmedShifts with:', uniqueShifts);
          const { error } = await shifts.createConfirmedShifts(uniqueShifts);
          
          if (error) {
            console.error('Error confirming shifts:', error);
            alert(`シフトの確定に失敗しました: ${error.message || error.code || 'Unknown error'}`);
            return;
          }

          setSystemStatus('confirmed');
          setLastUpdated(new Date());
          alert(`${uniqueShifts.length}件のシフトを確定しました`);
          
          // データを再読み込み
          loadAll();
          return;
        }
        
        const existingShifts = existingShiftsData || [];
        console.log('Existing shifts:', existingShifts);
        
        // 重複を除外
        const uniqueShifts = confirmedShifts.filter(newShift => {
          const isDuplicate = existingShifts.some(existingShift => 
            existingShift.pharmacist_id === newShift.pharmacist_id &&
            existingShift.date === newShift.date &&
            existingShift.time_slot === newShift.time_slot
          );
          
          if (isDuplicate) {
            console.log('Duplicate shift found, skipping:', newShift);
          }
          
          return !isDuplicate;
        });
        
        console.log('Unique shifts to insert:', uniqueShifts);
        
        if (uniqueShifts.length === 0) {
          alert('すべてのシフトが既に確定済みです。');
          return;
        }
        
        // Supabaseに確定済みシフトを保存
        console.log('Calling createConfirmedShifts with:', uniqueShifts);
        const { error } = await shifts.createConfirmedShifts(uniqueShifts);
        
        if (error) {
          console.error('Error confirming shifts:', error);
          alert(`シフトの確定に失敗しました: ${error.message || error.code || 'Unknown error'}`);
          return;
        }

        setSystemStatus('confirmed');
        setLastUpdated(new Date());
        alert(`${uniqueShifts.length}件のシフトを確定しました（${confirmedShifts.length - uniqueShifts.length}件は既に確定済みでした）`);
        
        // データを再読み込み
        loadAll();
      } catch (error) {
        console.error('Error in duplicate check:', error);
        alert(`シフトの確定に失敗しました: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error in handleConfirmShifts:', error);
      alert(`シフトの確定に失敗しました: ${error.message || 'Unknown error'}`);
    }
  };

  const y = currentDate.getFullYear();
  const m = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const isSameDate = (d: number, target: string) => target === `${y}-${m}-${d.toString().padStart(2,'0')}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 接続テスト結果 */}
      {testResults && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">データベース接続テスト結果</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className={`p-3 rounded-lg ${testResults.shiftRequests.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="font-medium">shift_requests テーブル</div>
              <div className={`text-sm ${testResults.shiftRequests.success ? 'text-green-700' : 'text-red-700'}`}>
                {testResults.shiftRequests.success ? '✅ 接続成功' : `❌ 接続失敗: ${testResults.shiftRequests.error}`}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${testResults.shiftPostings.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="font-medium">shift_postings テーブル</div>
              <div className={`text-sm ${testResults.shiftPostings.success ? 'text-green-700' : 'text-red-700'}`}>
                {testResults.shiftPostings.success ? '✅ 接続成功' : `❌ 接続失敗: ${testResults.shiftPostings.error}`}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${testResults.assignedShifts.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="font-medium">assigned_shifts テーブル</div>
              <div className={`text-sm ${testResults.assignedShifts.success ? 'text-green-700' : 'text-red-700'}`}>
                {testResults.assignedShifts.success ? '✅ 接続成功' : `❌ 接続失敗: ${testResults.assignedShifts.error}`}
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            テスト実行時刻: {new Date(testResults.timestamp).toLocaleString('ja-JP')}
          </div>
        </div>
      )}
      
      <div className={`border rounded-lg p-4 ${systemStatus === 'confirmed' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center space-x-2">
          <AlertCircle className={`w-5 h-5 ${systemStatus === 'confirmed' ? 'text-green-600' : 'text-yellow-600'}`} />
          <div>
            <h3 className={`text-sm font-medium ${systemStatus === 'confirmed' ? 'text-green-800' : 'text-yellow-800'}`}>
              システム状態: {systemStatus === 'confirmed' ? 'シフト確定済み' : 'シフト未確定'}
            </h3>
            <p className={`text-sm mt-1 ${systemStatus === 'confirmed' ? 'text-green-700' : 'text-yellow-700'}`}>
              {systemStatus === 'confirmed' 
                ? 'シフトが確定しました。変更が必要な場合は管理者にお問い合わせください。'
                : 'シフトが未確定です。管理者が確定ボタンを押すと確定されます。'
              }
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* left calendar */}
        <div className="flex-1 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg">←</button>
              <span className="text-lg font-medium">{getMonthName(currentDate)}</span>
              <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg">→</button>
            </div>
          </div>

          <div className="bg-blue-600 text-white p-4 rounded-lg mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <h2 className="text-xl font-semibold">{getMonthName(currentDate)}</h2>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-4">
            {['日','月','火','水','木','金','土'].map(d => (
              <div key={d} className="p-2 text-center text-sm font-medium text-gray-500">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(currentDate).map((d, i) => (
              <div key={i} className={`p-2 text-center text-sm border border-gray-200 min-h-[90px] ${d? '':'bg-gray-50'}`}>
                {d && (
                  <>
                    <div className="font-medium">{d}</div>
                    {/* assigned */}
                    {assigned.some((s:any)=>isSameDate(d, s.date)) && (
                      <div className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-1 mt-1 inline-block mr-1">割当</div>
                    )}
                    {/* requests */}
                    {requests.some((r:any)=>isSameDate(d, r.date)) && (
                      <div className="text-[10px] text-orange-700 bg-orange-50 border border-orange-200 rounded px-1 mt-1 inline-block mr-1">希望</div>
                    )}
                    {/* postings */}
                    {postings.some((p:any)=>isSameDate(d, p.date)) && (
                      <div className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1 mt-1 inline-block">募集</div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* right panel */}
        <div className="w-96 bg-white rounded-lg shadow border border-purple-200">
          <div className="bg-purple-600 text-white p-4 rounded-t-lg">
            <h2 className="text-xl font-semibold">管理者パネル</h2>
            <p className="text-sm text-purple-100 mt-1">システム全体の状態管理と調整</p>
          </div>
          <div className="p-6 space-y-4">
            <button 
              onClick={handleConfirmShifts}
              disabled={systemStatus === 'confirmed'}
              className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium ${
                systemStatus === 'confirmed' 
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>{systemStatus === 'confirmed' ? 'シフト確定済み' : 'シフトを確定する'}</span>
            </button>
            
            {/* テスト用: 強制確定ボタン */}
            <button 
              onClick={async () => {
                try {
                  console.log('=== TEST CONFIRMATION START ===');
                  console.log('Current user:', user);
                  console.log('Current requests:', requests);
                  console.log('Current postings:', postings);
                  
                  // 実際のユーザーIDを使用（存在するユーザーから取得）
                  const actualRequests = requests.length > 0 ? requests : [];
                  const actualPostings = postings.length > 0 ? postings : [];
                  
                  console.log('Actual requests available:', actualRequests.length);
                  console.log('Actual postings available:', actualPostings.length);
                  
                  let testShift;
                  
                  if (actualRequests.length > 0 && actualPostings.length > 0) {
                    // 実際のデータを使用
                    const request = actualRequests[0];
                    const posting = actualPostings[0];
                    console.log('Using actual data - Request:', request);
                    console.log('Using actual data - Posting:', posting);
                    
                    testShift = {
                      pharmacist_id: request.pharmacist_id,
                      pharmacy_id: posting.pharmacy_id,
                      date: request.date,
                      time_slot: request.time_slot,
                      status: 'confirmed',
                      created_at: new Date().toISOString()
                    };
                  } else {
                    // ダミーUUIDを使用（実際のUUID形式）
                    console.log('Using dummy UUIDs');
                    testShift = {
                      pharmacist_id: '00000000-0000-0000-0000-000000000001',
                      pharmacy_id: '00000000-0000-0000-0000-000000000002',
                      date: '2025-08-01',
                      time_slot: 'morning',
                      status: 'confirmed',
                      created_at: new Date().toISOString()
                    };
                  }
                  
                  console.log('Final test shift to create:', testShift);
                  console.log('Calling createConfirmedShifts...');
                  
                  const { error } = await shifts.createConfirmedShifts([testShift]);
                  
                  console.log('createConfirmedShifts result:', { error });
                  
                  if (error) {
                    console.error('Test confirmation error:', error);
                    alert(`テスト確定に失敗: ${error.message || error.code || 'Unknown error'}`);
                  } else {
                    console.log('Test confirmation successful!');
                    alert('テスト確定に成功しました');
                    loadAll();
                  }
                } catch (error) {
                  console.error('Test confirmation exception:', error);
                  alert(`テスト確定に失敗: ${error.message || 'Unknown error'}`);
                }
                console.log('=== TEST CONFIRMATION END ===');
              }}
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium bg-orange-600 text-white hover:bg-orange-700 text-sm"
            >
              <span>テスト: 強制確定</span>
            </button>
            
            {/* 統計情報 */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700">シフト統計</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-blue-50 p-2 rounded">
                  <div className="text-blue-600 font-medium">希望</div>
                  <div className="text-blue-800">{requests.length}件</div>
                </div>
                <div className="bg-orange-50 p-2 rounded">
                  <div className="text-orange-600 font-medium">募集</div>
                  <div className="text-orange-800">{postings.length}件</div>
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <div className="text-green-600 font-medium">確定</div>
                  <div className="text-green-800">{assigned.length}件</div>
                </div>
                <div className="bg-purple-50 p-2 rounded">
                  <div className="text-purple-600 font-medium">マッチング可能</div>
                  <div className="text-purple-800">
                    {requests.filter((r: any) => 
                      postings.some((p: any) => p.date === r.date && p.time_slot === r.time_slot)
                    ).length}件
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-xs text-gray-500">最終更新: {lastUpdated.toLocaleString('ja-JP')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
