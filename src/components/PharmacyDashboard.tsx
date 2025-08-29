import React, { useState, useEffect } from 'react';
import { Building2, Calendar as CalendarIcon, Plus, MessageCircle, Sun, Users } from 'lucide-react';
import { shifts, shiftPostings } from '../lib/supabase';

// デバッグ: インポートの確認
console.log('PharmacyDashboard imports:', { shifts, shiftPostings });

interface PharmacyDashboardProps {
  user: any;
}

export const PharmacyDashboard: React.FC<PharmacyDashboardProps> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [requiredStaff, setRequiredStaff] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [myShifts, setMyShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('PharmacyDashboard mounted, user:', user);
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const { data: myShiftsData } = await shifts.getShiftsByUser(user.id, 'pharmacy');
      setMyShifts(myShiftsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
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

  const getMonthName = (date: Date) => date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDateSelect = (day: number) => {
    if (!day) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    setSelectedDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  };

  const handlePost = async () => {
    console.log('=== handlePost START ===');
    console.log('handlePost called', { selectedDate, timeSlot, requiredStaff, memo });
    console.log('User:', user);
    
    if (!selectedDate || !timeSlot || !requiredStaff) {
      console.log('Validation failed:', { selectedDate, timeSlot, requiredStaff });
      alert('募集日・時間帯・人数を選択してください');
      return;
    }
    
    console.log('Validation passed, proceeding with posting creation');
    
    try {
      const posting = {
        pharmacy_id: user.id,
        date: selectedDate,
        time_slot: timeSlot,
        required_staff: requiredStaff,
        memo,
        status: 'open'
      };
      
      console.log('Creating posting:', posting);
      console.log('shiftPostings object:', shiftPostings);
      console.log('shiftPostings.createPostings function:', shiftPostings.createPostings);
      
      if (typeof shiftPostings.createPostings !== 'function') {
        console.error('shiftPostings.createPostings is not a function!');
        alert('システムエラー: 関数が見つかりません');
        return;
      }
      
      const { error } = await shiftPostings.createPostings([posting]);
      
      if (error) {
        console.error('Shift posting error:', error);
        alert('募集の作成に失敗しました');
      } else {
        console.log('Posting created successfully');
        alert('募集を作成しました');
        setSelectedDate('');
        setTimeSlot('');
        setRequiredStaff(null);
        setMemo('');
        loadData();
      }
    } catch (e) {
      console.error('Exception in handlePost:', e);
      alert('募集の作成に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  console.log('PharmacyDashboard rendering, loading:', loading, 'user:', user);
  
  return (
    <div className="flex gap-6 p-6">
      {/* 左: カレンダー */}
      <div className="flex-1 bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg">←</button>
            <span className="text-lg font-medium">{getMonthName(currentDate)}</span>
            <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg">→</button>
          </div>
        </div>

        <div className="bg-blue-600 text-white px-5 py-4 rounded-lg mb-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5" />
            <h2 className="text-xl font-semibold">{getMonthName(currentDate)}</h2>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-4">
          {['日','月','火','水','木','金','土'].map(d => (
            <div key={d} className="p-2 text-center text-sm font-medium text-gray-500">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {getDaysInMonth(currentDate).map((day, idx) => (
            <div
              key={idx}
              className={`p-2 text-center text-sm border border-gray-200 min-h-[72px] ${day ? 'hover:bg-gray-50 cursor-pointer' : 'bg-gray-50'}`}
              onClick={() => day && handleDateSelect(day)}
            >
              {day && (
                <>
                  <div className="font-medium">{day}</div>
                  {myShifts.some((s: any) => s.date === `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`) && (
                    <div className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1 mt-1 inline-block">募集あり</div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 右: シフト募集フォーム */}
      <div className="w-96 bg-white rounded-lg shadow">
        <div className="bg-blue-600 text-white p-4 rounded-t-lg">
          <div className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <h2 className="text-xl font-semibold">薬剤師募集登録</h2>
          </div>
          <p className="text-xs text-blue-100 mt-1">必要な薬剤師の募集条件を設定してください</p>
        </div>
        <div className="p-6 space-y-6">
          {/* デバッグ情報 */}
          <div className="p-3 bg-gray-100 rounded text-xs">
            <div>選択日: {selectedDate || '未選択'}</div>
            <div>時間帯: {timeSlot || '未選択'}</div>
            <div>人数: {requiredStaff || '未選択'}</div>
            <div>備考: {memo || 'なし'}</div>
          </div>
          
          {/* 募集日 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">募集日</label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">日付を選択してください</option>
              {Array.from({ length: 31 }, (_, i) => {
                const day = i + 1;
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth() + 1;
                const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                return <option key={day} value={date}>{month}月{day}日</option>;
              })}
            </select>
          </div>

          {/* 時間帯 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">募集時間帯</label>
            <div className="grid grid-cols-2 gap-2">
              {[{id:'morning',label:'午前 (9:00-13:00)',icon:Sun,color:'bg-green-500 hover:bg-green-600'},
                {id:'afternoon',label:'午後 (13:00-18:00)',icon:Sun,color:'bg-orange-500 hover:bg-orange-600'},
                {id:'full',label:'終日 (9:00-18:00)',icon:Users,color:'bg-yellow-500 hover:bg-yellow-600'},
                {id:'consult',label:'要相談',icon:MessageCircle,color:'bg-purple-500 hover:bg-purple-600'}].map(slot=>{
                  const Icon = slot.icon as any;
                  return (
                    <button key={slot.id} onClick={()=>setTimeSlot(slot.id)} className={`flex items-center justify-center space-x-2 p-3 rounded-lg text-white text-sm font-medium transition-colors ${timeSlot===slot.id?slot.color:'bg-gray-300 hover:bg-gray-400'}`}>
                      <Icon className="w-4 h-4" />
                      <span>{slot.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* 募集人数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">必要人数</label>
            <div className="grid grid-cols-3 gap-2">
              {[1,2,3].map(n => (
                <button key={n} onClick={()=>setRequiredStaff(n)} className={`flex items-center justify-center space-x-2 p-3 rounded-lg text-sm font-medium border ${requiredStaff===n? 'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                  <Users className="w-4 h-4" />
                  <span>{n}人</span>
                </button>
              ))}
            </div>
          </div>

          {/* 備考 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">備考・特記事項（任意）</label>
            <textarea value={memo} onChange={(e)=>setMemo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" rows={3} placeholder="経験年数の要件、特別な業務内容、その他の条件があれば記入してください" />
          </div>

          {/* 作成ボタン */}
          <div className="space-y-2">
            <button 
              onClick={(e) => {
                console.log('=== BUTTON CLICK START ===');
                console.log('Button clicked!', e);
                console.log('Event type:', e.type);
                console.log('Event target:', e.target);
                console.log('Event currentTarget:', e.currentTarget);
                
                e.preventDefault();
                e.stopPropagation();
                
                console.log('About to call handlePost');
                console.log('handlePost function:', handlePost);
                console.log('typeof handlePost:', typeof handlePost);
                
                try {
                  handlePost();
                } catch (error) {
                  console.error('Error in button click handler:', error);
                  alert('ボタンクリックエラー: ' + (error instanceof Error ? error.message : String(error)));
                }
              }} 
              onMouseEnter={() => console.log('Button hovered')}
              onMouseDown={() => console.log('Button mousedown')}
              onMouseUp={() => console.log('Button mouseup')}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
              style={{ pointerEvents: 'auto' }}
            >
              募集を追加
            </button>
            <button 
              onClick={() => {
                console.log('Test button clicked!');
                alert('Test button works!');
              }} 
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors cursor-pointer"
            >
              テストボタン
            </button>
          </div>
        </div>

        {/* 注意ボックス */}
        <div className="px-6 pb-6">
          <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
            <ul className="list-disc pl-5 space-y-1">
              <li>月初に必要人数を全ての日程へ一括登録することをお勧めします</li>
              <li>「終日」は選択すると募集要件を明確にしてください</li>
              <li>NG薬局の設定は別途管理画面で行えます</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyDashboard;
