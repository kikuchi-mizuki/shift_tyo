import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, Star, Brain, Zap, Bell, Lock } from 'lucide-react';
import { shifts, shiftRequests, shiftPostings, shiftRequestsAdmin, supabase, pharmacistRatings } from '../lib/supabase';
import { AIMatchingEngine, MatchCandidate } from '../features/ai-matching/aiMatchingEngine';
import DataCollector from '../features/ai-matching/dataCollector';
import AIMatchingStats from '../features/ai-matching/AIMatchingStats';
import EmergencyShiftRequest from './EmergencyShiftRequest';
import PasswordChangeModal from './PasswordChangeModal';
import DebugModal from './DebugModal';
import UnifiedCalendar from './UnifiedCalendar';
import { getMonthName, getDaysInMonth, formatDateString, getPreviousMonth, getNextMonth, safeLength } from '../utils/calendarUtils';

interface AdminDashboardProps {
  user: any;
}

const AdminDashboardStep1: React.FC<AdminDashboardProps> = ({ user }) => {
  // 基本的なstate（元のAdminDashboardRefactoredと同じ）
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [assigned, setAssigned] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [postings, setPostings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState('pending');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [userProfiles, setUserProfiles] = useState<any>({});
  const [storeNgPharmacists, setStoreNgPharmacists] = useState<{[pharmacyId: string]: any[]}>({});
  const [storeNgPharmacies, setStoreNgPharmacies] = useState<{[pharmacistId: string]: any[]}>({});
  const [ratings, setRatings] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    pharmacies: false,
    pharmacists: false
  });

  // 募集状況管理
  const [recruitmentStatus, setRecruitmentStatus] = useState<{
    is_open: boolean;
    updated_at: string;
    updated_by: string | null;
    notes: string | null;
  }>({
    is_open: true,
    updated_at: '',
    updated_by: null,
    notes: null
  });

  // モーダル状態
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);

  // AI Matching関連の状態
  const [aiMatchingEngine, setAiMatchingEngine] = useState<AIMatchingEngine | null>(null);
  const [dataCollector, setDataCollector] = useState<DataCollector | null>(null);
  const [aiMatches, setAiMatches] = useState<MatchCandidate[]>([]);
  const [aiMatchesByDate, setAiMatchesByDate] = useState<{[date: string]: MatchCandidate[]}>({});
  const [useAIMatching, setUseAIMatching] = useState(true);
  const [aiMatchingLoading, setAiMatchingLoading] = useState(false);

  // 月次ナビゲーション（統一された関数）
  const handlePrevMonth = () => {
    setCurrentDate(getPreviousMonth(currentDate));
  };

  const handleNextMonth = () => {
    setCurrentDate(getNextMonth(currentDate));
  };

  // 基本的なデータ読み込み（簡略化）
  const loadAll = async () => {
    try {
      setLoading(true);
      console.log('Loading all admin data...');

      const [assignedData, requestsData, postingsData, userProfilesData, ratingsData] = await Promise.all([
        shifts.select('*').order('date', { ascending: true }),
        shiftRequests.select('*').order('date', { ascending: true }),
        shiftPostings.select('*').order('date', { ascending: true }),
        supabase.from('user_profiles').select('*'),
        pharmacistRatings.select('*')
      ]);

      if (assignedData.error) throw assignedData.error;
      if (requestsData.error) throw requestsData.error;
      if (postingsData.error) throw postingsData.error;
      if (userProfilesData.error) throw userProfilesData.error;
      if (ratingsData.error) throw ratingsData.error;

      setAssigned(assignedData.data || []);
      setRequests(requestsData.data || []);
      setPostings(postingsData.data || []);
      setUserProfiles(userProfilesData.data || {});
      setRatings(ratingsData.data || []);

      setSystemStatus('active');
      setLastUpdated(new Date());
      console.log('✅ All admin data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading admin data:', error);
      setSystemStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // AIマッチングエンジンの初期化
  useEffect(() => {
    const initializeAI = async () => {
      try {
        console.log('AI Matching Engine initialization started...');
        const engine = new AIMatchingEngine();
        const collector = new DataCollector();
        
        setAiMatchingEngine(engine);
        setDataCollector(collector);
        
        console.log('✅ AI Matching Engine initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize AI Matching Engine:', error);
        setUseAIMatching(false);
      }
    };

    initializeAI();
  }, []);

  // データ初期化
  useEffect(() => {
    console.log('=== ADMIN DASHBOARD MOUNTED ===');
    loadAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 緊急シフトリクエスト機能 */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowEmergencyModal(true)}
          className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          <Bell className="w-5 h-5" />
          LINEで呼びかける
        </button>
      </div>

      {/* 統一カレンダーコンポーネントを使用 */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 p-2 sm:p-4 lg:p-6">
        <UnifiedCalendar
          currentDate={currentDate}
          onPreviousMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          getMonthName={getMonthName}
        >
          {/* カレンダーグリッドの内容（元のロジックを保持） */}
          {getDaysInMonth(currentDate).map((d, i) => {
            if (d === null) {
              return (
                <div key={i} className="p-2 sm:p-3 text-center text-xs sm:text-sm border border-gray-200 min-h-[80px] sm:min-h-[90px] bg-gray-50">
                </div>
              );
            }

            const dateStr = formatDateString(currentDate, d);
            const dayAssignedShifts = assigned.filter((s: any) => s.date === dateStr && s.status === 'confirmed');
            const dayRequests = requests.filter((r: any) => r.date === dateStr && r.time_slot !== 'consult');
            const dayPostings = postings.filter((p: any) => p.date === dateStr && p.time_slot !== 'consult');
            const dayConsultRequests = requests.filter((r: any) => r.date === dateStr && r.time_slot === 'consult');

            return (
              <div
                key={d}
                className={`p-2 sm:p-3 text-center text-xs sm:text-sm border border-gray-200 min-h-[80px] sm:min-h-[90px] ${
                  selectedDate === dateStr ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'
                } cursor-pointer transition-colors`}
                onClick={() => setSelectedDate(dateStr)}
              >
                <div className="font-medium">{d}</div>
                
                {/* マッチング状況表示 */}
                <div className="mt-1 space-y-1">
                  {safeLength(dayAssignedShifts) > 0 && (
                    <div className="flex items-center justify-center text-green-600">
                      <span className="sm:hidden">確{safeLength(dayAssignedShifts)}</span>
                      <span className="hidden sm:inline">確定 {safeLength(dayAssignedShifts)}件</span>
                    </div>
                  )}
                  
                  {safeLength(dayRequests) > 0 && safeLength(dayPostings) > 0 && (
                    <div className="flex items-center justify-center text-blue-600">
                      <span className="sm:hidden">マ{Math.min(safeLength(dayRequests), safeLength(dayPostings))}</span>
                      <span className="hidden sm:inline">マッチ {Math.min(safeLength(dayRequests), safeLength(dayPostings))}</span>
                    </div>
                  )}
                  
                  {Math.max(0, safeLength(dayPostings) - safeLength(dayRequests)) > 0 && (
                    <div className="flex items-center justify-center text-red-600">
                      <span className="sm:hidden">不{Math.max(0, safeLength(dayPostings) - safeLength(dayRequests))}</span>
                      <span className="hidden sm:inline">不足 {Math.max(0, safeLength(dayPostings) - safeLength(dayRequests))}</span>
                    </div>
                  )}
                  
                  {safeLength(dayConsultRequests) > 0 && (
                    <div className="flex items-center justify-center text-orange-600">
                      <span className="sm:hidden">相{safeLength(dayConsultRequests)}</span>
                      <span className="hidden sm:inline">相談 {safeLength(dayConsultRequests)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </UnifiedCalendar>

        {/* 右側パネル（簡略化） */}
        <div className="w-full lg:w-1/3 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">選択日: {selectedDate || '日付を選択してください'}</h3>
          
          {selectedDate && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-medium text-blue-800">確定シフト</h4>
                <p className="text-sm text-blue-600">
                  {assigned.filter((s: any) => s.date === selectedDate && s.status === 'confirmed').length}件
                </p>
              </div>
              
              <div className="bg-green-50 p-3 rounded-lg">
                <h4 className="font-medium text-green-800">シフト希望</h4>
                <p className="text-sm text-green-600">
                  {requests.filter((r: any) => r.date === selectedDate && r.time_slot !== 'consult').length}件
                </p>
              </div>
              
              <div className="bg-orange-50 p-3 rounded-lg">
                <h4 className="font-medium text-orange-800">シフト募集</h4>
                <p className="text-sm text-orange-600">
                  {postings.filter((p: any) => p.date === selectedDate && p.time_slot !== 'consult').length}件
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* モーダル */}
      {showEmergencyModal && (
        <EmergencyShiftRequest
          onClose={() => setShowEmergencyModal(false)}
          user={user}
        />
      )}

      {showPasswordChangeModal && (
        <PasswordChangeModal
          onClose={() => setShowPasswordChangeModal(false)}
          user={user}
        />
      )}

      {showDebugModal && (
        <DebugModal
          onClose={() => setShowDebugModal(false)}
          data={debugData}
        />
      )}
    </div>
  );
};

export default AdminDashboardStep1;
