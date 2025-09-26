import React, { useState, useEffect } from 'react';

import { Calendar, AlertCircle, Star, Brain, Zap } from 'lucide-react';
import { shifts, shiftRequests, shiftPostings, shiftRequestsAdmin, supabase, pharmacistRatings } from '../lib/supabase';
import { AIMatchingEngine, MatchCandidate } from '../features/ai-matching/aiMatchingEngine';
import DataCollector from '../features/ai-matching/dataCollector';
import AIMatchingStats from '../features/ai-matching/AIMatchingStats';

interface AdminDashboardProps {
  user: any;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
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

  // AI Matching関連の状態
  const [aiMatchingEngine, setAiMatchingEngine] = useState<AIMatchingEngine | null>(null);
  const [dataCollector, setDataCollector] = useState<DataCollector | null>(null);
  const [aiMatches, setAiMatches] = useState<MatchCandidate[]>([]);
  const [useAIMatching, setUseAIMatching] = useState(true); // デフォルトでAIマッチングを有効
  const [aiMatchingLoading, setAiMatchingLoading] = useState(false);
  const [monthlyMatchingExecuted, setMonthlyMatchingExecuted] = useState(false); // 1ヶ月分マッチング実行フラグ

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
        console.log('Engine instance:', engine);
        console.log('DataCollector instance:', collector);
      } catch (error) {
        console.error('❌ Failed to initialize AI Matching Engine:', error);
        // 初期化に失敗した場合はAIマッチングを無効にする
        setUseAIMatching(false);
      }
    };

    initializeAI();
  }, []);


  // 簡易AIマッチング関数（従来のロジックを踏襲）
  const executeSimpleAIMatching = async (requests: any[], postings: any[]) => {
    console.log('簡易AIマッチング開始:', { requests: requests.length, postings: postings.length });
    
    const matches: any[] = [];
    const usedPharmacists = new Set<string>();
    const usedPharmacies = new Set<string>();

    // ヘルパー関数
    const getProfile = (id: string) => {
      if (!userProfiles) return {} as any;
      if (Array.isArray(userProfiles)) {
        return (userProfiles as any[]).find((u: any) => u?.id === id) || ({} as any);
      }
      return (userProfiles as any)[id] || ({} as any);
    };

    // 薬剤師を評価と優先順位でソート（評価が高い順、同じ評価なら優先度順）
    const sortedRequests = requests.sort((a: any, b: any) => {
          const aRating = getPharmacistRating(a.pharmacist_id);
          const bRating = getPharmacistRating(b.pharmacist_id);
      
      // 評価が異なる場合は評価の高い順
          if (aRating !== bRating) {
            return bRating - aRating;
          }
      
      // 評価が同じ場合は優先度順
          const priorityOrder: { [key: string]: number } = { 'high': 3, 'medium': 2, 'low': 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
      
    let remainingRequired = postings.reduce((sum: number, p: any) => sum + (Number(p.required_staff) || 0), 0);

    // 各薬局の必要人数を管理
    const pharmacyNeeds = postings.map((p: any) => ({
      ...p,
      remaining: Number(p.required_staff) || 0
    }));

    // 時間範囲ベースのマッチング（優先順位順に薬剤師をマッチング）
      sortedRequests.forEach((request: any) => {
      if (remainingRequired <= 0) return;

      const pharmacist = getProfile(request.pharmacist_id);
      const pharmacistNg: string[] = Array.isArray(pharmacist?.ng_list) ? pharmacist.ng_list : [];

      // 利用可能な薬局を探す
      for (const pharmacyNeed of pharmacyNeeds) {
        if (pharmacyNeed.remaining <= 0) continue;

        const pharmacy = getProfile(pharmacyNeed.pharmacy_id);
        const pharmacyNg: string[] = Array.isArray(pharmacy?.ng_list) ? pharmacy.ng_list : [];

        const blockedByPharmacist = pharmacistNg.includes(pharmacyNeed.pharmacy_id);
        const blockedByPharmacy = pharmacyNg.includes(request.pharmacist_id);

        // 時間範囲の互換性を考慮
        if (!blockedByPharmacist && !blockedByPharmacy && isRangeCompatible(request, pharmacyNeed)) {
          // マッチング成功のログ
          console.log(`✅ AIマッチング: 薬剤師(${pharmacist?.name}) ${request.start_time}-${request.end_time} → 薬局(${pharmacy?.name}) ${pharmacyNeed.start_time}-${pharmacyNeed.end_time}`);
          
          // 店舗名を取得
          const getStoreNameFromPosting = (posting: any) => {
            const direct = (posting.store_name || posting.pharmacy_name || '').trim();
            let fromMemo = '';
            if (!direct && typeof posting.memo === 'string') {
              const m = posting.memo.match(/\[store:([^\]]+)\]/);
              if (m && m[1]) fromMemo = m[1];
            }
            return direct || fromMemo || '';
          };
          
          const storeName = getStoreNameFromPosting(pharmacyNeed);
          
          // 適合度スコア計算（評価と優先度を考慮）
          const ratingScore = getPharmacistRating(request.pharmacist_id) / 5; // 0-1に正規化
          const priorityScore = request.priority === 'high' ? 1 : request.priority === 'medium' ? 0.7 : 0.5;
          const compatibilityScore = (ratingScore * 0.7 + priorityScore * 0.3);
          
          matches.push({
            pharmacist: {
              id: request.pharmacist_id,
              name: pharmacist?.name || 'Unknown'
            },
            pharmacy: {
              id: pharmacyNeed.pharmacy_id,
              name: storeName || pharmacy?.name || 'Unknown'
            },
            timeSlot: {
              start: pharmacyNeed.start_time,
              end: pharmacyNeed.end_time,
              date: pharmacyNeed.date
            },
            compatibilityScore,
            reasons: [`評価${getPharmacistRating(request.pharmacist_id)}`, `優先度${request.priority}`, '時間範囲適合']
          });

          usedPharmacists.add(request.pharmacist_id);
          usedPharmacies.add(pharmacyNeed.pharmacy_id);
          pharmacyNeed.remaining--;
          remainingRequired--;
          break;
        } else {
          // マッチング失敗の理由をログ出力
          if (blockedByPharmacist) {
            console.log(`❌ AIマッチング失敗: 薬剤師NGリストに薬局が含まれています (薬剤師:${pharmacist?.name}, 薬局:${pharmacy?.name})`);
          } else if (blockedByPharmacy) {
            console.log(`❌ AIマッチング失敗: 薬局NGリストに薬剤師が含まれています (薬剤師:${pharmacist?.name}, 薬局:${pharmacy?.name})`);
          } else if (!isRangeCompatible(request, pharmacyNeed)) {
            console.log(`❌ AIマッチング失敗: 時間範囲不適合 (薬剤師:${request.start_time}-${request.end_time} vs 薬局:${pharmacyNeed.start_time}-${pharmacyNeed.end_time})`);
          }
        }
      }
    });

    console.log('簡易AIマッチング完了:', matches.length, '件のマッチ');
    return matches;
  };

  // 日付別のAIマッチング結果を保存する状態
  const [aiMatchesByDate, setAiMatchesByDate] = useState<{ [date: string]: any[] }>({});
  
  // 不足薬局の手動マッチング用の状態
  const [manualMatches, setManualMatches] = useState<{ [pharmacyId: string]: string[] }>({});
  
  // 手動マッチング用の薬剤師選択ハンドラー
  const handlePharmacistSelection = (pharmacyId: string, pharmacistId: string, isSelected: boolean) => {
    setManualMatches(prev => {
      const current = prev[pharmacyId] || [];
      if (isSelected) {
        return { ...prev, [pharmacyId]: [...current, pharmacistId] };
      } else {
        return { ...prev, [pharmacyId]: current.filter(id => id !== pharmacistId) };
      }
    });
  };
  
  // 不足薬剤師の希望シフトとして保存
  const saveManualShiftRequests = async (date: string) => {
    try {
      const shiftRequests: any[] = [];
      
      // 手動マッチングの状態を確認
      if (!manualMatches || Object.keys(manualMatches).length === 0) {
        alert('希望シフトとして保存する薬剤師が選択されていません。');
        return;
      }
      
      console.log('手動マッチング全体確認:', {
        manualMatches,
        manualMatchesKeys: Object.keys(manualMatches),
        manualMatchesValues: Object.values(manualMatches)
      });
      
      // 各薬局のマッチングを処理
      for (const [pharmacyId, pharmacistIds] of Object.entries(manualMatches)) {
        console.log('薬局別マッチング確認:', {
          pharmacyId,
          pharmacistIds,
          pharmacistIdsType: typeof pharmacistIds,
          pharmacistIdsLength: pharmacistIds?.length,
          pharmacyIdType: typeof pharmacyId,
          pharmacyIdLength: pharmacyId?.length,
          isPharmacyIdUndefined: pharmacyId === undefined,
          isPharmacyIdNull: pharmacyId === null,
          isPharmacyIdEmpty: pharmacyId === ''
        });
        
        // 薬局IDが無効な場合はスキップ
        if (!pharmacyId || pharmacyId === undefined || pharmacyId === null || pharmacyId === '') {
          console.error('薬局IDが無効です:', pharmacyId);
          continue;
        }
        
        // 薬剤師IDが配列でない場合はスキップ
        if (!Array.isArray(pharmacistIds)) {
          console.error('薬剤師IDが配列ではありません:', pharmacistIds);
          continue;
        }
        
        // 各薬剤師を処理
        for (let index = 0; index < pharmacistIds.length; index++) {
          const pharmacistId = pharmacistIds[index];
          
          console.log(`薬剤師${index + 1}確認:`, {
            pharmacistId,
            pharmacistIdType: typeof pharmacistId,
            pharmacistIdLength: pharmacistId?.length,
            isUndefined: pharmacistId === undefined,
            isNull: pharmacistId === null,
            isEmpty: pharmacistId === ''
          });
          
          // 空の選択をスキップ
          if (!pharmacistId || pharmacistId === '') {
            console.log(`薬剤師${index + 1}は空の選択のためスキップ`);
            continue;
          }
          
          // UUIDの形式チェック
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(pharmacistId)) {
            console.error('Invalid pharmacist ID format:', pharmacistId);
            alert(`薬剤師IDの形式が正しくありません: ${pharmacistId}`);
            return;
          }
          if (!uuidRegex.test(pharmacyId)) {
            console.error('Invalid pharmacy ID format:', pharmacyId);
            alert(`薬局IDの形式が正しくありません: ${pharmacyId}`);
            return;
          }
          
          // 薬局の応募時間を取得
          const pharmacyPosting = postings.find((p: any) => p.pharmacy_id === pharmacyId && p.date === date);
          const startTime = pharmacyPosting?.start_time || '09:00:00';
          const endTime = pharmacyPosting?.end_time || '18:00:00';
          
          // 希望シフトデータを作成
          const shiftRequestData = {
            pharmacist_id: pharmacistId,
            date: date,
            time_slot: 'custom',
            start_time: startTime,
            end_time: endTime,
            priority: 'high', // 手動選択なので高優先度
            memo: `手動選択: 薬局${pharmacyId ? pharmacyId.slice(-4) : 'unknown'}の応募時間に合わせて希望`,
            status: 'pending'
          };
          
          console.log('希望シフトデータ作成:', shiftRequestData);
          shiftRequests.push(shiftRequestData);
        }
      }
      
      if (shiftRequests.length > 0) {
        console.log('希望シフト保存データ:', shiftRequests);
        console.log('データベース挿入前の確認:', {
          shiftRequestsCount: shiftRequests.length,
          firstRequest: shiftRequests[0],
          allRequests: shiftRequests
        });
        
        // shift_requestsテーブルに保存
        if (!supabase) {
          console.error('Supabase client is not available');
          return;
        }
        
        const { data: insertResult, error } = await supabase
          .from('shift_requests')
          .insert(shiftRequests)
          .select();
        
        if (error) {
          console.error('希望シフトの保存に失敗:', error);
          alert(`希望シフトの保存に失敗しました: ${error.message}`);
          return;
        }
        
        console.log('希望シフト保存成功:', insertResult);
        setManualMatches({});
        
        // 成功メッセージ
        alert(`${shiftRequests.length}件の希望シフトを保存しました。\n\n注意: 手動マッチングにより新しいシフト希望が作成されました。AIマッチングを実行します。`);
        
        // データを再読み込み（新しい希望シフトを取得）
        console.log('データを再読み込み中...');
        await loadAll();
        console.log('データ再読み込み完了');
        
        // AIマッチングを再実行
        console.log('AIマッチングを再実行中...');
        await executeMonthlyAIMatching();
        console.log('AIマッチング再実行完了');
        
        // データベース挿入後の確認
        setTimeout(async () => {
          try {
            const { data: insertedData, error: checkError } = await supabase
              .from('shift_requests')
              .select('*')
              .eq('date', date)
              .order('created_at', { ascending: false })
              .limit(10);
            
            if (checkError) {
              console.error('データベース確認エラー:', checkError);
            } else {
              console.log('希望シフト保存確認:', {
                insertedCount: insertedData?.length || 0,
                insertedData: insertedData
              });
            }
          } catch (error) {
            console.error('データベース確認エラー:', error);
          }
        }, 1000);
      } else {
        console.log('希望シフトとして保存するデータがありません');
        alert('希望シフトとして保存するデータがありません。薬剤師を選択してください。');
      }
    } catch (error) {
      console.error('希望シフトの保存に失敗:', error);
      alert(`希望シフトの保存に失敗しました: ${(error as any).message || 'Unknown error'}`);
    }
  };

  // 月間の不足薬局を分析する関数
  const analyzeMonthlyShortage = (matchesByDate: { [date: string]: any[] }) => {
    const shortagePharmacies: any[] = [];
    let totalShortage = 0;
    
    console.log('analyzeMonthlyShortage開始:', { matchesByDate, requests: requests?.length, postings: postings?.length });
    
    // matchesByDateが空の場合は、全postingsから分析
    const datesToAnalyze = Object.keys(matchesByDate).length > 0 ? Object.keys(matchesByDate) : 
      Array.from(new Set(postings?.map(p => p.date) || []));
    
    console.log('分析対象日付:', datesToAnalyze);
    
    
    // 各日付の不足状況を分析
    datesToAnalyze.forEach(date => {
      console.log(`日付 ${date} の分析開始`);
      const allDayRequests = Array.isArray(requests) ? requests.filter((r: any) => r.date === date) : [];
      const allDayPostings = Array.isArray(postings) ? postings.filter((p: any) => p.date === date) : [];
      
      // 確定済みステータスの希望・募集を除外
      const { filteredRequests: dayRequests, filteredPostings: dayPostings } = filterConfirmedRequestsAndPostings(
        allDayRequests, 
        allDayPostings
      );
      const dayMatches = matchesByDate[date] || [];
      
      
      // 薬局ごとの募集数とマッチ数を計算
      const pharmacyNeeds: { [pharmacyId: string]: { 
        id: string;
        name: string; 
        store_name: string;
        required: number; 
        matched: number; 
        shortage: number; 
        postings: any[] 
      } } = {};
      
      // 募集数を集計（required_staffを使用）
      dayPostings.forEach(posting => {
        const pharmacyId = posting.pharmacy_id;
        if (!pharmacyNeeds[pharmacyId]) {
          pharmacyNeeds[pharmacyId] = {
            id: pharmacyId,
            name: userProfiles[pharmacyId]?.name || `薬局${pharmacyId ? pharmacyId.slice(-4) : 'unknown'}`,
            store_name: posting.store_name || '店舗名なし',
            required: 0,
            matched: 0,
            shortage: 0,
            postings: []
          };
        }
        // required_staffフィールドを使用（デフォルトは1）
        const requiredStaff = posting.required_staff || 1;
        pharmacyNeeds[pharmacyId].required += requiredStaff;
        pharmacyNeeds[pharmacyId].postings.push(posting);
        console.log(`薬局 ${pharmacyId}: 募集${requiredStaff}人追加, 合計${pharmacyNeeds[pharmacyId].required}人`);
      });
      
      // マッチ数を集計
      dayMatches.forEach(match => {
        const pharmacyId = match.pharmacy.id;
        if (pharmacyNeeds[pharmacyId]) {
          pharmacyNeeds[pharmacyId].matched++;
          console.log(`薬局 ${pharmacyId}: マッチ1人追加, 合計${pharmacyNeeds[pharmacyId].matched}人`);
        }
      });
      
      // 不足数を計算
      Object.values(pharmacyNeeds).forEach(pharmacy => {
        pharmacy.shortage = Math.max(0, pharmacy.required - pharmacy.matched);
        console.log(`薬局 ${pharmacy.name}: 必要${pharmacy.required}人, マッチ${pharmacy.matched}人, 不足${pharmacy.shortage}人`);
        if (pharmacy.shortage > 0) {
          totalShortage += pharmacy.shortage;
          shortagePharmacies.push({
            ...pharmacy,
            date: date,
            store_name: pharmacy.postings[0]?.store_name || '',
            start_time: pharmacy.postings[0]?.start_time || '',
            end_time: pharmacy.postings[0]?.end_time || ''
          });
          console.log(`不足薬局追加: ${pharmacy.name}, 不足${pharmacy.shortage}人`);
        }
      });
    });
    
    
    return {
      totalShortage,
      shortagePharmacies
    };
  };

  // 薬局の不足状況を分析する関数
  const analyzePharmacyShortage = (date: string) => {
    const allDayRequests = Array.isArray(requests) ? requests.filter((r: any) => r.date === date) : [];
    const allDayPostings = Array.isArray(postings) ? postings.filter((p: any) => p.date === date) : [];
    
    // 確定済みステータスの希望・募集を除外
    const { filteredRequests: dayRequests, filteredPostings: dayPostings } = filterConfirmedRequestsAndPostings(
      allDayRequests, 
      allDayPostings
    );
    const dayMatches = aiMatchesByDate[date] || [];

    // 薬局ごとの募集数とマッチ数を計算
    const pharmacyNeeds: { [pharmacyId: string]: { 
      id: string;
      name: string; 
      store_name: string;
      required: number; 
      matched: number; 
      shortage: number; 
      postings: any[] 
    } } = {};

    // 募集数を集計
    dayPostings.forEach(posting => {
      const pharmacyId = posting.pharmacy_id;
      if (!pharmacyNeeds[pharmacyId]) {
        pharmacyNeeds[pharmacyId] = {
          id: pharmacyId,
          name: userProfiles[pharmacyId]?.name || `薬局${pharmacyId ? pharmacyId.slice(-4) : 'unknown'}`,
          store_name: posting.store_name || '店舗名なし',
          required: 0,
          matched: 0,
          shortage: 0,
          postings: []
        };
      }
      // required_staffフィールドを使用（デフォルトは1）
      const requiredStaff = posting.required_staff || 1;
      pharmacyNeeds[pharmacyId].required += requiredStaff;
      pharmacyNeeds[pharmacyId].postings.push(posting);
    });

    // マッチ数を集計
    dayMatches.forEach(match => {
      const pharmacyId = match.pharmacy.id;
      if (pharmacyNeeds[pharmacyId]) {
        pharmacyNeeds[pharmacyId].matched++;
      }
    });

    // 不足数を計算
    Object.values(pharmacyNeeds).forEach(pharmacy => {
      pharmacy.shortage = Math.max(0, pharmacy.required - pharmacy.matched);
    });

    // 不足がある薬局のみを配列で返す
    const shortagePharmacies = Object.values(pharmacyNeeds).filter(pharmacy => pharmacy.shortage > 0);
    
    
    return shortagePharmacies;
  };

  // 1ヶ月分のAIマッチングの実行
  const executeMonthlyAIMatching = async () => {
    if (!aiMatchingEngine) {
      console.error('AI Matching Engine not initialized');
      return;
    }

    setAiMatchingLoading(true);
    try {
      // 既存のマッチング結果をクリア
      setAiMatches([]);
      setAiMatchesByDate({});
      setMonthlyMatchingExecuted(false); // マッチング実行フラグをリセット
      console.log('既存のマッチング結果をクリアしました');
      console.log('🔄 monthlyMatchingExecutedフラグをfalseにリセット');

      // 現在の月の全ての日付を取得
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      // 確定済みシフトの薬剤師IDと日付の組み合わせを取得（重複マッチングを防ぐため）
      const confirmedMatches = new Set();
      if (Array.isArray(assigned)) {
        assigned.forEach((shift: any) => {
          if (shift.status === 'confirmed') {
            // 薬剤師ID + 日付 + 薬局ID の組み合わせでユニークキーを作成
            const matchKey = `${shift.pharmacist_id}_${shift.date}_${shift.pharmacy_id}`;
            confirmedMatches.add(matchKey);
          }
        });
      }
      
      console.log('確定済みマッチング数:', confirmedMatches.size);
      
      const monthlyRequests = Array.isArray(requests) ? requests.filter((r: any) => {
        const requestDate = new Date(r.date);
        return requestDate.getMonth() === currentMonth && requestDate.getFullYear() === currentYear;
      }) : [];
      
      const monthlyPostings = Array.isArray(postings) ? postings.filter((p: any) => {
        const postingDate = new Date(p.date);
        return postingDate.getMonth() === currentMonth && postingDate.getFullYear() === currentYear;
      }) : [];

      if (monthlyRequests.length === 0 && monthlyPostings.length === 0) {
        alert('今月の希望シフトまたは募集シフトがありません。');
        return;
      }

      console.log(`1ヶ月分のマッチング開始: 希望${monthlyRequests.length}件、募集${monthlyPostings.length}件`);
      console.log('monthlyRequests (全件):', monthlyRequests);
      console.log('monthlyPostings (全件):', monthlyPostings);
      console.log('userProfiles:', userProfiles);
      console.log('ratings:', ratings);
      console.log('storeNgPharmacies:', storeNgPharmacies);
      console.log('storeNgPharmacists:', storeNgPharmacists);
      
      // 簡潔なデバッグ情報をモーダルで表示
      let debugInfo = `=== AIマッチング処理デバッグ ===\n`;
      debugInfo += `シフト希望数: ${monthlyRequests.length}件\n`;
      debugInfo += `シフト募集数: ${monthlyPostings.length}件\n\n`;
      
      // サンプルデータを3件まで表示
      if (monthlyRequests.length > 0) {
        debugInfo += `希望サンプル:\n`;
        (monthlyRequests || []).slice(0, 3).forEach((req, i) => {
          debugInfo += `${i+1}. 日付: ${req.date}, 時間: ${req.start_time}-${req.end_time}\n`;
        });
        debugInfo += `\n`;
      }
      
      if (monthlyPostings.length > 0) {
        debugInfo += `募集サンプル:\n`;
        (monthlyPostings || []).slice(0, 3).forEach((post, i) => {
          debugInfo += `${i+1}. 日付: ${post.date}, 時間: ${post.start_time}-${post.end_time}\n`;
        });
        debugInfo += `\n`;
      }

      // 時間適合性の詳細分析を追加
      debugInfo += `\n=== 時間適合性分析 ===\n`;
      let compatibleCount = 0;
      let incompatibleCount = 0;
      
      monthlyRequests.forEach((request, i) => {
        debugInfo += `\n希望 ${i+1}: 薬剤師ID ${request.pharmacist_id}, 日付 ${request.date}, 時間 ${request.start_time}-${request.end_time}\n`;
        
        const compatiblePostings = monthlyPostings.filter(posting => {
          if (posting.date !== request.date) return false;
          
          const rs = request.start_time;
          const re = request.end_time;
          const ps = posting.start_time;
          const pe = posting.end_time;
          
          if (!rs || !re || !ps || !pe) return false;
          
          // 時間を数値に変換して比較
          const timeToMinutes = (timeStr: string) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
          };

          const requestStart = timeToMinutes(rs);
          const requestEnd = timeToMinutes(re);
          const postingStart = timeToMinutes(ps);
          const postingEnd = timeToMinutes(pe);

          // 薬剤師が薬局の希望時間を完全に満たしているかチェック
          const isCompatible = requestStart <= postingStart && requestEnd >= postingEnd;
          
          // デバッグ: 時間比較の詳細
          debugInfo += `    [DEBUG] 薬剤師: ${rs}(${requestStart}分) <= ${ps}(${postingStart}分) = ${requestStart <= postingStart}, ${re}(${requestEnd}分) >= ${pe}(${postingEnd}分) = ${requestEnd >= postingEnd}\n`;
          
          debugInfo += `  - 募集 ${posting.id}: 薬局ID ${posting.pharmacy_id}, 時間 ${ps}-${pe}, 適合: ${isCompatible ? 'YES' : 'NO'}\n`;
          
          return isCompatible;
        });
        
        if (compatiblePostings.length > 0) {
          compatibleCount++;
          debugInfo += `  → 適合する募集: ${compatiblePostings.length}件\n`;
        } else {
          incompatibleCount++;
          debugInfo += `  → 適合する募集: 0件\n`;
        }
      });
      
      debugInfo += `\n適合性サマリー: 適合あり ${compatibleCount}件, 適合なし ${incompatibleCount}件\n`;
      
      // 薬局名取得のデバッグ情報を追加
      debugInfo += `\n=== 薬局名取得デバッグ ===\n`;
      debugInfo += `userProfiles件数: ${Object.keys(userProfiles || {}).length}\n`;
      debugInfo += `userProfiles利用可能キー: ${Object.keys(userProfiles || {}).join(', ')}\n\n`;
      
      // サンプル募集の薬局名取得状況を確認
      if (monthlyPostings.length > 0) {
        debugInfo += `募集サンプルの薬局名取得状況:\n`;
        (monthlyPostings || []).slice(0, 3).forEach((posting, i) => {
          const pharmacyId = posting.pharmacy_id;
          const userProfile = userProfiles?.[pharmacyId];
          const storeName = posting.store_name;
          
          debugInfo += `${i+1}. 薬局ID: ${pharmacyId}\n`;
          debugInfo += `   - store_name: "${storeName || 'なし'}"\n`;
          debugInfo += `   - userProfiles[${pharmacyId}]: ${userProfile ? `"${userProfile.name || '名前なし'}"` : 'なし'}\n`;
          debugInfo += `   - 最終表示名: ${storeName || userProfile?.name || `薬局${pharmacyId ? pharmacyId.slice(-4) : 'unknown'}`}\n\n`;
        });
      }

      // 日付別のマッチングを実行
      debugInfo += `\n=== 日付別AIマッチングエンジン実行 ===\n`;
      
      // 日付別のマッチング結果を保存
      const matchesByDate: { [date: string]: any[] } = {};
      
      // 現在の月の全ての日付を取得
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const allDates = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      });
      
      debugInfo += `処理対象日付: ${allDates.length}日\n`;
      
      for (const date of allDates) {
        debugInfo += `\n--- 日付 ${date} のマッチング ---\n`;
        
        // その日の希望と募集を取得
        const dayRequests = monthlyRequests.filter((r: any) => r.date === date);
        const dayPostings = monthlyPostings.filter((p: any) => p.date === date);
        
        debugInfo += `希望: ${dayRequests.length}件, 募集: ${dayPostings.length}件\n`;
        
        if (dayRequests.length === 0 || dayPostings.length === 0) {
          debugInfo += `データ不足のためスキップ\n`;
          matchesByDate[date] = [];
          continue;
        }
        
        try {
          const dayMatches = await aiMatchingEngine.executeOptimalMatching(dayRequests, dayPostings, {
            useAPI: false,
            algorithm: 'hybrid',
            priority: 'pharmacy_satisfaction'
          }, userProfiles, ratings, storeNgPharmacies, storeNgPharmacists, confirmedMatches);
          
          matchesByDate[date] = dayMatches;
          debugInfo += `マッチング成功: ${dayMatches.length}件\n`;
          
          // マッチング詳細を表示
          dayMatches.forEach((match, i) => {
            debugInfo += `  ${i+1}. 薬剤師: ${match.pharmacist?.name}, 薬局: ${match.pharmacy?.name}\n`;
          });
          
        } catch (error) {
          debugInfo += `エラー: ${error instanceof Error ? error.message : String(error)}\n`;
          matchesByDate[date] = [];
        }
      }
      
      // 全マッチング結果を統合
      const monthlyMatches = Object.values(matchesByDate).flat();
      debugInfo += `\n=== 統合結果 ===\n`;
      debugInfo += `総マッチング件数: ${monthlyMatches.length}件\n`;
      
      // 日付別のマッチング結果を保存
      setAiMatchesByDate(matchesByDate);
      setAiMatches(monthlyMatches);
      
      // 1ヶ月分のマッチング実行完了フラグを設定
      setMonthlyMatchingExecuted(true);
      console.log('✅ 1ヶ月分マッチング実行完了 - monthlyMatchingExecutedフラグをtrueに設定');
      
      console.log('マッチング結果:', monthlyMatches);
      console.log('日付別マッチング結果:', matchesByDate);
      
      // マッチング結果の詳細分析
      debugInfo += `\n=== マッチング結果詳細 ===\n`;
      debugInfo += `マッチング件数: ${monthlyMatches.length}件\n`;
      
      if (monthlyMatches.length > 0) {
        debugInfo += `マッチング詳細:\n`;
        monthlyMatches.forEach((match, i) => {
          debugInfo += `${i+1}. 薬剤師ID: ${match.pharmacist?.id}, 薬局ID: ${match.pharmacy?.id}\n`;
          debugInfo += `   日付: ${match.timeSlot?.date}, 時間: ${match.timeSlot?.startTime}-${match.timeSlot?.endTime}\n`;
          debugInfo += `   スコア: ${match.compatibilityScore}\n`;
        });
      } else {
        debugInfo += `\n=== マッチング失敗の原因分析 ===\n`;
        debugInfo += `1. 時間適合性: 適合あり ${compatibleCount}件, 適合なし ${incompatibleCount}件\n`;
        debugInfo += `2. データ確認:\n`;
        debugInfo += `   - 希望データ: ${monthlyRequests.length}件\n`;
        debugInfo += `   - 募集データ: ${monthlyPostings.length}件\n`;
        debugInfo += `   - ユーザープロフィール: ${Object.keys(userProfiles).length}件\n`;
        debugInfo += `   - 評価データ: ${ratings.length}件\n`;
        debugInfo += `3. 考えられる原因:\n`;
        debugInfo += `   - AIマッチングエンジンの候補生成で0件\n`;
        debugInfo += `   - NGリストによるブロック\n`;
        debugInfo += `   - 既存の確定シフトとの重複\n`;
        debugInfo += `   - その他のフィルタリング条件\n`;
      }
      
      // デバッグ情報をコンソールに出力
      console.log('DEBUG: debugInfo content:', debugInfo);
      console.log('DEBUG: debugInfo length:', debugInfo.length);

      // グローバルなマッチング結果を保存
      setAiMatches(monthlyMatches);

      console.log(`1ヶ月分のAIマッチング完了: ${monthlyMatches.length}件のマッチ`);
      
      // 詳細な結果分析
      const totalMatches = monthlyMatches.length;
      const datesWithMatches = Object.keys(matchesByDate).length;
      
      // 不足薬局の分析
      console.log('不足薬局分析開始:', { matchesByDate, requests: requests?.length, postings: postings?.length });
      const shortageAnalysis = analyzeMonthlyShortage(matchesByDate);
      console.log('不足薬局分析結果:', shortageAnalysis);
      
      
      // 詳細な結果表示
      let resultMessage = `1ヶ月分のマッチングが完了しました。\n\n`;
      resultMessage += `=== マッチング結果 ===\n`;
      resultMessage += `マッチング件数: ${totalMatches}件\n`;
      resultMessage += `マッチング日数: ${datesWithMatches}日\n\n`;
      
      if (shortageAnalysis.totalShortage > 0) {
        resultMessage += `=== 不足薬局一覧 ===\n`;
        resultMessage += `不足総数: ${shortageAnalysis.totalShortage}人\n`;
        resultMessage += `不足薬局数: ${shortageAnalysis.shortagePharmacies.length}薬局\n\n`;
        
        shortageAnalysis.shortagePharmacies.forEach((pharmacy, index) => {
          resultMessage += `${index + 1}. ${pharmacy.name}（${pharmacy.store_name || '店舗名なし'}）\n`;
          resultMessage += `   日付: ${pharmacy.date}\n`;
          resultMessage += `   時間: ${pharmacy.start_time || '09:00'}-${pharmacy.end_time || '18:00'}\n`;
          resultMessage += `   不足人数: ${pharmacy.shortage}人\n\n`;
        });
      } else {
        resultMessage += `=== 不足薬局 ===\n`;
        resultMessage += `不足薬局: なし（全ての薬局でマッチング完了）\n\n`;
      }
      
      resultMessage += `右側のパネルで詳細なマッチング状況を確認できます。`;
      
      console.log('1ヶ月分マッチング結果:', resultMessage);
      
      // 1ヶ月分マッチング実行後は、aiMatchesをクリアして日付選択時のみ表示
      setAiMatches([]);
    } catch (error) {
      console.error('1ヶ月分のAIマッチングに失敗:', error);
      console.error('1ヶ月分のAIマッチングに失敗しました。');
    } finally {
      setAiMatchingLoading(false);
    }
  };

  // 日別のAIマッチングの実行（既存の機能を保持）
  const executeAIMatching = async (date: string) => {
    if (!aiMatchingEngine) {
      console.error('AI Matching Engine not initialized');
      return;
    }

    setAiMatchingLoading(true);
    try {
      // 最新の確定シフトを取得してから判定（状態の取りこぼしを防止）
      let freshAssigned: any[] = Array.isArray(assigned) ? (assigned as any[]) : [];
      try {
        if (supabase) {
          const { data: fresh, error: freshErr } = await supabase
            .from('assigned_shifts')
            .select('pharmacist_id, pharmacy_id, date, status, store_name')
            .eq('date', date)
            .eq('status', 'confirmed');
          if (!freshErr && Array.isArray(fresh)) {
            freshAssigned = fresh;
          }
        }
      } catch (e) {
        console.warn('最新の確定シフト取得に失敗しました（フォールバック: 既存stateを使用）:', e);
      }
      // 当日に確定シフトが1件でもある場合はAIマッチングを実行しない
      // より確実にチェックするため、既存のassigned stateも確認
      const existingAssigned = Array.isArray(assigned) 
        ? assigned.filter((s: any) => s.date === date && s.status === 'confirmed')
        : [];
      
      const totalConfirmedShifts = Math.max(freshAssigned.length, existingAssigned.length);
      
      if (totalConfirmedShifts > 0) {
        setAiMatches([]);
        setAiMatchingLoading(false);
        alert('この日は既に確定シフトがあります。AIマッチングは実行しません。');
        return;
      }
      // 最新のデータを再取得してからフィルタリング
      let freshRequests: any[] = [];
      let freshPostings: any[] = [];
      
      if (supabase) {
        // 最新の希望データを取得
        const { data: requestsData } = await supabase
          .from('shift_requests')
          .select('*')
          .eq('date', date);
        if (requestsData) freshRequests = requestsData;
        
        // 最新の募集データを取得
        const { data: postingsData } = await supabase
          .from('shift_postings')
          .select('*')
          .eq('date', date);
        if (postingsData) freshPostings = postingsData;
      }
      
      // 未確定のみ抽出（最新データから）
      const dayRequests = freshRequests.filter((r: any) => r.status !== 'confirmed');
      const dayPostings = freshPostings.filter((p: any) => p.status !== 'confirmed');
      
      console.log('=== AIマッチング用データ取得 ===', {
        date,
        freshRequests: freshRequests.length,
        freshPostings: freshPostings.length,
        filteredRequests: dayRequests.length,
        filteredPostings: dayPostings.length,
        confirmedRequests: freshRequests.filter(r => r.status === 'confirmed').length,
        confirmedPostings: freshPostings.filter(p => p.status === 'confirmed').length
      });

      // 既に確定済みの組み合わせ（薬剤師ID_日付_薬局ID）をセット化
      const confirmedMatches = new Set<string>();
      const confirmedPharmacies = new Set<string>();
      const confirmedPharmacists = new Set<string>();
      const confirmedStoreKeys = new Set<string>(); // pharmacy_id + store_name 単位
      if (Array.isArray(freshAssigned)) {
        (freshAssigned as any[]).forEach((s: any) => {
          if (s?.status === 'confirmed' && s?.date === date) {
            confirmedMatches.add(`${s.pharmacist_id}_${s.date}_${s.pharmacy_id}`);
            confirmedPharmacies.add(s.pharmacy_id);
            confirmedPharmacists.add(s.pharmacist_id);
            const storeKey = `${s.pharmacy_id}_${(s.store_name || '').trim()}`;
            confirmedStoreKeys.add(storeKey);
          }
        });
      }

      // 自動自己診断: なぜ除外されないのかを可視化
      try {
        const diag = (dayPostings || []).map((p: any) => {
          const key = `${p.pharmacy_id}_${(p.store_name || '').trim()}`;
          const reasons: string[] = [];
          if (p.status === 'confirmed') reasons.push('posting.status=confirmed');
          if (confirmedPharmacies.has(p.pharmacy_id)) reasons.push('pharmacy_id confirmed on date');
          if (confirmedStoreKeys.has(key)) reasons.push('pharmacy_id+store_name confirmed on date');
          return {
            posting_id: p.id,
            pharmacy_id: p.pharmacy_id,
            store_name: p.store_name,
            status: p.status,
            excluded: reasons.length > 0,
            reasons
          };
        });
        const excluded = diag.filter(d => d.excluded);
        const notExcluded = diag.filter(d => !d.excluded);
        console.log('=== AI前自己診断: 当日の募集診断 ===', {
          date,
          postings_total: (dayPostings || []).length,
          excluded_count: excluded.length,
          sample_excluded: excluded.slice(0, 5),
          sample_not_excluded: notExcluded.slice(0, 5)
        });
      } catch (e) {
        console.warn('診断ログ出力に失敗:', e);
      }

      // 薬局側も「未確定のみ」でマッチング（open/recruitingに限定）
      // かつ、当日に確定がある薬局（および店舗）は除外
      const allowedPostingStatuses = new Set(['open', 'recruiting']);
      const filteredDayPostings = dayPostings.filter((p: any) => {
        if (!allowedPostingStatuses.has((p.status || '').toLowerCase())) return false;
        if (confirmedPharmacies.has(p.pharmacy_id)) return false;
        const key = `${p.pharmacy_id}_${(p.store_name || '').trim()}`;
        if ((confirmedStoreKeys as Set<string>).has(key)) return false;
        return true;
      });
      const filteredDayRequests = dayRequests.filter((r: any) => !confirmedPharmacists.has(r.pharmacist_id));

      // 募集/希望が0件なら実行せずに結果をクリア（前回の残像を防止）
      if (filteredDayPostings.length === 0 || filteredDayRequests.length === 0) {
        try {
          console.log('AIマッチングをスキップ（募集/希望が0件）', {
            date,
            requests: filteredDayRequests.length,
            postings: filteredDayPostings.length
          });
        } catch {}
        setAiMatches([]);
        setAiMatchingLoading(false);
        return;
      }

      console.log(`AI Matching for ${date}: ${filteredDayRequests.length} requests, ${filteredDayPostings.length} postings`);

      let matches = await aiMatchingEngine.executeOptimalMatching(filteredDayRequests, filteredDayPostings, {
        useAPI: true,
        algorithm: 'hybrid',
        priority: 'balance'
      }, userProfiles, ratings, storeNgPharmacies, storeNgPharmacists, confirmedMatches as unknown as Set<string>);

      // 最終防御: 返ってきた結果からも確定済み薬局/店舗を除外
      try {
        const filtered = (matches || []).filter((m: any) => {
          const pharmacyId = m?.pharmacy?.id;
          const storeName = (m?.pharmacy?.name || '').trim();
          if (!pharmacyId) return false;
          if (confirmedPharmacies.has(pharmacyId)) return false;
          const key = `${pharmacyId}_${storeName}`;
          if ((confirmedStoreKeys as Set<string>).has(key)) return false;
          return true;
        });
        matches = filtered;
      } catch (e) {
        console.warn('Post-filtering AI matches failed:', e);
      }
      setAiMatches(matches);

      console.log(`AI Matching completed: ${matches.length} matches found`);
    } catch (error) {
      console.error('AI Matching failed:', error);
    } finally {
      setAiMatchingLoading(false);
    }
  };

  // 確定がある日に以前のAI結果が残らないようにクリア
  useEffect(() => {
    try {
      if (!selectedDate) return;
      const hasConfirmed = Array.isArray(assigned)
        ? (assigned as any[]).some((s: any) => s?.date === selectedDate && s?.status === 'confirmed')
        : false;
      if (hasConfirmed) {
        console.log('Clearing AI matches because selected date has confirmed shifts', {
          selectedDate,
          aiCount: aiMatches?.length || 0,
          confirmedShifts: assigned?.filter((s: any) => s?.date === selectedDate && s?.status === 'confirmed')?.length || 0
        });
        setAiMatches([]);
        // AIマッチング結果の日付別マップもクリア
        setAiMatchesByDate(prev => {
          const newMap = { ...prev };
          delete newMap[selectedDate];
          return newMap;
        });
      }
    } catch {}
  }, [selectedDate, assigned, aiMatches]);

  // AIマッチング結果を確定シフトに変換
  const convertAIMatchesToShifts = (matches: MatchCandidate[], date: string) => {
    return matches.map(match => {
      // 薬局名と店舗名を正しく取得
      const pharmacyName = userProfiles[match.pharmacy.id]?.name || 'Unknown';
      const storeName = match.pharmacy.name && match.pharmacy.name !== pharmacyName ? match.pharmacy.name : pharmacyName;
      
      return { 
        pharmacist_id: match.pharmacist.id,
        pharmacy_id: match.pharmacy.id,
        date: date,
        time_slot: 'negotiable', // デフォルト値（使用しないが制約のため必要）
        start_time: match.timeSlot.start,
        end_time: match.timeSlot.end,
        status: 'confirmed',
        store_name: storeName,
        memo: `マッチング: ${match.compatibilityScore.toFixed(2)} score - ${match.reasons.join(', ')}`
      };
    });
  };

  // 時間範囲互換性チェック関数
  const isRangeCompatible = (request: any, posting: any) => {
    const rs = request?.start_time;
    const re = request?.end_time;
    const ps = posting?.start_time;
    const pe = posting?.end_time;
    
    if (!rs || !re || !ps || !pe) return false;

    // 時間を数値に変換（HH:MM:SS形式を分に変換）
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const requestStart = timeToMinutes(rs);
    const requestEnd = timeToMinutes(re);
    const postingStart = timeToMinutes(ps);
    const postingEnd = timeToMinutes(pe);

    console.log('AdminDashboard時間適合性チェック:', {
      request: { start: rs, end: re, startMin: requestStart, endMin: requestEnd },
      posting: { start: ps, end: pe, startMin: postingStart, endMin: postingEnd },
      condition: `${requestStart} <= ${postingStart} && ${requestEnd} >= ${postingEnd}`,
      result: requestStart <= postingStart && requestEnd >= postingEnd
    });

    // 薬剤師が薬局の希望時間を完全に満たしているかチェック
    return requestStart <= postingStart && requestEnd >= postingEnd;
  };

  // 薬剤師の評価を取得する関数
  const getPharmacistRating = (pharmacistId: string) => {
    const pharmacistRatings = Array.isArray(ratings) ? ratings.filter(r => r.pharmacist_id === pharmacistId) : [];
    if (pharmacistRatings.length === 0) return 0;
    
    const average = pharmacistRatings.reduce((sum, r) => sum + r.rating, 0) / pharmacistRatings.length;
    return Math.round(average * 10) / 10; // 小数点第1位まで
  };

  // 追加フォームの表示状態
  const [showAddForms, setShowAddForms] = useState<{[key: string]: boolean}>({
    posting: false,
    request: false
  });

  // 追加フォーム用のローカル状態
  const [newPosting, setNewPosting] = useState<any>({
    pharmacy_id: '',
    time_slot: 'morning',
    required_staff: 1,
    store_name: '',
    memo: ''
  });
  const [newRequest, setNewRequest] = useState<any>({
    pharmacist_id: '',
    time_slot: 'morning',
    priority: 'medium'
  });

  // 編集フォーム用の状態（募集/希望）
  const [editingPostingId, setEditingPostingId] = useState<string | null>(null);
  const [postingEditForm, setPostingEditForm] = useState<any>({
    time_slot: 'morning',
    required_staff: 1,
    store_name: '',
    memo: ''
  });
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [requestEditForm, setRequestEditForm] = useState<any>({
    time_slot: 'morning',
    priority: 'medium',
    memo: ''
  });

  // ユーザー管理（編集/削除）
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userEditForm, setUserEditForm] = useState<any>({
    name: '',
    store_names: '', // カンマ区切り入力（薬局のみ）
    ng_list: [] as string[] // 薬局編集時: 薬剤師IDの配列
  });

  const beginEditUser = (profile: any) => {
    setEditingUserId(profile.id);
    
    let ngList: string[] = [];
    if (profile.user_type === 'pharmacist') {
      // 薬剤師の場合はstore_ng_pharmaciesから読み込み
      const ngPharmacies = storeNgPharmacists[profile.id] || [];
      const pharmacyGroups: {[pharmacyId: string]: string[]} = {};
      
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
        const allStoresInNg = allStoreNames.every((storeName: string) => stores.includes(storeName));
        
        if (allStoresInNg && stores.length === allStoreNames.length) {
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
      const ngPharmacists = storeNgPharmacists[profile.id] || [];
      const pharmacistIds = new Set<string>();
      
      ngPharmacists.forEach((ngPharmacist: any) => {
        pharmacistIds.add(ngPharmacist.pharmacist_id);
      });
      
      ngList = Array.from(pharmacistIds);
    } else {
      // その他の場合は従来通り
      ngList = Array.isArray(profile.ng_list) ? [...profile.ng_list] : [];
    }
    
    setUserEditForm({
      name: profile.name || '',
      store_names: Array.isArray(profile.store_names) ? profile.store_names.join(',') : '',
      ng_list: ngList
    });
  };

  const saveEditUser = async (profile: any) => {
    try {
      const updates: any = { name: userEditForm.name };
      if (profile.user_type === 'pharmacy' || profile.user_type === 'store') {
        updates.store_names = (userEditForm.store_names || '')
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);
      }

      // 薬剤師の場合、NG薬局設定をstore_ng_pharmaciesテーブルに保存
      if (profile.user_type === 'pharmacist') {
        if (!supabase) {
          console.error('Supabase client is not available');
          return;
        }
        
        // 一時的にRLSを無効化
        try {
          await supabase.rpc('disable_rls_for_table', { table_name: 'store_ng_pharmacies' });
          console.log('store_ng_pharmacies RLS無効化成功（削除処理）');
        } catch (rlsError) {
          console.log('store_ng_pharmacies RLS無効化スキップ（削除処理）:', rlsError);
        }

        // 既存のNG薬局設定を削除
        console.log('既存NG薬局設定を削除中...', profile.id);
        const { error: deleteError } = await supabase
          .from('store_ng_pharmacies')
          .delete()
          .eq('pharmacist_id', profile.id);

        if (deleteError) {
          console.error('既存NG薬局設定の削除エラー:', deleteError);
          alert(`既存NG薬局設定の削除に失敗しました: ${deleteError.message}`);
          return;
        }
        console.log('既存NG薬局設定の削除完了');

        // 新しいNG薬局設定を追加
        const ngList = Array.isArray(userEditForm.ng_list)
          ? userEditForm.ng_list
          : String(userEditForm.ng_list || '')
              .split(',')
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0);

        if (ngList.length > 0) {
          // 一時的にRLSを無効化してテスト
          try {
            await supabase.rpc('disable_rls_for_table', { table_name: 'store_ng_pharmacies' });
            console.log('store_ng_pharmacies RLS無効化成功');
          } catch (rlsError) {
            console.log('store_ng_pharmacies RLS無効化スキップ:', rlsError);
          }

          const ngEntries = [];
          const seenEntries = new Set<string>();
          
          for (const ngId of ngList) {
            if (ngId.includes('_')) {
              // 店舗指定の場合 (pharmacyId_storeName)
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

          if (ngEntries.length > 0) {
            console.log('保存するNG薬局エントリ:', ngEntries);
            const { error: insertError } = await supabase
              .from('store_ng_pharmacies')
              .insert(ngEntries);

            if (insertError) {
              console.error('NG薬局設定の保存エラー:', insertError);
              alert(`NG薬局設定の保存に失敗しました: ${insertError.message}`);
              return;
            }
          }
        }
      } else if (profile.user_type === 'pharmacy') {
        // 薬局の場合、NG薬剤師設定をstore_ng_pharmacistsテーブルに保存
        // 既存のNG薬剤師設定を削除
        console.log('既存NG薬剤師設定を削除中...', profile.id);
        const { error: deleteError } = await supabase
          .from('store_ng_pharmacists')
          .delete()
          .eq('pharmacy_id', profile.id);

        if (deleteError) {
          console.error('既存NG薬剤師設定の削除エラー:', deleteError);
          alert(`既存NG薬剤師設定の削除に失敗しました: ${deleteError.message}`);
          return;
        }
        console.log('既存NG薬剤師設定の削除完了');

        // 新しいNG薬剤師設定を追加
        const ngList = Array.isArray(userEditForm.ng_list)
          ? userEditForm.ng_list
          : String(userEditForm.ng_list || '')
              .split(',')
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0);

        if (ngList.length > 0) {
          // まず認証状態を確認・リフレッシュ
          console.log('認証状態確認:', {
            currentUserId: user?.id,
            userType: user?.user_type,
            targetPharmacyId: profile.id
          });

          try {
            if (!supabase) {
              console.error('Supabase client is not available');
              return;
            }
            
            // まずセッションをリフレッシュしてから取得
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              console.error('セッションリフレッシュエラー:', refreshError);
            } else {
              console.log('セッションリフレッシュ成功');
            }

            // セッションを取得
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
              console.error('セッション取得エラー:', sessionError);
              alert('認証エラーが発生しました。ログインし直してください。');
              return;
            }

            if (!sessionData.session) {
              console.error('セッションが見つかりません');
              alert('セッションが切れています。ログインし直してください。');
              return;
            }

            console.log('セッション確認完了:', {
              hasSession: !!sessionData.session,
              userId: sessionData.session.user?.id,
              accessToken: sessionData.session.access_token?.substring(0, 20) + '...'
            });
          } catch (authError) {
            console.error('認証確認エラー:', authError);
            alert('認証エラーが発生しました。ログインし直してください。');
            return;
          }

          // 管理者権限を確認
          const { data: adminCheck, error: adminError } = await supabase
            .from('user_profiles')
            .select('user_type')
            .eq('id', user?.id)
            .single();

          console.log('管理者権限チェック結果:', {
            adminCheck,
            adminError,
            isAdmin: adminCheck?.user_type === 'admin'
          });

          // 削除処理は既に1062行目で実行済みなので、ここではスキップ

          // 一時的にRLSを無効化してテスト
          try {
            await supabase.rpc('disable_rls_for_table', { table_name: 'store_ng_pharmacists' });
            console.log('RLS無効化成功');
          } catch (rlsError) {
            console.log('RLS無効化スキップ:', rlsError);
          }

          // 新しいエントリを挿入
          const ngEntries = [];
          const seenEntries = new Set<string>();
          const storeNames = profile.store_names || ['本店'];
          
          for (const ngId of ngList) {
            if (ngId.includes('_')) {
              // 店舗指定の場合 (pharmacyId_storeName)
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

          if (ngEntries.length > 0) {
            console.log('保存するNG薬剤師エントリ:', ngEntries);
            console.log('管理者権限で挿入を試行:', {
              currentUserId: user?.id,
              userType: user?.user_type,
              entriesCount: ngEntries.length
            });

            const { error: insertError } = await supabase
              .from('store_ng_pharmacists')
              .insert(ngEntries);

            if (insertError) {
              console.error('NG薬剤師設定の保存エラー:', insertError);
              console.error('挿入エラーの詳細:', {
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint,
                code: insertError.code
              });
              
              // RLSエラーの場合は、user_profiles.ng_listのみ更新してフォールバック
              if (insertError.message.includes('row-level security')) {
                console.log('RLSエラーのため、user_profiles.ng_listのみ更新します');
                try {
                  await supabase
                    .from('user_profiles')
                    .update({ ng_list: ngList })
                    .eq('id', profile.id);
                  alert('NG薬剤師設定を保存しました（簡易モード）。');
                  setEditingUserId(null);
                  loadAll();
                  return;
                } catch (fallbackError) {
                  console.error('フォールバック更新エラー:', fallbackError);
                  alert(`NG薬剤師設定の保存に失敗しました: ${insertError.message}`);
                  return;
                }
              } else {
                alert(`NG薬剤師設定の保存に失敗しました: ${insertError.message}`);
                return;
              }
            }
          }

          // 互換: user_profiles.ng_list も反映（画面で外した内容を旧カラムにも保存）
          try {
            await supabase
              .from('user_profiles')
              .update({ ng_list: ngList })
              .eq('id', profile.id);
          } catch (e) {
            console.warn('Failed to update legacy ng_list on user_profiles for pharmacy', profile.id, e);
          }
        } else {
          // 全て外した場合は、store_ng_pharmacistsからも削除
          const { error: deleteError } = await supabase
            .from('store_ng_pharmacists')
            .delete()
            .eq('pharmacy_id', profile.id);

          if (deleteError) {
            console.error('NG薬剤師設定の削除エラー:', deleteError);
            console.error('削除エラーの詳細:', {
              message: deleteError.message,
              details: deleteError.details,
              hint: deleteError.hint,
              code: deleteError.code
            });
            
            // RLSエラーの場合は、user_profiles.ng_listのみ更新してフォールバック
            if (deleteError.message.includes('row-level security')) {
              console.log('RLSエラーのため、user_profiles.ng_listのみ更新します');
              try {
                await supabase
                  .from('user_profiles')
                  .update({ ng_list: [] })
                  .eq('id', profile.id);
                alert('NG薬剤師設定を削除しました（簡易モード）。');
                setEditingUserId(null);
                loadAll();
                return;
              } catch (fallbackError) {
                console.error('フォールバック更新エラー:', fallbackError);
                alert(`NG薬剤師設定の削除に失敗しました: ${deleteError.message}`);
                return;
              }
            } else {
              alert(`NG薬剤師設定の削除に失敗しました: ${deleteError.message}`);
              return;
            }
          }

          // 旧カラムも空配列に明示更新
          try {
            await supabase
              .from('user_profiles')
              .update({ ng_list: [] })
              .eq('id', profile.id);
          } catch (e) {
            console.warn('Failed to clear legacy ng_list on user_profiles for pharmacy', profile.id, e);
          }
        }
      } else {
        // その他の場合は従来通りng_listを保存
        updates.ng_list = Array.isArray(userEditForm.ng_list)
          ? userEditForm.ng_list
          : String(userEditForm.ng_list || '')
              .split(',')
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0);
      }

      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) {
        alert(`ユーザー更新に失敗しました: ${error.message || error.code || 'Unknown error'}`);
        return;
      }
      setEditingUserId(null);
      console.log('ユーザー情報を保存しました。データを再読み込み中...');
      await loadAll();
      console.log('データ再読み込み完了');
      alert('ユーザー情報を更新しました');
    } catch (e: any) {
      alert(`ユーザー更新エラー: ${e?.message || 'Unknown error'}`);
    }
  };

  const deleteUser = async (profile: any) => {
    if (!confirm(`${profile.name || profile.email} を削除しますか？`)) {
      return;
    }
    try {
      console.log('Starting user deletion for:', profile.id, profile.name || profile.email);
      
      // 1) 関連レコードを先に削除（外部参照の可能性に備える）
      // assigned_shifts
      console.log('Deleting assigned_shifts...');
      const assignedDelete = await supabase
        .from('assigned_shifts')
        .delete()
        .or(`pharmacist_id.eq.${profile.id},pharmacy_id.eq.${profile.id}`);
      if ((assignedDelete as any).error) {
        console.error('assigned_shifts delete error:', (assignedDelete as any).error);
        throw (assignedDelete as any).error;
      }
      // shift_requests（薬剤師）
      const reqDelete = await supabase
        .from('shift_requests')
        .delete()
        .eq('pharmacist_id', profile.id);
      if ((reqDelete as any).error) {
        console.error('shift_requests delete error:', (reqDelete as any).error);
        throw (reqDelete as any).error;
      }

      // shift_postings（薬局）
      const postDelete = await supabase
        .from('shift_postings')
        .delete()
        .eq('pharmacy_id', profile.id);
      if ((postDelete as any).error) {
        console.error('shift_postings delete error:', (postDelete as any).error);
        throw (postDelete as any).error;
      }

      // 2) プロファイルを削除
      const profileDelete = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', profile.id);
      if ((profileDelete as any).error) {
        console.error('user_profiles delete error:', (profileDelete as any).error);
        throw (profileDelete as any).error;
      }

      // 3) 画面更新
      await loadAll();
    } catch (e: any) {
      console.error('User deletion failed:', e);
      alert(`削除に失敗しました: ${e?.message || 'Unknown error'}`);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // 薬局と薬剤師のデータを整理する関数
  const getOrganizedUserData = () => {
    console.log('getOrganizedUserData called with userProfiles:', userProfiles);
    const pharmacies: any[] = [];
    const pharmacists: any[] = [];

    Object.values(userProfiles).forEach((profile: any) => {
      console.log('Processing profile:', profile.id, profile.name, profile.user_type, 'ng_list:', profile.ng_list);
      if (profile.user_type === 'pharmacy') {
        pharmacies.push(profile);
      } else if (profile.user_type === 'pharmacist') {
        pharmacists.push(profile);
      }
    });

    console.log('Organized data - pharmacies:', pharmacies.length, 'pharmacists:', pharmacists.length);
    return { pharmacies, pharmacists };
  };


  useEffect(() => {
    console.log('=== ADMIN DASHBOARD MOUNTED ===');
    console.log('User:', user);
    console.log('useEffectが実行されました - loadAllを開始します');
    
    // クリーンアップ実行フラグをリセット
    (window as any).cleanupExecuted = false;
    
    loadAll();
  }, [user]); // currentDateを依存配列から削除

  // 名称未設定のデータを自動クリーンアップする関数
  const cleanupUndefinedData = async () => {
    try {
      console.log('=== データクリーンアップ開始 ===');
      console.log('クリーンアップ関数が呼び出されました');
      
      // 1. 名称未設定の薬剤師・薬局を特定（複数の検索条件を試行）
      console.log('ユーザープロフィールの検索を開始します...');
      
      // 条件1: 基本的な未設定条件
      const { data: undefinedUsers1, error: undefinedUsersError1 } = await supabase
        .from('user_profiles')
        .select('id, name, email, user_type')
        .or('name.is.null,name.eq.,name.eq.undefined,email.is.null,email.eq.,email.eq.undefined');
      
      // 条件2: 未設定を含む条件
      const { data: undefinedUsers2, error: undefinedUsersError2 } = await supabase
        .from('user_profiles')
        .select('id, name, email, user_type')
        .or('name.like.%未設定%,name.like.%薬剤師未設定%,name.like.%薬局未設定%');
      
      // 条件3: 薬剤師を含む条件
      const { data: undefinedUsers3, error: undefinedUsersError3 } = await supabase
        .from('user_profiles')
        .select('id, name, email, user_type')
        .or('name.like.%薬剤師%');
      
      // 結果をマージ
      const allUndefinedUsers = [
        ...(undefinedUsers1 || []),
        ...(undefinedUsers2 || []),
        ...(undefinedUsers3 || [])
      ];
      
      // 重複を除去
      const uniqueUndefinedUsers = Array.isArray(allUndefinedUsers) ? allUndefinedUsers.filter((user, index, self) => 
        index === self.findIndex(u => u.id === user.id)
      ) : [];
      
      console.log('条件1の結果:', undefinedUsers1);
      console.log('条件2の結果:', undefinedUsers2);
      console.log('条件3の結果:', undefinedUsers3);
      console.log('マージ後の結果:', uniqueUndefinedUsers);
      
      const undefinedUsers = uniqueUndefinedUsers;
      const undefinedUsersError = undefinedUsersError1 || undefinedUsersError2 || undefinedUsersError3;
      
      console.log('ユーザープロフィール検索結果:', { undefinedUsers, undefinedUsersError });
      
      // デバッグ用：すべてのユーザープロフィールを取得
      const { data: allUsers } = await supabase
        .from('user_profiles')
        .select('id, name, email, user_type')
        .limit(50);
      
      console.log('すべてのユーザープロフィール（最初の50件）:', allUsers);
      
      // 特に「薬剤師未設定」を含むデータを詳しく調査
      const pharmacistUsers = Array.isArray(allUsers) ? allUsers.filter(user => 
        user.name && (
          user.name.includes('薬剤師') || 
          user.name.includes('未設定') ||
          user.name.includes('undefined') ||
          user.name === '' ||
          user.name === null
        )
      ) : [];
      
      console.log('薬剤師関連のユーザー:', pharmacistUsers);
      
      if (undefinedUsersError) {
        console.error('未設定ユーザーの取得エラー:', undefinedUsersError);
        return; // エラーでも処理を続行
      }
      
      console.log('名称未設定のユーザー:', undefinedUsers);
      
      // 2. 名称未設定のシフト募集を特定（より包括的な条件）
      const { data: undefinedPostings, error: undefinedPostingsError } = await supabase
        .from('shift_postings')
        .select('id, pharmacy_id, store_name, date, time_slot')
        .or('store_name.is.null,store_name.eq.,store_name.like.%未設定%,store_name.like.%薬局未設定%,store_name.like.%薬剤師未設定%,store_name.eq.undefined,store_name.like.%undefined%');
      
      if (undefinedPostingsError) {
        console.error('未設定募集の取得エラー:', undefinedPostingsError);
        return; // エラーでも処理を続行
      }
      
      console.log('名称未設定の募集:', undefinedPostings);
      
      // 3. 名称未設定のシフト希望も特定
      console.log('シフト希望の検索を開始します...');
      const { data: undefinedRequests, error: undefinedRequestsError } = await supabase
        .from('shift_requests')
        .select('id, pharmacist_id, date, time_slot')
        .in('pharmacist_id', undefinedUsers?.map(user => user.id) || []);
      
      if (undefinedRequestsError) {
        console.error('未設定希望の取得エラー:', undefinedRequestsError);
      } else {
        console.log('名称未設定の希望:', undefinedRequests);
      }
      
      // デバッグ用：すべてのシフト希望を取得
      const { data: allRequests } = await supabase
        .from('shift_requests')
        .select('id, pharmacist_id, date, time_slot')
        .limit(50);
      
      console.log('すべてのシフト希望（最初の50件）:', allRequests);
      
      // シフト希望とユーザープロフィールを結合して調査
      if (allRequests && allUsers) {
        const requestsWithUserInfo = allRequests.map(request => {
          const user = allUsers.find(u => u.id === request.pharmacist_id);
          return {
            ...request,
            user_name: user?.name || 'ユーザー未発見',
            user_email: user?.email || 'メール未発見',
            user_type: user?.user_type || 'タイプ未発見'
          };
        });
        
        console.log('シフト希望とユーザー情報の結合結果:', requestsWithUserInfo);
        
        // 「薬剤師未設定」に関連するシフト希望を特定
        const undefinedRequests = Array.isArray(requestsWithUserInfo) ? requestsWithUserInfo.filter(request => 
          request.user_name.includes('薬剤師未設定') ||
          request.user_name.includes('未設定') ||
          request.user_name === 'ユーザー未発見' ||
          request.user_name === '' ||
          request.user_name === null
        ) : [];
        
        console.log('未設定関連のシフト希望:', undefinedRequests);
      }
      
      // 4. 削除対象のIDを収集
      const userIdsToDelete = undefinedUsers?.map(user => user.id) || [];
      const postingIdsToDelete = undefinedPostings?.map(posting => posting.id) || [];
      const requestIdsToDelete = undefinedRequests?.map(request => request.id) || [];
      
      console.log('削除対象ユーザーID:', userIdsToDelete);
      console.log('削除対象募集ID:', postingIdsToDelete);
      console.log('削除対象希望ID:', requestIdsToDelete);
      
      // 削除対象がない場合は処理を終了
      if (userIdsToDelete.length === 0 && postingIdsToDelete.length === 0 && requestIdsToDelete.length === 0) {
        console.log('検索条件による削除対象のデータはありません');
        
        // 手動で「薬剤師未設定」を直接検索・削除
        console.log('手動で「薬剤師未設定」を検索します...');
        const { data: manualUndefinedUsers } = await supabase
          .from('user_profiles')
          .select('id, name, email, user_type')
          .eq('name', '薬剤師未設定');
        
        console.log('手動検索結果:', manualUndefinedUsers);
        
        if (manualUndefinedUsers && manualUndefinedUsers.length > 0) {
          console.log('手動検索で「薬剤師未設定」を発見しました。削除を実行します...');
          
          // 関連するシフト希望を削除
          for (const user of manualUndefinedUsers) {
            const { error: deleteRequestsError } = await supabase
              .from('shift_requests')
              .delete()
              .eq('pharmacist_id', user.id);
            
            if (deleteRequestsError) {
              console.error('シフト希望削除エラー:', deleteRequestsError);
            } else {
              console.log(`ユーザー ${user.id} のシフト希望を削除しました`);
            }
          }
          
          // ユーザーを削除
          const { error: deleteUsersError } = await supabase
            .from('user_profiles')
            .delete()
            .eq('name', '薬剤師未設定');
          
          if (deleteUsersError) {
            console.error('ユーザー削除エラー:', deleteUsersError);
          } else {
            console.log(`${manualUndefinedUsers.length}件の「薬剤師未設定」ユーザーを削除しました`);
            // 削除後にデータを再読み込み
            await loadAll();
          }
        } else {
          console.log('手動検索でも「薬剤師未設定」は見つかりませんでした');
        }
        
        return;
      }
      
      // 5. 関連データを削除（外部キー制約のため順序が重要）
      let deletedCount = 0;
      
      // シフト募集を削除
      if (postingIdsToDelete.length > 0) {
        const { error: deletePostingsError } = await supabase
          .from('shift_postings')
          .delete()
          .in('id', postingIdsToDelete);
        
        if (deletePostingsError) {
          console.error('募集削除エラー:', deletePostingsError);
        } else {
          deletedCount += postingIdsToDelete.length;
          console.log(`${postingIdsToDelete.length}件の募集を削除しました`);
        }
      }
      
      // シフト希望を削除（直接IDで削除）
      if (requestIdsToDelete.length > 0) {
        const { error: deleteRequestsError } = await supabase
          .from('shift_requests')
          .delete()
          .in('id', requestIdsToDelete);
        
        if (deleteRequestsError) {
          console.error('希望削除エラー:', deleteRequestsError);
        } else {
          deletedCount += requestIdsToDelete.length;
          console.log(`${requestIdsToDelete.length}件の希望を削除しました`);
        }
      }
      
      // 薬剤師IDでシフト希望を削除（追加の安全措置）
      if (userIdsToDelete.length > 0) {
        const { error: deleteRequestsByUserError } = await supabase
          .from('shift_requests')
          .delete()
          .in('pharmacist_id', userIdsToDelete);
        
        if (deleteRequestsByUserError) {
          console.error('薬剤師IDによる希望削除エラー:', deleteRequestsByUserError);
        } else {
          console.log('薬剤師IDによる関連シフト希望を削除しました');
        }
      }
      
      // 確定シフトを削除
      if (userIdsToDelete.length > 0) {
        const { error: deleteAssignedError } = await supabase
          .from('assigned_shifts')
          .delete()
          .or(`pharmacist_id.in.(${userIdsToDelete.join(',')}),pharmacy_id.in.(${userIdsToDelete.join(',')})`);
        
        if (deleteAssignedError) {
          console.error('確定シフト削除エラー:', deleteAssignedError);
        } else {
          console.log('関連する確定シフトを削除しました');
        }
      }
      
      // ユーザープロフィールを削除
      if (userIdsToDelete.length > 0) {
        const { error: deleteUsersError } = await supabase
          .from('user_profiles')
          .delete()
          .in('id', userIdsToDelete);
        
        if (deleteUsersError) {
          console.error('ユーザー削除エラー:', deleteUsersError);
        } else {
          deletedCount += userIdsToDelete.length;
          console.log(`${userIdsToDelete.length}件のユーザーを削除しました`);
        }
      }
      
      console.log(`=== クリーンアップ完了: 合計${deletedCount}件削除 ===`);
      
      // 削除後にデータを再読み込み
      if (deletedCount > 0) {
        console.log('データ削除後、再読み込みを実行します...');
        await loadAll();
        console.log('再読み込みが完了しました');
      }
      
    } catch (error) {
      console.error('クリーンアップエラー:', error);
    }
  };

  // 募集状況を読み込む関数
  const loadRecruitmentStatus = async () => {
    try {
      // 固定レコードIDを直接参照（存在しない場合の誤検知を避ける）
      const FIXED_ID = '00000000-0000-0000-0000-000000000001';
      const { data, error } = await supabase
        .from('recruitment_status')
        .select('*')
        .eq('id', FIXED_ID)
        .single();
      
      if (error) {
        console.error('募集状況読み込みエラー:', error);
        return;
      }
      
      if (data) {
        setRecruitmentStatus({
          is_open: data.is_open,
          updated_at: data.updated_at,
          updated_by: data.updated_by,
          notes: data.notes
        });
      }
    } catch (error) {
      console.error('募集状況読み込みエラー:', error);
    }
  };

  // 募集締切/再開を切り替える関数
  const toggleRecruitmentStatus = async () => {
    try {
      // 権限チェック（管理者のみ）
      const { data: authInfo } = await supabase.auth.getUser();
      const currentUserId = authInfo?.user?.id || user?.id;
      if (!currentUserId) {
        alert('ログイン情報を取得できません。再ログインしてください。');
        return;
      }
      const { data: me, error: meErr } = await supabase
        .from('user_profiles')
        .select('id,user_type,email')
        .eq('id', currentUserId)
        .maybeSingle();
      if (meErr) {
        console.error('管理者確認エラー:', meErr);
      }
      if (!me || me.user_type !== 'admin') {
        alert('この操作には管理者権限が必要です。管理者でログインしてください。');
        return;
      }

      // 固定IDへupsert（存在しなければ作成、あれば更新）
      const FIXED_ID = '00000000-0000-0000-0000-000000000001';

      const newStatus = !recruitmentStatus.is_open;
      const action = newStatus ? '再開' : '締切';
      
      // まず UPDATE を試みる（既存レコードがある前提）
      const debugInfo = {
        FIXED_ID,
        newStatus,
        action,
        currentUser: currentUserId,
        timestamp: new Date().toISOString()
      };
      
      console.log('=== 募集状況更新デバッグ ===');
      console.log('FIXED_ID:', FIXED_ID);
      console.log('newStatus:', newStatus);
      console.log('action:', action);
      console.log('current user:', currentUserId);
      
      const { data: updatedRow, error } = await supabase
        .from('recruitment_status')
        .update({
          is_open: newStatus,
          // updated_by はRLS/外部キーの影響を避けるため一旦書かない
          notes: `募集を${action}しました (${new Date().toLocaleString('ja-JP')})`
        })
        .eq('id', FIXED_ID)
        .select('id,is_open,updated_at,notes');
      
      const resultInfo = {
        updatedRow,
        error: error ? {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        } : null
      };
      
      console.log('UPDATE結果:');
      console.log('updatedRow:', updatedRow);
      console.log('error:', error);
      
      if (error) {
        console.error('募集状況更新エラー:', error);
        const message = typeof error === 'object' && error !== null ? (error as any).message || (error as any).hint || JSON.stringify(error) : String(error);
        
        // デバッグ情報をモーダルで表示
        const debugModal = `
=== 募集状況更新デバッグ情報 ===

【リクエスト情報】
- FIXED_ID: ${FIXED_ID}
- newStatus: ${newStatus}
- action: ${action}
- current user: ${currentUserId}
- timestamp: ${new Date().toLocaleString('ja-JP')}

【エラー詳細】
- message: ${error.message}
- code: ${error.code}
- details: ${error.details || 'なし'}
- hint: ${error.hint || 'なし'}

【レスポンス】
- updatedRow: ${JSON.stringify(updatedRow, null, 2)}
        `;
        
        alert(`募集状況の更新に失敗しました:\n\n${message}\n\n${debugModal}`);
        return;
      }

      if (!updatedRow) {
        console.log('updatedRow が null - レコードが見つからないか更新されなかった');
        
        // デバッグ情報をモーダルで表示
        const debugModal = `
=== 募集状況更新デバッグ情報 ===

【リクエスト情報】
- FIXED_ID: ${FIXED_ID}
- newStatus: ${newStatus}
- action: ${action}
- current user: ${currentUserId}
- timestamp: ${new Date().toLocaleString('ja-JP')}

【問題】
- updatedRow が null - レコードが見つからないか更新されなかった
- レコードが存在しない可能性があります

【レスポンス】
- updatedRow: ${JSON.stringify(updatedRow, null, 2)}
- error: ${JSON.stringify(resultInfo.error, null, 2)}
        `;
        
        alert(`募集状況の更新結果が取得できませんでした。\n\n${debugModal}`);
        return;
      }
      
      // ローカル状態を更新
      setRecruitmentStatus(prev => ({
        ...prev,
        is_open: newStatus,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        notes: `募集を${action}しました (${new Date().toLocaleString('ja-JP')})`
      }));
      
      alert(`募集を${action}しました`);
      
      // 募集状況を再読み込み
      await loadRecruitmentStatus();
    } catch (error) {
      console.error('募集状況切り替えエラー:', error);
      alert(`募集状況の切り替えに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const loadAll = async () => {
    try {
      console.log('🚀🚀🚀 ADMIN DASHBOARD loadAll STARTED 🚀🚀🚀');
      console.log('=== loadAll started - データ読み込み開始 ===');
      console.log('現在の日時:', new Date().toISOString());
      console.log('loadAll関数が実行されました - コンソールを確認してください');
      // Railwayログに出力
      const logToRailway = (message: string, data?: any) => {
        console.log(`[RAILWAY_LOG] ${message}`, data ? JSON.stringify(data) : '');
        // サーバーサイドのログとして出力
        if (typeof window !== 'undefined') {
          // ブラウザ環境ではfetchでログを送信
          fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, data, timestamp: new Date().toISOString() })
          }).catch(() => {}); // エラーは無視
        }
      };

      logToRailway('=== LOADALL START ===');
      logToRailway('Loading all data...');
      
      // 募集状況を読み込み
      await loadRecruitmentStatus();
      
      // 直接Supabaseからassigned_shiftsを取得
      logToRailway('Attempting to load all assigned shifts...');
      const { data: assignedData, error: assignedError } = await supabase
        .from('assigned_shifts')
        .select('*');
      
      if (assignedError) {
        logToRailway('Error loading assigned shifts:', {
          error: assignedError,
          code: assignedError.code,
          message: assignedError.message,
          details: assignedError.details,
          hint: assignedError.hint
        });
        setAssigned([]);
      } else {
        logToRailway('Loaded assigned shifts:', assignedData);
        setAssigned(assignedData || []);
      }
      
      const { data: r } = await shiftRequests.getRequests('', 'admin' as any);
      setRequests(r || []);
      
      console.log('=== シフト希望データ読み込み完了 ===');
      console.log('読み込まれたシフト希望数:', (r || []).length);
      console.log('シフト希望データ詳細:', r);
      
      // 時間範囲がある希望の詳細確認
      const requestsWithTime = (r || []).filter(req => req.start_time && req.end_time);
      console.log('時間範囲がある希望数:', requestsWithTime.length);
      console.log('時間範囲がある希望詳細:', requestsWithTime.map(req => ({
        id: req.id,
        pharmacist_id: req.pharmacist_id,
        date: req.date,
        time_slot: req.time_slot,
        start_time: req.start_time,
        end_time: req.end_time
      })));
      
      // 月別データの確認
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const monthlyRequests = Array.isArray(r) ? r.filter((req: any) => {
        const requestDate = new Date(req.date);
        return requestDate.getMonth() === currentMonth && requestDate.getFullYear() === currentYear;
      }) : [];
      console.log(`今月(${currentYear}年${currentMonth + 1}月)の希望シフト数:`, monthlyRequests.length);
      console.log('今月の希望シフト詳細:', monthlyRequests);
      console.log('シフト希望の薬剤師ID一覧:', (r || []).map(req => req.pharmacist_id));
      console.log('シフト希望詳細:', r);
      
      const { data: p } = await shiftPostings.getPostings('', 'admin' as any);
      setPostings(p || []);
      
      console.log('=== シフト募集データ読み込み完了 ===');
      console.log('読み込まれたシフト募集数:', (p || []).length);
      console.log('シフト募集データ詳細:', p);
      
      // 時間範囲がある募集の詳細確認
      const postingsWithTime = (p || []).filter(post => post.start_time && post.end_time);
      console.log('時間範囲がある募集数:', postingsWithTime.length);
      console.log('時間範囲がある募集詳細:', postingsWithTime.map(post => ({
        id: post.id,
        pharmacy_id: post.pharmacy_id,
        date: post.date,
        time_slot: post.time_slot,
        start_time: post.start_time,
        end_time: post.end_time,
        required_staff: post.required_staff
      })));
      
      // 月別募集データの確認
      const monthlyPostings = Array.isArray(p) ? p.filter((post: any) => {
        const postingDate = new Date(post.date);
        return postingDate.getMonth() === currentMonth && postingDate.getFullYear() === currentYear;
      }) : [];
      console.log(`今月(${currentYear}年${currentMonth + 1}月)の募集シフト数:`, monthlyPostings.length);
      console.log('今月の募集シフト詳細:', monthlyPostings);
      console.log('シフト募集の薬局ID一覧:', (p || []).map(post => post.pharmacy_id));
      
      console.log('=== 全データ読み込み完了 ===');
      console.log('ユーザープロフィール数:', Object.keys(userProfiles).length);
      console.log('シフト募集数:', (p || []).length);
      console.log('シフト希望数:', (r || []).length);
      console.log('確定シフト数:', (assignedData || []).length);
      
      // マッチング機能で使用されるテーブルの存在確認
      logToRailway('=== マッチング機能テーブル確認 ===');
      try {
        const { error: storeOpeningsError } = await supabase
          .from('store_openings')
          .select('count')
          .limit(1);
        logToRailway('store_openings table check:', { exists: !storeOpeningsError, error: storeOpeningsError });
      } catch (error) {
        logToRailway('store_openings table check failed:', error);
      }
      
      try {
        const { error: availabilitiesError } = await supabase
          .from('availabilities')
          .select('count')
          .limit(1);
        logToRailway('availabilities table check:', { exists: !availabilitiesError, error: availabilitiesError });
      } catch (error) {
        logToRailway('availabilities table check failed:', error);
      }
      
      try {
        const { error: matchesError } = await supabase
          .from('matches')
          .select('count')
          .limit(1);
        logToRailway('matches table check:', { exists: !matchesError, error: matchesError });
      } catch (error) {
        logToRailway('matches table check failed:', error);
      }
      
      logToRailway('=== マッチング機能テーブル確認終了 ===');
      
      // ユーザープロフィールを取得（管理者用）
      logToRailway('Fetching user profiles...');
      
      // まず、シフトに含まれるユーザーIDを収集
      const userIds = new Set<string>();
      if (assignedData) {
        assignedData.forEach((shift: any) => {
          userIds.add(shift.pharmacist_id);
          userIds.add(shift.pharmacy_id);
        });
      }
      
      logToRailway('User IDs from shifts:', Array.from(userIds));
      
                   // 直接Supabaseからプロフィールを取得（管理者用）
             logToRailway('Fetching user profiles directly...');
             
             // まず、全プロフィールを取得してみる
             const { data: allProfilesData, error: allProfilesError } = await supabase
               .from('user_profiles')
               .select('*');
             
             // user_profilesが存在しない場合はapp_usersを試す
             if (allProfilesError && allProfilesError.message.includes('does not exist')) {
               logToRailway('user_profiles table not found, trying app_users...');
               const { data: appUsersData } = await supabase
                 .from('app_users')
                 .select('*');
               
               if (!appUsersData) {
                 logToRailway('Error loading app_users: No data');
                 // 他のテーブル名も試す
                 logToRailway('Trying other possible table names...');
                 
                 // v_user_profilesを試す
                 const { data: vUserProfilesData, error: vUserProfilesError } = await supabase
                   .from('v_user_profiles')
                   .select('*');
                 
                 if (vUserProfilesError) {
                   logToRailway('Error loading v_user_profiles:', vUserProfilesError);
                   setUserProfiles({});
                 } else {
                   logToRailway('Loaded v_user_profiles:', vUserProfilesData);
                   
                   // user_profilesテーブルから詳細情報を取得
                   const { data: userProfilesData, error: userProfilesError } = await supabase
                     .from('user_profiles')
                     .select('*');
                   
                   if (userProfilesError) {
                     logToRailway('Error loading user_profiles:', userProfilesError);
                   } else {
                     console.log('user_profilesデータ取得成功:', userProfilesData);
                     console.log('user_profilesデータ件数:', userProfilesData?.length);
                     // 特定のIDのデータを確認
                     const targetId = '89077960-0074-4b50-8d47-1f08b222db1b';
                     const targetProfile = userProfilesData?.find(p => p.id === targetId);
                     console.log('対象IDのプロファイル:', targetProfile);
                   }
                   
                   const profilesMap: any = {};
                   
                   // まず、user_profilesの全データをマップに追加
                   userProfilesData?.forEach((profile: any) => {
                     profilesMap[profile.id] = {
                       id: profile.id,
                       name: profile.name,
                       email: profile.email,
                       ng_list: profile.ng_list || [],
                       store_names: profile.store_names || [],
                       address: profile.address,
                       phone: profile.phone
                     };
                   });
                   
                   // 次に、v_user_profilesのデータでuser_typeを設定
                   vUserProfilesData?.forEach((user: any) => {
                     // user_typeが設定されている場合はそれを使用、ない場合はemailから推測
                     let userType = user.user_type;
                     if (!userType) {
                       // emailに'store'や'pharmacy'が含まれている場合は薬局として判定
                       const email = user.email?.toLowerCase() || '';
                       const name = user.name?.toLowerCase() || '';
                       userType = email.includes('store') || email.includes('pharmacy') || email.includes('sampley2') || 
                                 name.includes('store') || name.includes('pharmacy') || name.includes('sampley2') ? 'pharmacy' : 'pharmacist';
                     }
                     
                     // 既存のプロファイルにuser_typeを追加
                     if (profilesMap[user.id]) {
                       profilesMap[user.id].user_type = userType;
                     } else {
                       // v_user_profilesにのみ存在する場合は新規追加
                       profilesMap[user.id] = {
                         id: user.id,
                         name: user.name,
                         email: user.email,
                         user_type: userType,
                         ng_list: [],
                         store_names: []
                       };
                     }
                   });
                   
                   console.log('最終的なprofilesMap:', profilesMap);
                   console.log('対象IDの最終データ:', profilesMap['89077960-0074-4b50-8d47-1f08b222db1b']);
                   
                   setUserProfiles(profilesMap);
                   return;
                 }
               } else {
                 logToRailway('Loaded app_users:', appUsersData);
                 // app_usersのデータをuser_profiles形式に変換
                 const profilesMap: any = {};
                 appUsersData?.forEach((user: any) => {
                   // user_typeが設定されている場合はそれを使用、ない場合はemailから推測
                   let userType = user.user_type;
                   if (!userType) {
                     // emailに'store'や'pharmacy'が含まれている場合は薬局として判定
                     const email = user.email?.toLowerCase() || '';
                     const name = user.name?.toLowerCase() || '';
                     userType = email.includes('store') || email.includes('pharmacy') || email.includes('sampley2') || 
                               name.includes('store') || name.includes('pharmacy') || name.includes('sampley2') ? 'pharmacy' : 'pharmacist';
                   }
                   
                   // デバッグログ
                   console.log(`User ${user.email} (${user.name}) classified as: ${userType}`);
                   
                   profilesMap[user.id] = {
                     id: user.id,
                     name: user.name,
                     email: user.email,
                     user_type: userType
                   };
                 });
                 setUserProfiles(profilesMap);
                 return;
               }
             }
      
      if (allProfilesError) {
        logToRailway('Error loading all user profiles:', allProfilesError);
        console.error('プロフィール取得エラー:', allProfilesError.message);
      } else {
        logToRailway('Loaded all user profiles:', allProfilesData);
        
        if (allProfilesData && allProfilesData.length > 0) {
          const profilesMap: any = {};
          allProfilesData.forEach((profile: any) => {
            // user_typeが設定されている場合はそれを使用、ない場合はemailから推測
            let userType = profile.user_type;
            if (!userType) {
              // emailに'store'や'pharmacy'が含まれている場合は薬局として判定
              const email = profile.email?.toLowerCase() || '';
              const name = profile.name?.toLowerCase() || '';
              userType = email.includes('store') || email.includes('pharmacy') || email.includes('sampley2') || 
                        name.includes('store') || name.includes('pharmacy') || name.includes('sampley2') ? 'pharmacy' : 'pharmacist';
            }
            
            // デバッグログ
            console.log(`User ${profile.email} (${profile.name}) classified as: ${userType}`);
            
            profilesMap[profile.id] = {
              ...profile,
              user_type: userType
            };
          });
          logToRailway('User profiles map:', profilesMap);
          console.log('=== userProfiles更新前のデバッグ ===');
          console.log('更新前のuserProfiles:', userProfiles);
          console.log('新しいprofilesMap:', profilesMap);
          setUserProfiles(profilesMap);
          console.log('=== userProfiles更新完了 ===');
          
          console.log('=== ユーザープロフィール読み込み完了 ===');
          console.log('読み込まれたユーザー数:', Object.keys(profilesMap).length);
          console.log('ユーザーID一覧:', Object.keys(profilesMap));
          console.log('ユーザープロフィール詳細:', profilesMap);

          // 評価データを取得
          logToRailway('Fetching pharmacist ratings...');
          const { data: ratingsData } = await pharmacistRatings.getRatings();
          if (ratingsData) {
            setRatings(ratingsData);
            logToRailway('Loaded pharmacist ratings:', ratingsData.length);
          }
          
          console.log('=== 薬剤師評価データ読み込み完了 ===');
          console.log('読み込まれた評価データ数:', (ratingsData || []).length);
          console.log('評価データ詳細:', ratingsData);
          
          // 店舗毎のNG薬剤師データを取得
          logToRailway('Fetching store-specific NG pharmacists...');
          const storeNgDataMap: {[pharmacyId: string]: any[]} = {};
          
          // 薬局ユーザーのみを対象に店舗毎NG薬剤師を取得
          const pharmacyUsers = Object.values(profilesMap || {}).filter((profile: any) => profile.user_type === 'pharmacy');
          for (const pharmacy of pharmacyUsers) {
            try {
              const { data: storeNgData, error: storeNgError } = await supabase
                .from('store_ng_pharmacists')
                .select('*')
                .eq('pharmacy_id', (pharmacy as any).id);
              
              if (!storeNgError && storeNgData) {
                storeNgDataMap[(pharmacy as any).id] = storeNgData;
              }
              // user_profiles.ng_list も反映（旧仕様互換）
              const rawNg = (pharmacy as any).ng_list;
              if (rawNg) {
                try {
                  const parsed: string[] = Array.isArray(rawNg) ? rawNg : JSON.parse(rawNg);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    const legacyEntries = parsed.map(pid => ({
                      pharmacy_id: (pharmacy as any).id,
                      pharmacist_id: pid,
                      store_name: null,
                      _source: 'user_profiles.ng_list'
                    }));
                    storeNgDataMap[(pharmacy as any).id] = [
                      ...(storeNgDataMap[(pharmacy as any).id] || []),
                      ...legacyEntries
                    ];
                  }
                } catch (e) {
                  console.warn('Failed to parse user_profiles.ng_list for pharmacy', (pharmacy as any).id, e);
                }
              }
            } catch (error) {
              logToRailway(`Error fetching store NG pharmacists for ${(pharmacy as any).id}:`, error);
            }
          }
          
          setStoreNgPharmacists(storeNgDataMap);
          logToRailway('Store NG pharmacists data:', storeNgDataMap);

          // 自動検証: DBの全件と画面用マップ件数の差異をチェック
          try {
            const { data: allStoreNgRows, error: loadAllStoreNgErr } = await supabase
              .from('store_ng_pharmacists')
              .select('*');
            if (!loadAllStoreNgErr && Array.isArray(allStoreNgRows)) {
              const dbCountByPharmacy: {[id: string]: number} = {};
              for (const row of allStoreNgRows) {
                const pid = (row as any).pharmacy_id;
                dbCountByPharmacy[pid] = (dbCountByPharmacy[pid] || 0) + 1;
              }

              const uiCountByPharmacy: {[id: string]: number} = {};
              Object.keys(storeNgDataMap).forEach(pid => {
                uiCountByPharmacy[pid] = (storeNgDataMap[pid] || []).length;
              });

              const mismatches: Array<{pharmacy_id: string; db: number; ui: number}> = [];
              const allPharmacyIds = new Set<string>([
                ...Object.keys(dbCountByPharmacy),
                ...Object.keys(uiCountByPharmacy)
              ]);
              allPharmacyIds.forEach(pid => {
                const db = dbCountByPharmacy[pid] || 0;
                const ui = uiCountByPharmacy[pid] || 0;
                if (db !== ui) mismatches.push({ pharmacy_id: pid, db, ui });
              });

              if (mismatches.length > 0) {
                console.warn('[NG Auto-Verify] store_ng_pharmacists mismatch detected', mismatches);
                logToRailway('[NG Auto-Verify] mismatch', mismatches);
              } else {
                console.log('[NG Auto-Verify] store_ng_pharmacists counts match UI');
              }
              // windowへ配置してユーザーが即参照できるようにする
              (window as any).storeNgPharmacistsMap = storeNgDataMap;
              (window as any).storeNgPharmacistsDbCounts = dbCountByPharmacy;
            }
          } catch (verifyErr) {
            console.warn('Failed to auto-verify NG pharmacists:', verifyErr);
          }
          
          // 薬剤師のNG薬局情報を読み込み
          logToRailway('Loading pharmacist NG pharmacies...');
          const pharmacistNgPharmaciesMap: {[pharmacistId: string]: any[]} = {};
          
          // 薬剤師ユーザーのみを対象にNG薬局情報を取得
          const pharmacistUsers = Object.values(profilesMap || {}).filter((profile: any) => profile.user_type === 'pharmacist');
          console.log('薬剤師ユーザー数:', pharmacistUsers.length);
          
          for (const pharmacist of pharmacistUsers) {
            try {
              console.log(`薬剤師 ${(pharmacist as any).id} のNG薬局情報を取得中...`);
              const { data: ngPharmaciesData, error: ngPharmaciesError } = await supabase
                .from('store_ng_pharmacies')
                .select('*')
                .eq('pharmacist_id', (pharmacist as any).id);
              
              console.log(`薬剤師 ${(pharmacist as any).id} のNG薬局データ:`, {
                data: ngPharmaciesData,
                error: ngPharmaciesError,
                count: ngPharmaciesData?.length || 0
              });
              
              if (!ngPharmaciesError && ngPharmaciesData) {
                pharmacistNgPharmaciesMap[(pharmacist as any).id] = ngPharmaciesData;
              }
            } catch (error) {
              console.error(`Error fetching NG pharmacies for pharmacist ${(pharmacist as any).id}:`, error);
              logToRailway(`Error fetching NG pharmacies for pharmacist ${(pharmacist as any).id}:`, error);
            }
          }
          
          setStoreNgPharmacies(pharmacistNgPharmaciesMap);
          logToRailway('Pharmacist NG pharmacies data:', pharmacistNgPharmaciesMap);
          
          // 詳細なデバッグログ
          console.log('=== 薬剤師NG薬局・店舗データ読み込み完了 ===');
          console.log('storeNgPharmacies:', pharmacistNgPharmaciesMap);
          Object.keys(pharmacistNgPharmaciesMap).forEach(pharmacistId => {
            const ngData = pharmacistNgPharmaciesMap[pharmacistId];
            console.log(`薬剤師ID ${pharmacistId}:`, ngData);
          });
          
          // シフトに含まれるユーザーIDをチェック
          const shiftUserIds = Array.from(userIds);
          logToRailway('Shift user IDs:', shiftUserIds);
          
          const foundProfiles = Array.isArray(shiftUserIds) ? shiftUserIds.filter(id => profilesMap[id]) : [];
          logToRailway('Found profiles for shift users:', foundProfiles);
          
          // 詳細なマッチング情報をログ出力
          shiftUserIds.forEach(id => {
            const profile = profilesMap[id];
            logToRailway(`Profile lookup for ID ${id}:`, profile ? 'FOUND' : 'NOT FOUND');
            if (profile) {
              logToRailway(`Profile details for ${id}:`, { name: profile.name, email: profile.email, user_type: profile.user_type });
            }
          });
          
          // 全プロフィールのID一覧をログ出力
          const allProfileIds = Object.keys(profilesMap);
          logToRailway('All profile IDs:', allProfileIds);
          
          // プロフィールマッチング状況をログ出力（アラートは削除）
          if (foundProfiles.length > 0) {
            const foundProfileDetails = foundProfiles.map(id => {
              const profile = profilesMap[id];
              return `${profile.name || profile.email} (${profile.user_type})`;
            });
            logToRailway('Profile matching success:', foundProfileDetails);
          } else {
            logToRailway('No profiles found for shift users');
          }
        } else {
          logToRailway('No profiles data available');
          console.warn('プロフィールが取得できませんでした');
        }
      }
    } catch (e) {
      console.error('Error in loadAll:', e);
    } finally {
      setLoading(false);
      console.log('=== LOADALL END ===');
      
      // データ読み込み完了後に自動クリーンアップを実行（初回のみ）
      if (!(window as any).cleanupExecuted) {
        console.log('loadAll完了後、初回クリーンアップを開始します');
        (window as any).cleanupExecuted = true;
        await cleanupUndefinedData();
        console.log('初回クリーンアップ処理が完了しました');
      } else {
        console.log('クリーンアップは既に実行済みです');
      }
      
      // DISABLED: データ読み込み完了後の自動マッチング実行を無効化
      // ユーザーが手動で「① 1ヶ月分マッチングを実行」ボタンを押した時のみ実行
      /*
      if (aiMatchingEngine && requests.length > 0 && postings.length > 0) {
        console.log('Auto-executing monthly AI matching...');
        setTimeout(async () => {
          try {
            await executeMonthlyAIMatching();
            console.log('Auto monthly AI matching completed');
          } catch (error) {
            console.error('Auto monthly AI matching failed:', error);
          }
        }, 1000); // 1秒後に実行
      }
      */
      
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



  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDateSelect = (day: number) => {
    if (day) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      setSelectedDate(formattedDate);
    }
  };

  // 個別マッチ確定
  const handleConfirmSingleMatch = async (match: any, date: string) => {
    try {
      console.log('handleConfirmSingleMatch called:', { match, date });
      
      if (!supabase) {
        console.error('Supabase client is not available');
        return;
      }
      
      // 単一マッチを確定シフトに変換
      const pharmacyName = userProfiles[match.pharmacy.id]?.name || 'Unknown';
      const storeName = match.pharmacy.name && match.pharmacy.name !== pharmacyName ? match.pharmacy.name : pharmacyName;
      
      const shift = {
        pharmacist_id: match.pharmacist.id,
        pharmacy_id: match.pharmacy.id,
        date: date,
        time_slot: 'negotiable',
        start_time: match.timeSlot.start,
        end_time: match.timeSlot.end,
        status: 'confirmed',
        store_name: storeName,
        memo: `AIマッチング: ${match.compatibilityScore.toFixed(2)} score - ${match.reasons.join(', ')}`
      };
      
      const { error } = await supabase.from('assigned_shifts').insert([shift]);
      if (error) throw error;
      
      // 対応する希望・募集のステータスを'confirmed'に更新
      try {
        // マッチングデータから正確なtime_slotを取得
        const requestTimeSlot = match.request?.time_slot || 'negotiable';
        const postingTimeSlot = match.posting?.time_slot || 'negotiable';
        
        console.log('ステータス更新用のtime_slot:', {
          requestTimeSlot,
          postingTimeSlot,
          matchRequest: match.request,
          matchPosting: match.posting
        });
        
        // 薬剤師の希望を更新
        const { error: requestError } = await supabase
          .from('shift_requests')
          .update({ status: 'confirmed' })
          .eq('pharmacist_id', match.pharmacist.id)
          .eq('date', date)
          .eq('time_slot', requestTimeSlot);
        
        if (requestError) {
          console.warn('希望ステータス更新エラー:', requestError);
        } else {
          console.log('希望ステータス更新成功:', {
            pharmacist_id: match.pharmacist.id,
            date,
            time_slot: requestTimeSlot
          });
          
          // 更新後のデータを確認
          const { data: updatedRequest } = await supabase
            .from('shift_requests')
            .select('*')
            .eq('pharmacist_id', match.pharmacist.id)
            .eq('date', date)
            .eq('time_slot', requestTimeSlot)
            .single();
          console.log('更新後の希望データ:', updatedRequest);
        }
        
        // 薬局の募集を更新（同日・同薬局の募集を一括で confirmed にする）
        console.log('=== 薬局募集ステータス更新開始 ===', {
          pharmacy_id: match.pharmacy.id,
          date,
          postingTimeSlot
        });
        
        const { data: updateResult, error: postingError } = await supabase
          .from('shift_postings')
          .update({ status: 'confirmed' })
          .eq('pharmacy_id', match.pharmacy.id)
          .eq('date', date)
          .select();
        
        if (postingError) {
          console.error('募集ステータス更新エラー:', postingError);
        } else {
          console.log('募集ステータス更新成功（同日・同薬局を一括更新）:', {
            pharmacy_id: match.pharmacy.id,
            date,
            updated_count: updateResult?.length || 0,
            updated_records: updateResult
          });
          
          // 更新後のデータを確認（全ての募集を取得）
          const { data: allUpdatedPostings, error: fetchError } = await supabase
            .from('shift_postings')
            .select('*')
            .eq('pharmacy_id', match.pharmacy.id)
            .eq('date', date);
          console.log('更新後の全募集データ:', allUpdatedPostings);
        }
      } catch (statusError) {
        console.warn('ステータス更新中のエラー:', statusError);
      }
      
      console.log('個別マッチ確定完了:', shift);
      
      // データを再読み込み
      await loadAssignedShifts();
      await loadAll(); // 希望・募集データも再読み込み
      
      alert(`シフトを確定しました。\n${userProfiles[match.pharmacist.id]?.name} → ${pharmacyName}`);
    } catch (error) {
      console.error('個別マッチ確定エラー:', error);
      alert(`シフト確定に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // 確定済みステータスの希望・募集を除外するフィルタリング関数
  const filterConfirmedRequestsAndPostings = (requests: any[], postings: any[]) => {
    // ステータスが'confirmed'以外の希望・募集のみを表示
    const filteredRequests = requests.filter((request: any) => {
      return request.status !== 'confirmed';
    });
    
    const filteredPostings = postings.filter((posting: any) => {
      return posting.status !== 'confirmed';
    });
    
    console.log(`=== 管理画面フィルタリング詳細 ===`);
    console.log(`フィルタ前: 希望${requests.length}件, 募集${postings.length}件`);
    console.log(`フィルタ後: 希望${filteredRequests.length}件, 募集${filteredPostings.length}件`);
    console.log('除外された確定済み希望:', requests.filter(r => r.status === 'confirmed').length);
    console.log('除外された確定済み募集:', postings.filter(p => p.status === 'confirmed').length);
    
    // 詳細なステータス分析
    console.log('=== 募集ステータス詳細分析 ===');
    postings.forEach((posting: any, index: number) => {
      console.log(`募集${index + 1}:`, {
        id: posting.id,
        pharmacy_id: posting.pharmacy_id,
        date: posting.date,
        time_slot: posting.time_slot,
        store_name: posting.store_name,
        status: posting.status,
        status_type: typeof posting.status,
        is_confirmed: posting.status === 'confirmed'
      });
    });
    
    console.log('=== 希望ステータス詳細分析 ===');
    requests.forEach((request: any, index: number) => {
      console.log(`希望${index + 1}:`, {
        id: request.id,
        pharmacist_id: request.pharmacist_id,
        date: request.date,
        time_slot: request.time_slot,
        status: request.status,
        status_type: typeof request.status,
        is_confirmed: request.status === 'confirmed'
      });
    });
    
    return { filteredRequests, filteredPostings };
  };

  // 確定シフトのみを再読み込みする関数
  const loadAssignedShifts = async () => {
    try {
      const { data: assignedData, error: assignedError } = await shifts.getShifts('', 'admin' as any);
      
      if (assignedError) {
        console.error('Error loading assigned shifts:', assignedError);
        setAssigned([]);
      } else {
        setAssigned(assignedData || []);
      }
    } catch (error) {
      console.error('Error in loadAssignedShifts:', error);
      setAssigned([]);
    }
  };

  const handleConfirmShiftsForDate = async (date: string, predefinedShifts?: any[]) => {
    try {
      console.log('handleConfirmShiftsForDate called for date:', date);
      console.log('Current requests:', requests);
      console.log('Current postings:', postings);
      
      if (!supabase) {
        console.error('Supabase client is not available');
        return;
      }
      
      // 現在のユーザーIDを確認
      const { data: { user: authUser } } = await supabase.auth.getUser();
      console.log('Admin auth user:', authUser);
      console.log('Admin user prop:', user);
      
      // 事前定義されたシフトがある場合はそれを使用、そうでなければ通常のマッチング処理
      if (predefinedShifts && predefinedShifts.length > 0) {
        console.log('Predefined shifts provided:', predefinedShifts);
        
        // 事前定義されたシフトをデータベースに保存
        console.log('データベース挿入実行:', {
          table: 'assigned_shifts',
          data: predefinedShifts,
          dataCount: predefinedShifts.length
        });
        
        const { data: insertResult, error } = await supabase.from('assigned_shifts').insert(predefinedShifts).select();
        
        if (error) {
          console.error('データベース挿入エラー:', error);
          throw error;
        }
        
        console.log('データベース挿入成功:', {
          insertResult,
          insertedCount: insertResult?.length || 0
        });
        
        console.log(`日付 ${date}: ${predefinedShifts.length}件の事前定義シフトを保存しました`);
        
        // 対応する希望・募集のステータスを'confirmed'に更新
        try {
          for (const shift of predefinedShifts) {
            // 確定シフトからtime_slotを取得（start_time/end_timeがある場合は'fullday'、そうでなければ'negotiable'）
            const shiftTimeSlot = (shift.start_time && shift.end_time) ? 'fullday' : shift.time_slot || 'negotiable';
            
            console.log('一括確定でのステータス更新:', {
              pharmacist_id: shift.pharmacist_id,
              pharmacy_id: shift.pharmacy_id,
              date: shift.date,
              time_slot: shiftTimeSlot,
              original_time_slot: shift.time_slot
            });
            
            // 薬剤師の希望を更新
            const { error: requestError } = await supabase
              .from('shift_requests')
              .update({ status: 'confirmed' })
              .eq('pharmacist_id', shift.pharmacist_id)
              .eq('date', shift.date)
              .eq('time_slot', shiftTimeSlot);
            
            if (requestError) {
              console.warn('希望ステータス更新エラー:', requestError);
            }
            
            // 薬局の募集を更新
            const { error: postingError } = await supabase
              .from('shift_postings')
              .update({ status: 'confirmed' })
              .eq('pharmacy_id', shift.pharmacy_id)
              .eq('date', shift.date)
              .eq('time_slot', shiftTimeSlot);
            
            if (postingError) {
              console.warn('募集ステータス更新エラー:', postingError);
            }
          }
        } catch (statusError) {
          console.warn('ステータス更新中のエラー:', statusError);
        }
        
        // データを再読み込み（管理者画面）
        await loadAssignedShifts();
        await loadAll(); // 希望・募集データも再読み込み
        
        // 他のダッシュボードでも更新されるように、ページリロードを提案
        alert(`${predefinedShifts.length}件のシフトを確定しました。\n\n薬局画面と薬剤師画面を更新して最新の状態を確認してください。`);
        return;
      }

      // 指定日の希望シフトと募集シフトを取得
      const dayRequests = Array.isArray(requests) ? requests.filter((request: any) => request.date === date) : [];
      const dayPostings = Array.isArray(postings) ? postings.filter((posting: any) => posting.date === date) : [];
      
      console.log(`Processing date ${date}:`, { dayRequests, dayPostings });
      
      // 指定日のみを処理
      if (dayRequests.length > 0 || dayPostings.length > 0) {
        
        // AIマッチングを実行
        console.log('AIマッチングを実行します');
        
        let aiMatches: any[] = [];
        
        if (aiMatchingEngine) {
          // フルAIマッチングエンジンを使用
          console.log('AIマッチングエンジンを使用します');
          aiMatches = await aiMatchingEngine.executeOptimalMatching(dayRequests, dayPostings, {
            useAPI: true,
            algorithm: 'hybrid',
            priority: 'pharmacy_satisfaction'
          }, userProfiles, ratings);
                } else {
          // 簡易AIマッチングロジック
          console.log('簡易AIマッチングを使用します');
          aiMatches = await executeSimpleAIMatching(dayRequests, dayPostings);
        }
        
        console.log(`AIマッチング結果: ${aiMatches.length}件のマッチが見つかりました`);
        
        if (aiMatches.length > 0) {
          // AIマッチング結果を確定シフトに変換
          const aiShifts = aiMatches.map(match => {
            // 薬局名と店舗名を正しく取得
            const pharmacyName = userProfiles[match.pharmacy.id]?.name || 'Unknown';
            const storeName = match.pharmacy.name && match.pharmacy.name !== pharmacyName ? match.pharmacy.name : pharmacyName;
            
            return {
              pharmacist_id: match.pharmacist.id,
              pharmacy_id: match.pharmacy.id,
              date: date,
              time_slot: 'negotiable', // デフォルト値（使用しないが制約のため必要）
              start_time: match.posting.start_time, // 薬局の募集時間を使用
              end_time: match.posting.end_time, // 薬局の募集時間を使用
              status: 'confirmed',
              store_name: storeName,
              memo: `AIマッチング: ${match.compatibilityScore.toFixed(2)} score - ${match.reasons.join(', ')}`
            };
          });
          
          console.log('AIマッチングで生成されたシフト:', aiShifts);
          
          // AIマッチング結果をデータベースに保存
          if (!supabase) {
            console.error('Supabase client is not available');
            return;
          }
          
          const { error } = await supabase.from('assigned_shifts').insert(aiShifts);
          if (error) throw error;
          
          console.log(`AIマッチング完了: ${aiShifts.length}件のシフトを確定しました`);
          
          // 対応する希望・募集のステータスを'confirmed'に更新
          try {
            for (const shift of aiShifts) {
              // 薬剤師の希望を更新
              await supabase
                .from('shift_requests')
                .update({ status: 'confirmed' })
                .eq('pharmacist_id', shift.pharmacist_id)
                .eq('date', shift.date);
              
              // 薬局の募集を更新
              await supabase
                .from('shift_postings')
                .update({ status: 'confirmed' })
                .eq('pharmacy_id', shift.pharmacy_id)
                .eq('date', shift.date);
            }
          } catch (statusError) {
            console.warn('ステータス更新中のエラー:', statusError);
          }
          
          // データを再読み込み（管理者画面）
          await loadAssignedShifts();
          await loadAll(); // 希望・募集データも再読み込み
          
          // 他のダッシュボードでも更新されるように、ページリロードを提案
          alert(`${aiShifts.length}件のシフトを確定しました。\n\n薬局画面と薬剤師画面を更新して最新の状態を確認してください。`);
          return;
                } else {
          console.log('AIマッチングでマッチが見つかりませんでした');
          console.log(`マッチングできるシフトがありません。\n\n希望シフト: ${dayRequests.length}件\n募集シフト: ${dayPostings.length}件\n\n時間帯やNGリストを確認してください。`);
        return;
      }
      } else {
        console.log('希望シフトまたは募集シフトがありません');
        console.log(`マッチングできるシフトがありません。\n\n希望シフト: ${dayRequests.length}件\n募集シフト: ${dayPostings.length}件\n\n希望シフトと募集シフトの日付・時間帯が一致するものを確認してください。`);
        return;
      }
    } catch (error) {
      console.error('Error in handleConfirmShiftsForDate:', error);
      alert(`シフトの確定に失敗しました: ${(error as any).message || 'Unknown error'}`);
    }
  };

  // 募集 追加
  const handleAddPosting = async () => {
    if (!selectedDate) {
      alert('日付を選択してください');
      return;
    }
    if (!newPosting.pharmacy_id) {
      alert('薬局を選択してください');
      return;
    }
    const payload = [{
      pharmacy_id: newPosting.pharmacy_id,
      date: selectedDate,
      time_slot: newPosting.time_slot,
      required_staff: Number(newPosting.required_staff) || 1,
      store_name: (newPosting.store_name || '').trim() || null,
      memo: (newPosting.memo || '').trim() || null,
      status: 'recruiting'
    }];
    const { error } = await shiftPostings.createPostings(payload);
    if (error) {
      const e: any = error as any;
      alert(`募集の追加に失敗しました: ${e?.message || e?.code || 'Unknown error'}`);
      return;
    }
    setNewPosting({ pharmacy_id: '', time_slot: 'morning', required_staff: 1, store_name: '', memo: '' });
    loadAll();
  };

  // 薬局の募集データ削除
  const deletePosting = async (postingId: string) => {
    if (!confirm('この募集を削除しますか？')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('shift_postings')
        .delete()
        .eq('id', postingId);
      
      if (error) {
        console.error('募集の削除に失敗:', error);
        alert(`募集の削除に失敗しました: ${error.message}`);
        return;
      }
      
      console.log('募集を削除しました:', postingId);
      alert('募集を削除しました。');
      loadAll(); // データを再読み込み
    } catch (error) {
      console.error('募集の削除に失敗:', error);
      alert(`募集の削除に失敗しました: ${(error as any).message || 'Unknown error'}`);
    }
  };

  // 薬剤師の応募データ削除
  const deleteRequest = async (requestId: string) => {
    if (!confirm('この応募を削除しますか？')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('shift_requests')
        .delete()
        .eq('id', requestId);
      
      if (error) {
        console.error('応募の削除に失敗:', error);
        alert(`応募の削除に失敗しました: ${error.message}`);
        return;
      }
      
      console.log('応募を削除しました:', requestId);
      alert('応募を削除しました。');
      loadAll(); // データを再読み込み
    } catch (error) {
      console.error('応募の削除に失敗:', error);
      alert(`応募の削除に失敗しました: ${(error as any).message || 'Unknown error'}`);
    }
  };

  // 希望 追加
  const handleAddRequest = async () => {
    if (!selectedDate) {
      alert('日付を選択してください');
      return;
    }
    if (!newRequest.pharmacist_id) {
      alert('薬剤師を選択してください');
      return;
    }
    // start_time/end_time を time_slot から補完（将来: UIで直接入力できるように）
    const toRange = (slot: string) => {
      // Supabaseの time 型は HH:MM:SS を推奨
      if (slot === 'morning') return { start_time: '09:00:00', end_time: '13:00:00' };
      if (slot === 'afternoon') return { start_time: '13:00:00', end_time: '18:00:00' };
      return { start_time: '09:00:00', end_time: '18:00:00' };
    };
    const range = toRange(newRequest.time_slot);
    const payload = [{
      pharmacist_id: newRequest.pharmacist_id,
      date: selectedDate,
      time_slot: newRequest.time_slot,
      start_time: range.start_time,
      end_time: range.end_time,
      priority: newRequest.priority
    }];
    const { error } = await shiftRequests.createRequests(payload);
    if (error) {
      const e: any = error as any;
      alert(`希望の追加に失敗しました: ${e?.message || e?.code || 'Unknown error'}`);
      return;
    }
    setNewRequest({ pharmacist_id: '', time_slot: 'morning', priority: 'medium' });
    await loadAll();
  };

  // 募集 編集開始/保存
  const beginEditPosting = (p: any) => {
    setEditingPostingId(p.id);
    setPostingEditForm({
      time_slot: p.time_slot === 'fullday' ? 'full' : p.time_slot,
      required_staff: p.required_staff,
      store_name: p.store_name || '',
      memo: p.memo || ''
    });
  };
  const saveEditPosting = async (postingId: string) => {
    const { error } = await shiftPostings.updatePosting(postingId, {
      time_slot: postingEditForm.time_slot,
      required_staff: Number(postingEditForm.required_staff) || 1,
      store_name: (postingEditForm.store_name || '').trim() || null,
      memo: (postingEditForm.memo || '').trim() || null
    });
    if (error) {
      alert(`募集の更新に失敗しました: ${error.message || error.code || 'Unknown error'}`);
      return;
    }
    setEditingPostingId(null);
    loadAll();
  };

  // 希望 編集開始/保存
  const beginEditRequest = (r: any) => {
    setEditingRequestId(r.id);
    setRequestEditForm({
      time_slot: r.time_slot === 'fullday' ? 'full' : r.time_slot,
      priority: r.priority || 'medium',
      memo: r.memo || ''
    });
  };
  const saveEditRequest = async (requestId: string) => {
    const { error } = await shiftRequestsAdmin.updateRequest(requestId, {
      time_slot: requestEditForm.time_slot,
      priority: requestEditForm.priority,
      memo: requestEditForm.memo
    });
    if (error) {
      alert(`希望の更新に失敗しました: ${error.message || error.code || 'Unknown error'}`);
      return;
    }
    setEditingRequestId(null);
    loadAll();
  };

  // 確定シフトの取り消し
  const handleCancelConfirmedShifts = async (date: string) => {
    if (!confirm(`${date}の確定シフトを取り消しますか？`)) {
      return;
    }

    try {
      // 1) 対象日の確定シフトを取得（後で復元に利用）
      const { data: toCancel, error: fetchErr } = await supabase
        .from('assigned_shifts')
        .select('*')
        .eq('date', date)
        .eq('status', 'confirmed');
      if (fetchErr) {
        console.error('Error fetching confirmed shifts before cancel:', fetchErr);
      }

      // 2) 対応する希望・募集のステータスを元に戻す
      if (toCancel && toCancel.length > 0) {
        console.log('=== 確定取り消し: ステータス更新開始 ===');
        console.log('取り消すシフト数:', toCancel.length);
        
        for (const s of toCancel) {
          console.log('シフト詳細:', {
            pharmacist_id: s.pharmacist_id,
            pharmacy_id: s.pharmacy_id,
            date: s.date,
            time_slot: s.time_slot
          });
          
          // 薬剤師の希望ステータスを元に戻す
          const { error: requestError } = await supabase
            .from('shift_requests')
            .update({ status: 'pending' })
            .eq('pharmacist_id', s.pharmacist_id)
            .eq('date', date)
            .eq('time_slot', s.time_slot || 'negotiable');
          
          if (requestError) {
            console.warn('希望ステータス更新エラー:', requestError);
          } else {
            console.log('希望ステータス更新成功:', {
              pharmacist_id: s.pharmacist_id,
              date,
              time_slot: s.time_slot
            });
          }
          
          // 薬局の募集ステータスを元に戻す（同日・同薬局を一括で open に戻す）
          const { error: postingError } = await supabase
            .from('shift_postings')
            .update({ status: 'open' })
            .eq('pharmacy_id', s.pharmacy_id)
            .eq('date', date);
          
          if (postingError) {
            console.warn('募集ステータス更新エラー:', postingError);
          } else {
            console.log('募集ステータス更新成功:', {
              pharmacy_id: s.pharmacy_id,
              date,
              time_slot: s.time_slot
            });
          }
        }
        console.log('=== 確定取り消し: ステータス更新完了 ===');
      }

      // 3) 確定シフトを削除
      const { error } = await supabase
        .from('assigned_shifts')
        .delete()
        .eq('date', date)
        .eq('status', 'confirmed');

      if (error) {
        console.error('Error canceling confirmed shifts:', error);
        alert(`確定シフトの取り消しに失敗しました: ${error.message || error.code || 'Unknown error'}`);
        return;
      }

      alert(`${date}の確定シフトを取り消しました`);
      
      // システム状態を未確定に戻す
      setSystemStatus('pending');
      setLastUpdated(new Date());
      
      // データを再読み込み
      await loadAssignedShifts();
      await loadAll(); // 希望・募集データも再読み込み
    } catch (error) {
      console.error('Error in handleCancelConfirmedShifts:', error);
      alert(`確定シフトの取り消しに失敗しました: ${(error as any).message || 'Unknown error'}`);
    }
  };

  // 全確定シフトの一括取り消し

  // シフト編集の状態管理
  const [editingShift, setEditingShift] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    pharmacist_id: '',
    pharmacy_id: '',
    time_slot: ''
  });

  // シフトの編集開始
  const handleEditShift = (shift: any) => {
    setEditingShift(shift);
    setEditForm({
      pharmacist_id: shift.pharmacist_id,
      pharmacy_id: shift.pharmacy_id,
      time_slot: shift.time_slot
    });
  };

  // シフト編集の保存
  const handleSaveShiftEdit = async () => {
    if (!editingShift) return;

    try {
      const { error } = await supabase
        .from('assigned_shifts')
        .update(editForm)
        .eq('id', editingShift.id);

      if (error) {
        console.error('Error updating shift:', error);
        alert(`シフトの更新に失敗しました: ${error.message || error.code || 'Unknown error'}`);
        return;
      }

      alert('シフトを更新しました');
      setEditingShift(null);
      setEditForm({ pharmacist_id: '', pharmacy_id: '', time_slot: '' });
      loadAll();
    } catch (error) {
      console.error('Error in handleSaveShiftEdit:', error);
      alert(`シフトの更新に失敗しました: ${(error as any).message || 'Unknown error'}`);
    }
  };

  // シフト編集のキャンセル
  const handleCancelShiftEdit = () => {
    setEditingShift(null);
    setEditForm({ pharmacist_id: '', pharmacy_id: '', time_slot: '' });
  };

  // 実際のマッチング処理を実行する関数
  const executeMatching = async () => {
    try {
      console.log('=== 実際のマッチング処理開始 ===');
      console.log('マッチング前の状態:', { 
        requests: requests.length, 
        postings: postings.length, 
        assigned: assigned.length,
        assignedDetails: assigned
      });
      
      // デバッグ情報をモーダルで表示
      let debugInfo = `=== マッチング処理デバッグ ===\n`;
      debugInfo += `シフト希望数: ${requests.length}件\n`;
      debugInfo += `シフト募集数: ${postings.length}件\n`;
      debugInfo += `確定済みシフト数: ${assigned.length}件\n\n`;
      
      // 日付ごとにマッチング処理を実行
      const dates = [...new Set([...requests.map(r => r.date), ...postings.map(p => p.date)])];
      console.log('マッチング対象日付:', dates);
      debugInfo += `マッチング対象日付: ${dates.join(', ')}\n\n`;
      
      let totalMatches = 0;
      let processedDates = 0;
      
      for (const date of dates) {
        console.log(`=== 日付 ${date} のマッチング処理 ===`);
        processedDates++;
        debugInfo += `--- 日付 ${date} ---\n`;
        
        // その日の希望と募集を取得
        const dayRequests = Array.isArray(requests) ? requests.filter(r => r.date === date && r.time_slot !== 'consult') : [];
        const dayPostings = Array.isArray(postings) ? postings.filter(p => p.date === date && p.time_slot !== 'consult') : [];
        const dayAssigned = Array.isArray(assigned) ? assigned.filter(a => a.date === date && a.status === 'confirmed') : [];
        
        console.log(`日付 ${date}: 希望${dayRequests.length}件, 募集${dayPostings.length}件, 確定${dayAssigned.length}件`);
        debugInfo += `希望: ${dayRequests.length}件, 募集: ${dayPostings.length}件, 確定: ${dayAssigned.length}件\n`;
        
        if (dayRequests.length === 0 || dayPostings.length === 0) {
          console.log(`日付 ${date}: 希望または募集がないためスキップ`);
          debugInfo += `→ 希望または募集がないためスキップ\n`;
          continue;
        }
        
        // 既に確定済みの場合はスキップ
        if (dayAssigned.length > 0) {
          console.log(`日付 ${date}: 既に確定済みのためスキップ`);
          debugInfo += `→ 既に確定済みのためスキップ\n`;
          continue;
        }
        
        // マッチング処理を実行
        const dateMatches = await performMatchingForDate(date, dayRequests, dayPostings);
        totalMatches += dateMatches;
        debugInfo += `→ マッチング結果: ${dateMatches}件\n`;
      }
      
      console.log('=== 実際のマッチング処理完了 ===');
      debugInfo += `\n=== 処理結果 ===\n`;
      debugInfo += `処理対象日付数: ${processedDates}日\n`;
      debugInfo += `総マッチング件数: ${totalMatches}件\n`;
      
      // データを再読み込み
      await loadAll();
      
      // マッチング結果を確認
      console.log('=== マッチング結果確認 ===');
      console.log('更新後のデータ:', { 
        requests: requests.length, 
        postings: postings.length, 
        assigned: assigned.length 
      });
      
      // デバッグ情報をコンソールに出力
      console.log('マッチング処理デバッグ:', debugInfo);
      
    } catch (error) {
      console.error('マッチング実行エラー:', error);
      throw error;
    }
  };

  // 特定の日付のマッチング処理を実行
  const performMatchingForDate = async (date: string, dayRequests: any[], dayPostings: any[]): Promise<number> => {
    console.log(`=== 日付 ${date} のマッチング実行 ===`);
    
    const matchedShifts: any[] = [];
    
    // 時間範囲ベースのマッチング処理
    console.log(`時間範囲ベースのマッチング処理開始`);
    
    // 時間範囲がある希望のみを対象とする
    const validRequests = Array.isArray(dayRequests) ? dayRequests.filter(r => r.start_time && r.end_time) : [];
    const validPostings = Array.isArray(dayPostings) ? dayPostings.filter(p => p.start_time && p.end_time) : [];
    
    console.log(`時間範囲がある希望: ${validRequests.length}件`);
    console.log(`時間範囲がある募集: ${validPostings.length}件`);
    console.log(`時間範囲がある希望詳細:`, validRequests.map(r => ({
      id: r.id,
      pharmacist_id: r.pharmacist_id,
      start_time: r.start_time,
      end_time: r.end_time
    })));
    console.log(`時間範囲がある募集詳細:`, validPostings.map(p => ({
      id: p.id,
      pharmacy_id: p.pharmacy_id,
      start_time: p.start_time,
      end_time: p.end_time,
      required_staff: p.required_staff
    })));
    
    if (validRequests.length === 0 || validPostings.length === 0) {
      console.log(`時間範囲がある希望または募集がないためスキップ`);
      return 0;
      }
      
      // 薬剤師を評価と優先順位でソート（評価が高い順、同じ評価なら優先度順）
    const sortedRequests = validRequests.sort((a, b) => {
        const aRating = getPharmacistRating(a.pharmacist_id);
        const bRating = getPharmacistRating(b.pharmacist_id);
        
        // 評価が異なる場合は評価の高い順
        if (aRating !== bRating) {
          return bRating - aRating;
        }
        
        // 評価が同じ場合は優先度順
        const priorityOrder: { [key: string]: number } = { 'high': 3, 'medium': 2, 'low': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
      
      // 各薬局の必要人数を管理
    const pharmacyNeeds = validPostings.map(p => ({
        ...p,
        remaining: Number(p.required_staff) || 0
      }));
      
      // マッチング処理
      for (const request of sortedRequests) {
        for (const pharmacyNeed of pharmacyNeeds) {
          if (pharmacyNeed.remaining <= 0) continue;
          
        // NGリストチェック
          const pharmacist = userProfiles[request.pharmacist_id];
          const pharmacy = userProfiles[pharmacyNeed.pharmacy_id];
          
        // 薬剤師のNG薬局・店舗リストを取得（store_ng_pharmaciesテーブルから）
        const pharmacistNgPharmacies = storeNgPharmacies[request.pharmacist_id] || [];
        const pharmacistNg = Array.isArray(pharmacist?.ng_list) ? pharmacist.ng_list : [];
        
        // 薬局のNG薬剤師リストを取得（store_ng_pharmacistsテーブルから）
        const pharmacyNgPharmacists = storeNgPharmacists[pharmacyNeed.pharmacy_id] || [];
        const pharmacyNg = Array.isArray(pharmacy?.ng_list) ? pharmacy.ng_list : [];
        
        // 薬剤師が薬局をNGにしているかチェック（店舗名も考慮）
        const blockedByPharmacist = pharmacistNgPharmacies.some((ngPharmacy: any) => 
          ngPharmacy.pharmacy_id === pharmacyNeed.pharmacy_id && 
          (ngPharmacy.store_name === pharmacyNeed.store_name || ngPharmacy.store_name === null)
        ) || pharmacistNg.includes(pharmacyNeed.pharmacy_id);
        
        // 薬局が薬剤師をNGにしているかチェック
        const blockedByPharmacy = pharmacyNgPharmacists.some((ngPharmacist: any) => 
          ngPharmacist.pharmacist_id === request.pharmacist_id
        ) || pharmacyNg.includes(request.pharmacist_id);
        
        // NGリストチェックの詳細ログ
        if (blockedByPharmacist || blockedByPharmacy) {
          console.log(`❌ NGリストによりマッチング不可: 薬剤師(${pharmacist?.name || request.pharmacist_id}) ↔ 薬局(${pharmacy?.name || pharmacyNeed.pharmacy_id})`);
          if (blockedByPharmacist) {
            console.log(`  - 薬剤師のNGリストに薬局が含まれています`);
            console.log(`  - 薬剤師NG薬局リスト:`, pharmacistNgPharmacies);
            console.log(`  - 薬剤師NGリスト:`, pharmacistNg);
            console.log(`  - storeNgPharmacies:`, storeNgPharmacies);
            console.log(`  - チェック対象薬局ID:`, pharmacyNeed.pharmacy_id);
            console.log(`  - チェック対象店舗名:`, pharmacyNeed.store_name);
          }
          if (blockedByPharmacy) {
            console.log(`  - 薬局のNGリストに薬剤師が含まれています`);
            console.log(`  - 薬局NG薬剤師リスト:`, pharmacyNgPharmacists);
            console.log(`  - 薬局NGリスト:`, pharmacyNg);
            console.log(`  - チェック対象薬剤師ID:`, request.pharmacist_id);
          }
        } else {
          // NGリストチェック通過時のログも追加
          console.log(`✅ NGリストチェック通過: 薬剤師(${pharmacist?.name || request.pharmacist_id}) ↔ 薬局(${pharmacy?.name || pharmacyNeed.pharmacy_id})`);
          console.log(`  - 薬剤師NG薬局リスト:`, pharmacistNgPharmacies);
          console.log(`  - 薬局NG薬剤師リスト:`, pharmacyNgPharmacists);
        }
        
        // 時間範囲ベースのマッチング
        const isRangeCompatible = (request: any, posting: any) => {
            const rs = request?.start_time;
            const re = request?.end_time;
            const ps = posting?.start_time;
            const pe = posting?.end_time;
          
          if (!rs || !re || !ps || !pe) return false;

          // 時間を数値に変換（HH:MM:SS形式を分に変換）
          const timeToMinutes = (timeStr: string) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
          };

          const requestStart = timeToMinutes(rs);
          const requestEnd = timeToMinutes(re);
          const postingStart = timeToMinutes(ps);
          const postingEnd = timeToMinutes(pe);

          // 薬剤師が薬局の希望時間を完全に満たしているかチェック
          return requestStart <= postingStart && requestEnd >= postingEnd;
          };
          
        if (!blockedByPharmacist && !blockedByPharmacy && isRangeCompatible(request, pharmacyNeed)) {
          console.log(`✅ 時間範囲マッチング: 薬剤師(${pharmacist?.name}) ${request.start_time}-${request.end_time} → 薬局(${pharmacy?.name}) ${pharmacyNeed.start_time}-${pharmacyNeed.end_time}`);
            
            // 確定シフトを作成
            const confirmedShift = {
              pharmacist_id: request.pharmacist_id,
              pharmacy_id: pharmacyNeed.pharmacy_id,
              date: date,
              time_slot: pharmacyNeed.time_slot, // time_slotを追加
              start_time: pharmacyNeed.start_time,
              end_time: pharmacyNeed.end_time,
              status: 'confirmed',
              store_name: pharmacyNeed.store_name || pharmacy?.name || '',
              memo: `マッチング: ${pharmacist?.name} → ${pharmacy?.name}`
            };
            
            console.log('作成する確定シフト:', confirmedShift);
            matchedShifts.push(confirmedShift);
            pharmacyNeed.remaining--;
            break;
          } else {
            // マッチング失敗の理由をログ出力
            if (blockedByPharmacist) {
              console.log(`❌ マッチング失敗: 薬剤師NGリストに薬局が含まれています (薬剤師:${pharmacist?.name}, 薬局:${pharmacy?.name})`);
            } else if (blockedByPharmacy) {
              console.log(`❌ マッチング失敗: 薬局NGリストに薬剤師が含まれています (薬剤師:${pharmacist?.name}, 薬局:${pharmacy?.name})`);
          } else if (!isRangeCompatible(request, pharmacyNeed)) {
            console.log(`❌ マッチング失敗: 時間範囲不適合 (薬剤師:${request.start_time}-${request.end_time} vs 薬局:${pharmacyNeed.start_time}-${pharmacyNeed.end_time})`);
          }
        }
      }
    }
    
    // 確定シフトをデータベースに保存
    if (matchedShifts.length > 0) {
      console.log(`日付 ${date}: ${matchedShifts.length}件の確定シフトを保存`);
      console.log('保存する確定シフト詳細:', matchedShifts);
      
      const { data: insertData, error } = await supabase
        .from('assigned_shifts')
        .insert(matchedShifts)
        .select();
      
      if (error) {
        console.error('確定シフト保存エラー:', error);
        console.error('エラー詳細:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log(`日付 ${date}: 確定シフトの保存が完了しました`);
      console.log('保存されたデータ:', insertData);
    } else {
      console.log(`日付 ${date}: マッチング結果なし`);
    }
    
    return matchedShifts.length;
  };

  // マッチング処理を手動で実行する関数
  const handleRunMatching = async () => {
    try {
      console.log('=== 手動マッチング実行開始 ===');
      console.log('現在のデータ:', { requests: requests.length, postings: postings.length, assigned: assigned.length });
      
      // 実際のマッチング処理を実行
      await executeMatching();
      
      console.log('=== 手動マッチング実行完了 ===');
      console.log('マッチング処理を実行しました。データを再読み込みしました。');
    } catch (error) {
      console.error('マッチング実行エラー:', error);
      console.error(`マッチング実行に失敗しました: ${(error as any).message || '不明なエラー'}`);
    }
  };




  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* AIマッチングコントロール - 非表示 */}
      {false && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="w-6 h-6 text-purple-600" />
              <div>
                <h3 className="text-sm font-medium text-purple-800">AIマッチングシステム</h3>
                <p className="text-xs text-purple-600">
                  {useAIMatching ? 'AIマッチングが有効です' : '従来のルールベースマッチングを使用中'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useAIMatching}
                  onChange={(e) => setUseAIMatching(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-purple-700">AIマッチング</span>
              </label>
              {selectedDate && (
                <button
                  onClick={() => executeAIMatching(selectedDate)}
                  disabled={aiMatchingLoading}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {aiMatchingLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>AI分析中...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>AIマッチング実行</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AIマッチング統計 - 非表示 */}
      {false && <AIMatchingStats className="mb-6" />}

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 p-2 sm:p-4 lg:p-6">
        {/* left calendar */}
        <div className="flex-1 bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
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
              <div key={d} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-gray-500">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {getDaysInMonth(currentDate).map((d, i) => {
              // dがnullの場合は空白セルを返す
              if (d === null) {
                return (
                  <div key={i} className="p-2 sm:p-3 text-center text-xs sm:text-sm border border-gray-200 min-h-[80px] sm:min-h-[90px] bg-gray-50">
                  </div>
                );
              }

              const year = currentDate.getFullYear();
              const month = currentDate.getMonth() + 1;
              const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d?.toString().padStart(2, '0')}`;
              
              // その日の確定シフトを取得（安全な配列チェック）
              const dayAssignedShifts = Array.isArray(assigned) ? assigned.filter((s: any) => s.date === dateStr && s.status === 'confirmed') : [];
              
              // デバッグ用：確定シフトの詳細をログ出力
              if (dayAssignedShifts.length > 0) {
                console.log(`日付 ${dateStr} の確定シフト:`, dayAssignedShifts);
              }
              
              // その日の希望と募集を取得（要相談を除外、安全な配列チェック）
              const allDayRequests = Array.isArray(requests) ? requests.filter((r: any) => r.date === dateStr && r.time_slot !== 'consult') : [];
              const allDayPostings = Array.isArray(postings) ? postings.filter((p: any) => p.date === dateStr && p.time_slot !== 'consult') : [];
              
              // 確定済みステータスの希望・募集を除外
              const { filteredRequests: dayRequests, filteredPostings: dayPostings } = filterConfirmedRequestsAndPostings(
                allDayRequests, 
                allDayPostings
              );
              
              // データがある日付のみログを出力（デバッグ用）
              if (dayRequests.length > 0 || dayPostings.length > 0) {
                console.log(`🔥🔥🔥 日付 ${dateStr} のデータフィルタリング 🔥🔥🔥`);
                console.log('全シフト希望:', requests.length);
                console.log('全シフト募集:', postings.length);
                console.log('フィルタ後の希望:', dayRequests.length);
                console.log('フィルタ後の募集:', dayPostings.length);
                console.log('希望の時間帯:', dayRequests.map(r => r.time_slot));
                console.log('募集の時間帯:', dayPostings.map(p => p.time_slot));
                console.log('データフィルタリングが実行されました - コンソールを確認してください');
              }
              // 要相談のリクエストを取得（安全な配列チェック）
              const dayConsultRequests = Array.isArray(requests) ? requests.filter((r: any) => r.date === dateStr && r.time_slot === 'consult') : [];
              
              
              // マッチング状況を計算（右パネルと同じロジックを使用）
              const calculateMatchingStatus = () => {
                if (dayRequests.length > 0 || dayPostings.length > 0) {
                  console.log(`=== カレンダーマッチング状況計算開始 (${dateStr}) ===`);
                  console.log('dayRequests:', dayRequests);
                  console.log('dayPostings:', dayPostings);
                }

                // 確定シフトがあるかチェック
                if (dayAssignedShifts.length > 0) {
                  const totalRequired = dayPostings.reduce((sum, posting) => sum + (posting.required_staff || 1), 0);
                  const totalMatched = dayAssignedShifts.length;
                  const totalShortage = Math.max(0, totalRequired - totalMatched);
                  console.log(`確定シフト存在 [${dateStr}]: 必要=${totalRequired}, 確定=${totalMatched}, 不足=${totalShortage}`);

                  return {
                    type: 'confirmed',
                    count: totalMatched,
                    shortage: totalShortage
                  };
                }

                // 右パネルと同じロジックで不足を計算
                const shortagePharmacies = analyzePharmacyShortage(dateStr);
                const totalShortage = shortagePharmacies.reduce((sum, pharmacy) => sum + pharmacy.shortage, 0);
                const dayMatches = aiMatchesByDate[dateStr] || [];
                const totalMatched = dayMatches.length;
                const totalAvailable = dayRequests.length;
                if (dayRequests.length > 0 || dayPostings.length > 0) {
                  console.log(`右パネル連携計算 [${dateStr}]: マッチ=${totalMatched}, 不足=${totalShortage}`);
                  console.log(`不足薬局詳細:`, shortagePharmacies);
                }

                const result = {
                  type: totalMatched > 0 ? 'matched' : (totalShortage > 0 || totalAvailable > 0 ? 'pending' : 'empty'),
                  count: totalMatched,
                  shortage: totalShortage
                };

                if (dayRequests.length > 0 || dayPostings.length > 0) {
                  console.log(`=== マッチング状況計算完了 (${dateStr}) ===`);
                }
                return result;
              };
              
              const matchingStatus = calculateMatchingStatus();
              
              return (
                <div 
                  key={i} 
                  className={`p-2 sm:p-3 text-center text-xs sm:text-sm border border-gray-200 min-h-[80px] sm:min-h-[90px] ${
                    d ? 'cursor-pointer' : 'bg-gray-50'
                  } ${
                    selectedDate === dateStr ? 'bg-blue-100 border-blue-300' : ''
                  }`}
                  onClick={() => d && handleDateSelect(d)}
                >
                  {d && (
                    <>
                      <div className="font-medium">{d}</div>
                      
                      {/* マッチング状況表示 */}
                      {matchingStatus.type === 'confirmed' && (
                        <div className="relative group">
                          <div className="text-[7px] sm:text-[8px] space-y-0.5">
                            <div className="text-green-700 bg-green-50 border border-green-200 rounded px-1 inline-block">
                              <span className="sm:hidden">確{matchingStatus.count}</span>
                              <span className="hidden sm:inline">確定 {matchingStatus.count}件</span>
                            </div>
                            
                            {/* 確定後も不足パッチを表示（1ヶ月分マッチング実行後にのみ） */}
                            {monthlyMatchingExecuted && matchingStatus.shortage > 0 && (
                              <div className="text-red-600 bg-red-50 border border-red-200 rounded px-1 inline-block">
                                <span className="sm:hidden">不{matchingStatus.shortage}</span>
                                <span className="hidden sm:inline">不足 {matchingStatus.shortage}</span>
                              </div>
                            )}
                            
                            
                            {dayConsultRequests.length > 0 && (
                              <div className="text-purple-600 bg-purple-50 border border-purple-200 rounded px-1 inline-block">
                                <span className="sm:hidden">相{dayConsultRequests.length}</span>
                                <span className="hidden sm:inline">相談 {dayConsultRequests.length}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* ホバー詳細は右側パネルで表示するため非表示に変更 */}
                        </div>
                      )}
                      
                      {/* マッチング状況表示（確定シフトがない場合） */}
                      {matchingStatus.type !== 'confirmed' && matchingStatus.type !== 'empty' && (
                        <div className="relative group">
                          <div className="text-[7px] sm:text-[8px] space-y-0.5">
                            {/* マッチ件数（マッチング実行後のみ表示） */}
                            {aiMatchesByDate[dateStr] && aiMatchesByDate[dateStr].length > 0 && (
                              <div className="text-purple-600 bg-purple-50 border border-purple-200 rounded px-1 inline-block">
                                <span className="sm:hidden">マ{aiMatchesByDate[dateStr].length}</span>
                                <span className="hidden sm:inline">マッチ {aiMatchesByDate[dateStr].length}</span>
                              </div>
                            )}
                            
                            {/* 不足件数（1ヶ月分マッチング実行後に不足がある場合に表示） */}
                            {(() => {
                              const shouldShowShortage = monthlyMatchingExecuted && matchingStatus.shortage > 0;
                              if (matchingStatus.shortage > 0) {
                                console.log(`カレンダー不足パッチ表示判定 [${dateStr}]:`, {
                                  monthlyMatchingExecuted,
                                  shortage: matchingStatus.shortage,
                                  shouldShowShortage,
                                  totalRequired: matchingStatus.count || 0,
                                  totalMatched: matchingStatus.count - matchingStatus.shortage || 0
                                });
                              }
                              return shouldShowShortage;
                            })() && (
                              <div className="text-red-600 bg-red-50 border border-red-200 rounded px-1 inline-block">
                                <span className="sm:hidden">不{matchingStatus.shortage}</span>
                                <span className="hidden sm:inline">不足 {matchingStatus.shortage}</span>
                              </div>
                            )}
                            
                            
                            {/* 相談数 */}
                            {dayConsultRequests.length > 0 && (
                              <div className="text-purple-600 bg-purple-50 border border-purple-200 rounded px-1 inline-block">
                                <span className="sm:hidden">相{dayConsultRequests.length}</span>
                                <span className="hidden sm:inline">相談 {dayConsultRequests.length}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* ホバー詳細は右側パネルで表示するため非表示に変更 */}
                        </div>
                      )}
                      
                      
                      {/* 確定は上のブロックで件数ラベルのみ表示 */}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* right panel */}
        <div className="w-full lg:w-80 xl:w-96 bg-white rounded-lg shadow border border-purple-200 flex flex-col h-[800px]">
          <div className="bg-purple-600 text-white p-4 rounded-t-lg flex-shrink-0">
            <h2 className="text-xl font-semibold">管理者パネル</h2>
          </div>
          
          {/* 募集管理 */}
          <div className="p-4 lg:p-6 pb-0 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <h3 className="font-semibold text-gray-800 mb-3">募集管理</h3>
              <div className="mb-3">
                <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${
                  recruitmentStatus.is_open 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {recruitmentStatus.is_open ? '募集受付中' : '募集締切中'}
                </span>
              </div>
              <button
                onClick={toggleRecruitmentStatus}
                className={`w-full py-2 px-4 rounded-lg font-medium text-sm ${
                  recruitmentStatus.is_open 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {recruitmentStatus.is_open ? '募集を締め切る' : '募集を再開する'}
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <h3 className="font-semibold text-gray-800 mb-3">1ヶ月分マッチング</h3>
              <div className="space-y-2">
                <button
                  onClick={executeMonthlyAIMatching}
                  disabled={aiMatchingLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center space-x-2"
                >
                  {aiMatchingLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>マッチング実行中...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" />
                      <span>1ヶ月分マッチングを実行</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* スクロール可能な詳細エリア */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 pt-4 space-y-4">
            {/* 選択された日付の詳細表示 */}
            {selectedDate && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-blue-600 text-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <h3 className="text-lg font-semibold">日付詳細</h3>
                    </div>
                    <button
                      onClick={() => setSelectedDate('')}
                      className="text-blue-100 hover:text-white text-sm"
                    >
                      ✕ 閉じる
                    </button>
                  </div>
                  <p className="text-sm text-blue-100 mt-1">
                    {new Date(selectedDate).getMonth() + 1}月{new Date(selectedDate).getDate()}日の詳細情報
                  </p>
                </div>
                
                {/* 日別確定ボタン */}
                {(() => {
                  const allDayRequests = (requests || []).filter((r: any) => r.date === selectedDate);
                  const allDayPostings = (postings || []).filter((p: any) => p.date === selectedDate);
                  const dayAssignedShifts = (assigned || []).filter((s: any) => s.date === selectedDate && s.status === 'confirmed');
                  
                  // 確定済みステータスの希望・募集を除外
                  const { filteredRequests: dayRequests, filteredPostings: dayPostings } = filterConfirmedRequestsAndPostings(
                    allDayRequests, 
                    allDayPostings
                  );
                  
                  // AIマッチング結果の表示（選択された日付のマッチング結果のみ）
                  const dayMatches = aiMatchesByDate[selectedDate] || [];
                  
                  // 日毎の不足薬局分析
                  const dayShortageAnalysis = analyzePharmacyShortage(selectedDate);
                  
                  // 確定シフトがある場合はAIマッチング結果を表示しない
                  const hasConfirmedShifts = dayAssignedShifts.length > 0;
                  
                  // AIマッチング結果は確定シフトがない場合のみ表示
                  if (dayMatches.length > 0 && selectedDate && !hasConfirmedShifts) {
                    return (
                      <div className="p-4 border-b border-gray-200">
                        {/* AIマッチング結果 */}
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <Brain className="w-4 h-4 text-purple-600" />
                            <h4 className="text-sm font-semibold text-purple-800">AIマッチング結果 {dayMatches.length}件</h4>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {dayMatches.map((match, index) => (
                              <div key={index} className="bg-white rounded border p-2 text-xs">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-800">
                                      {userProfiles[match.pharmacist.id]?.name || 'Unknown'} → {userProfiles[match.pharmacy.id]?.name || 'Unknown'}
                                    </div>
                                    <div className="text-gray-600">
                                      店舗: {match.pharmacy.name || '店舗名なし'}
                                    </div>
                                    <div className="text-gray-600">
                                      {match.timeSlot.start} - {match.timeSlot.end}
                                    </div>
                                  </div>
                                  <div className="text-right ml-2">
                                    <div className="text-purple-600 font-medium mb-1">
                                      {Math.round(match.compatibilityScore * 100)}%
                                    </div>
                                    <div className="text-xs text-gray-500 mb-1">
                                      {(match.reasons || []).slice(0, 2).join(', ')}
                                    </div>
                                    <button
                                      onClick={() => handleConfirmSingleMatch(match, selectedDate)}
                                      className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                                    >
                                      確定
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* 不足薬局一覧 */}
                        {dayShortageAnalysis.length > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <h4 className="text-sm font-semibold text-red-800">不足薬局 {dayShortageAnalysis.length}薬局</h4>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {dayShortageAnalysis.map((pharmacy, index) => {
                                // データベースから薬剤師を取得（user_profilesから薬剤師タイプのみ）
                                console.log('薬剤師選択時のuserProfiles確認:', {
                                  userProfiles,
                                  userProfilesType: typeof userProfiles,
                                  userProfilesKeys: Object.keys(userProfiles || {}),
                                  userProfilesLength: Object.keys(userProfiles || {}).length
                                });
                                
                                const availablePharmacists = Object.values(userProfiles || {}).filter((profile: any) => {
                                  console.log('薬剤師プロフィール確認:', {
                                    profile,
                                    user_type: profile?.user_type,
                                    id: profile?.id,
                                    name: profile?.name
                                  });
                                  return profile?.user_type === 'pharmacist';
                                });
                                
                                console.log('利用可能な薬剤師:', {
                                  availablePharmacists,
                                  count: availablePharmacists.length
                                });
                                
                                return (
                                  <div key={index} className="bg-white rounded border p-2 text-xs">
                                    <div className="font-medium text-gray-800">
                                      {pharmacy.name}（{pharmacy.store_name || '店舗名なし'}）
                                    </div>
                                    <div className="text-gray-600">
                                      必要人数: {pharmacy.required}人
                                    </div>
                                    <div className="text-gray-600">
                                      マッチ人数: {pharmacy.matched}人
                                    </div>
                                    <div className="text-red-600 font-medium">
                                      不足人数: {pharmacy.shortage}人
                                    </div>
                                    
                                    {/* 手動マッチング用のプルダウン */}
                                    {pharmacy.shortage > 0 && (
                                      <div className="mt-2">
                                        <div className="text-xs text-gray-600 mb-1">
                                          不足分の薬剤師を希望シフトとして選択してください:
                                          <br />
                                          <span className="text-red-600">※ 選択した薬剤師の新しいシフト希望が作成されます</span>
                                        </div>
                                        <div className="space-y-1">
                                          {Array.from({ length: pharmacy.shortage }, (_, index) => (
                                            <div key={index} className="flex items-center space-x-2">
                                              <span className="text-xs text-gray-500 w-8">
                                                {index + 1}人目:
                                              </span>
                                              <select
                                                id={`pharmacist-select-${pharmacy.id}-${index}`}
                                                name={`pharmacist-select-${pharmacy.id}-${index}`}
                                                value={manualMatches[pharmacy.id]?.[index] || ''}
                                                onChange={(e) => {
                                                  const newMatches = [...(manualMatches[pharmacy.id] || [])];
                                                  newMatches[index] = e.target.value;
                                                  setManualMatches(prev => ({
                                                    ...prev,
                                                    [pharmacy.id]: newMatches
                                                  }));
                                                }}
                                                className="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
                                              >
                                                <option value="">薬剤師を選択してください</option>
                                                {availablePharmacists.map((pharmacist: any, pharmacistIndex: number) => {
                                                  console.log('薬剤師選択オプション:', {
                                                    pharmacist,
                                                    id: pharmacist.id,
                                                    name: pharmacist.name,
                                                    idType: typeof pharmacist.id
                                                  });
                                                  
                                                  return (
                                                    <option 
                                                      key={pharmacistIndex} 
                                                      value={pharmacist.id}
                                                      disabled={manualMatches[pharmacy.id]?.includes(pharmacist.id) && manualMatches[pharmacy.id]?.[index] !== pharmacist.id}
                                                    >
                                                      {pharmacist.name || `薬剤師${pharmacist.id ? pharmacist.id.slice(-4) : 'unknown'}`}
                                                    </option>
                                                  );
                                                })}
                                              </select>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* 手動マッチング確定ボタン */}
        {Object.values(manualMatches).some(matches => matches.some(id => id && id !== '')) && (
          <div className="mt-3 pt-2 border-t border-red-200">
            <button
              onClick={() => saveManualShiftRequests(selectedDate)}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-xs font-medium"
            >
              選択した薬剤師を希望シフトとして保存
              <br />
              <span className="text-xs opacity-90">（新しいシフト希望が作成されます）</span>
            </button>
          </div>
        )}
                          </div>
                        )}
                        
                        <button
                          onClick={() => {
                            const shifts = convertAIMatchesToShifts(dayMatches, selectedDate);
                            // AIマッチング結果を確定シフトとして保存
                            handleConfirmShiftsForDate(selectedDate, shifts);
                          }}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center space-x-2"
                        >
                          <Brain className="w-4 h-4" />
                          <span>AIマッチング結果を確定する</span>
                        </button>
                      </div>
                    );
                  }
                  
                  
                  // 確定シフトがない日で、希望または募集がある場合のみボタンを表示
                  if (dayAssignedShifts.length === 0 && (dayRequests.length > 0 || dayPostings.length > 0)) {
                    // 選択された日付のマッチング結果を取得
                    const dayMatches = aiMatchesByDate[selectedDate] || [];
                    
                    return (
                      <div className="p-4 border-b border-gray-200 space-y-3">
                        {/* マッチング結果表示 */}
                        {dayMatches.length > 0 && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <Brain className="w-4 h-4 text-purple-600" />
                              <h4 className="text-sm font-semibold text-gray-800">マッチング結果</h4>
                              <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                                {dayMatches.length}件
                              </span>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                            {dayMatches.map((match, index) => (
                              <div key={index} className="bg-white rounded border p-2 text-xs">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-800">
                                      {userProfiles[match.pharmacist.id]?.name || 'Unknown'} → {userProfiles[match.pharmacy.id]?.name || 'Unknown'}
                                    </div>
                                    <div className="text-gray-600">
                                      {match.timeSlot.start} - {match.timeSlot.end}
                                    </div>
                                    {/* 薬局名と店舗名を表示 */}
                                    <div className="text-gray-500 text-xs">
                                      薬局: {userProfiles[match.pharmacy.id]?.name || 'Unknown'}
                                      {match.pharmacy.name && match.pharmacy.name !== 'Unknown' && ` / 店舗: ${match.pharmacy.name}`}
                                    </div>
                                  </div>
                                  <div className="text-right ml-2">
                                    <div className="text-purple-600 font-medium mb-1">
                                      {Math.round(match.compatibilityScore * 100)}%
                                    </div>
                                    <button
                                      onClick={() => handleConfirmSingleMatch(match, selectedDate)}
                                      className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                                    >
                                      確定
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            </div>
                          </div>
                        )}

                        {/* 不足薬局一覧（マッチング結果がない場合も表示） */}
                        {dayShortageAnalysis.length > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <h4 className="text-sm font-semibold text-red-800">不足薬局 {dayShortageAnalysis.length}薬局</h4>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {dayShortageAnalysis.map((pharmacy, index) => {
                                const availablePharmacists = Object.values(userProfiles || {}).filter((profile: any) => {
                                  return profile?.user_type === 'pharmacist';
                                });
                                
                                return (
                                  <div key={index} className="bg-white rounded border p-2 text-xs">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <div className="font-medium text-gray-800">
                                          {pharmacy.name}{pharmacy.store_name ? `（${pharmacy.store_name}）` : ''}
                                        </div>
                                        <div className="text-gray-600 mt-1">
                                          必要: {pharmacy.required}人 / マッチ: {pharmacy.matched}人
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-red-600 font-medium">
                                          不足 {pharmacy.shortage}人
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* 手動マッチング選択 */}
                                    {availablePharmacists.length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-gray-200">
                                        <div className="text-xs text-gray-600 mb-1">手動マッチング:</div>
                                        <div className="space-y-1">
                                          {Array.from({ length: pharmacy.shortage }).map((_, shortageIndex) => (
                                            <div key={shortageIndex} className="flex items-center space-x-2">
                                              <span className="text-xs text-gray-500 w-12">
                                                {shortageIndex + 1}人目:
                                              </span>
                                              <select
                                                value={manualMatches[pharmacy.id]?.[shortageIndex] || ''}
                                                onChange={(e) => {
                                                  const newMatches = { ...manualMatches };
                                                  if (!newMatches[pharmacy.id]) {
                                                    newMatches[pharmacy.id] = [];
                                                  }
                                                  newMatches[pharmacy.id][shortageIndex] = e.target.value;
                                                  setManualMatches(newMatches);
                                                }}
                                                className="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
                                              >
                                                <option value="">薬剤師を選択してください</option>
                                                {availablePharmacists.map((pharmacist: any, pharmacistIndex: number) => (
                                                  <option 
                                                    key={pharmacistIndex} 
                                                    value={pharmacist.id}
                                                    disabled={manualMatches[pharmacy.id]?.includes(pharmacist.id) && manualMatches[pharmacy.id]?.[shortageIndex] !== pharmacist.id}
                                                  >
                                                    {pharmacist.name || `薬剤師${pharmacist.id ? pharmacist.id.slice(-4) : 'unknown'}`}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* 手動マッチング確定ボタン */}
                            {Object.values(manualMatches).some(matches => matches.some(id => id && id !== '')) && (
                              <div className="mt-3 pt-2 border-t border-red-200">
                                <button
                                  onClick={() => saveManualShiftRequests(selectedDate)}
                                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-xs font-medium"
                                >
                                  選択した薬剤師を希望シフトとして保存
                                  <br />
                                  <span className="text-xs opacity-90">（新しいシフト希望が作成されます）</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  }
                  
                  // 確定済みバッジは右パネルに表示を残す
                  if (dayAssignedShifts.length > 0) {
                    return (
                      <div className="p-4 border-b border-gray-200">
                        <div className="bg-green-100 text-green-800 py-2 px-4 rounded-lg text-sm text-center">
                          <span className="font-medium">✓ この日のシフトは確定です</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <div className="p-4 space-y-4">
                  
                  {/* 確定シフト */}
                  {Array.isArray(assigned) && assigned.filter((s: any) => s.date === selectedDate && s.status === 'confirmed').length > 0 && (
                    <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <h4 className="text-sm font-semibold text-green-800">
                            確定シフト ({Array.isArray(assigned) ? assigned.filter((s: any) => s.date === selectedDate && s.status === 'confirmed').length : 0}件)
                          </h4>
                        </div>
                        <button
                          onClick={() => handleCancelConfirmedShifts(selectedDate)}
                          className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg"
                        >
                          確定取り消し
                        </button>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                      {Array.isArray(assigned) && assigned.filter((s: any) => s.date === selectedDate && s.status === 'confirmed').map((shift: any, index: number) => {
                        const pharmacistProfile = userProfiles[shift.pharmacist_id];
                        const pharmacyProfile = userProfiles[shift.pharmacy_id];
                        const isEditing = editingShift?.id === shift.id;
                        
                        // デバッグ用：確定シフトの詳細をログ出力
                        console.log(`確定シフト詳細 (${index + 1}件目):`, {
                          id: shift.id,
                          date: shift.date,
                          time_slot: shift.time_slot,
                          pharmacist_id: shift.pharmacist_id,
                          pharmacy_id: shift.pharmacy_id,
                          store_name: shift.store_name,
                          memo: shift.memo,
                          status: shift.status
                        });
                        
                        // 店舗名を取得（store_name または memo から）
                        const getStoreName = (shift: any) => {
                          const direct = (shift.store_name || '').trim();
                          let fromMemo = '';
                          if (!direct && typeof shift.memo === 'string') {
                            const m = shift.memo.match(/\[store:([^\]]+)\]/);
                            if (m && m[1]) fromMemo = m[1];
                          }
                          return direct || fromMemo || '（店舗名未設定）';
                        };
                        
                        // 評価情報を取得
                        const existingRating = ratings.find(r => r.assigned_shift_id === shift.id);
                        
                        return (
                          <div key={index} className="bg-white rounded border px-2 py-1">
                            {isEditing ? (
                              // 編集モード
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-green-700">編集モード</div>
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={handleSaveShiftEdit}
                                      className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded"
                                    >
                                      保存
                                    </button>
                                    <button
                                      onClick={handleCancelShiftEdit}
                                      className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded"
                                    >
                                      キャンセル
                                    </button>
                                  </div>
                                </div>
                                
                                {/* 薬剤師選択 */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">薬剤師:</label>
                                  <select
                                    value={editForm.pharmacist_id}
                                    onChange={(e) => setEditForm({...editForm, pharmacist_id: e.target.value})}
                                    className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                                  >
                                    {(() => {
                                      const pharmacists = Object.entries(userProfiles || {})
                                        .filter(([_, profile]: [string, any]) => profile.user_type === 'pharmacist');
                                      return pharmacists.map(([id, profile]: [string, any]) => (
                                        <option key={id} value={id}>
                                          {profile.name || profile.email || '名前未設定'}
                                        </option>
                                      ));
                                    })()}
                                  </select>
                                </div>
                                
                                {/* 薬局選択 */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">薬局:</label>
                                  <select
                                    value={editForm.pharmacy_id}
                                    onChange={(e) => setEditForm({...editForm, pharmacy_id: e.target.value})}
                                    className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                                  >
                                    {(() => {
                                      const pharmacies = Object.entries(userProfiles || {})
                                        .filter(([_, profile]: [string, any]) => profile.user_type === 'pharmacy' || profile.user_type === 'store');
                                      return pharmacies.map(([id, profile]: [string, any]) => (
                                        <option key={id} value={id}>
                                          {profile.name || profile.email || '名前未設定'}
                                        </option>
                                      ));
                                    })()}
                                  </select>
                                </div>
                                
                                {/* 時間帯選択 */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">時間帯:</label>
                                  <select
                                    value={editForm.time_slot}
                                    onChange={(e) => setEditForm({...editForm, time_slot: e.target.value})}
                                    className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                                  >
                                    <option value="morning">午前 (9:00-13:00)</option>
                                    <option value="afternoon">午後 (13:00-18:00)</option>
                                    <option value="full">終日 (9:00-18:00)</option>
                                  </select>
                                </div>
                              </div>
                            ) : (
                              // 表示モード - 1行でシンプルに
                              <div className="flex items-start justify-between">
                                <div className="flex-1 pr-2">
                                  <div className="text-xs text-gray-800 leading-snug break-words">
                                    <div>薬剤師: {pharmacistProfile?.name || pharmacistProfile?.email || '薬剤師未設定'}</div>
                                    <div>薬局: {pharmacyProfile?.name || pharmacyProfile?.email || `薬局${shift.pharmacy_id ? shift.pharmacy_id.slice(-4) : 'unknown'}`}</div>
                                    <div>店舗: {getStoreName(shift)}</div>
                                    
                                    {/* 評価情報表示 */}
                                    {existingRating && (
                                      <div className="mt-1 pt-1 border-t border-gray-200">
                                        <div className="flex items-center space-x-1">
                                          <span className="text-xs text-gray-600">評価:</span>
                                          <div className="flex space-x-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <Star
                                                key={star}
                                                className={`w-3 h-3 ${
                                                  star <= existingRating.rating
                                                    ? 'text-yellow-400 fill-current'
                                                    : 'text-gray-300'
                                                }`}
                                              />
                                            ))}
                                          </div>
                                          <span className="text-xs text-gray-600">
                                            ({existingRating.rating}/5)
                                          </span>
                                        </div>
                                        {existingRating.comment && (
                                          <div className="text-xs text-gray-600 mt-1 bg-gray-50 p-1 rounded">
                                            {existingRating.comment}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-1">
                                    <button
                                      onClick={() => handleEditShift(shift)}
                                      className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                                    >
                                      編集
                                    </button>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 whitespace-nowrap">
                                  {(() => {
                                    // 時間範囲優先表示（DBにあれば）
                                    const s = (shift.start_time || '').toString();
                                    const e = (shift.end_time || '').toString();
                                    if (s && e) {
                                      const fmt = (t: string) => t ? t.slice(0,5) : '00:00';
                                      return `${fmt(s)}-${fmt(e)}`;
                                    }
                                    // 既存スロットから時間範囲を導出
                                    const timeSlot = shift.time_slot;
                                    if (timeSlot === 'morning') return '09:00-13:00';
                                    if (timeSlot === 'afternoon') return '13:00-18:00';
                                    if (timeSlot === 'custom') return 'カスタム時間';
                                    if (timeSlot === 'full' || timeSlot === 'fullday') return '09:00-18:00';
                                    if (timeSlot === 'consult' || timeSlot === 'negotiable') return '要相談';
                                    return timeSlot || '未設定';
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                  
                  {/* シフト募集 */}
                  {(
                    <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-orange-800">
                          募集している薬局 ({(() => {
                            const dayAssigned = Array.isArray(assigned) ? assigned : [];
                            const list = Array.isArray(postings)
                              ? postings.filter((p: any) =>
                                  p.date === selectedDate &&
                                  p.time_slot !== 'consult' &&
                                  p.status !== 'confirmed' &&
                                  !dayAssigned.some((s: any) =>
                                    s.date === p.date &&
                                    s.pharmacy_id === p.pharmacy_id &&
                                    s.status === 'confirmed'
                                  )
                                )
                              : [];
                            return list.length;
                          })()}件)
                        </h4>
                      </div>
                      {/* 追加ボタン */}
                      <div className="mb-3">
                        <button 
                          onClick={() => setShowAddForms({...showAddForms, posting: !showAddForms.posting})}
                          className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded"
                        >
                          {showAddForms.posting ? 'フォームを閉じる' : '募集を追加'}
                        </button>
                      </div>
                      
                      {/* 追加フォーム */}
                      {showAddForms.posting && (
                        <div className="mb-3 bg-white border rounded p-2">
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              className="text-xs border rounded px-2 py-1"
                              value={newPosting.pharmacy_id}
                              onChange={(e) => setNewPosting({ ...newPosting, pharmacy_id: e.target.value, store_name: '' })}
                            >
                              <option value="">薬局を選択</option>
                              {Object.entries(userProfiles || {})
                                .filter(([_, profile]: [string, any]) => (profile as any).user_type === 'pharmacy' || (profile as any).user_type === 'store')
                                .map(([id, profile]: [string, any]) => (
                                  <option key={id} value={id}>{(profile as any).name || (profile as any).email}</option>
                                ))}
                            </select>
                            <select
                              className="text-xs border rounded px-2 py-1"
                              value={newPosting.store_name}
                              onChange={(e) => setNewPosting({ ...newPosting, store_name: e.target.value })}
                            >
                              <option value="">店舗名を選択</option>
                              {newPosting.pharmacy_id && userProfiles[newPosting.pharmacy_id]?.store_names ? (
                                userProfiles[newPosting.pharmacy_id].store_names.map((storeName: string, index: number) => (
                                  <option key={index} value={storeName}>{storeName}</option>
                                ))
                              ) : (
                                <>
                                  <option value="本店">本店</option>
                                  <option value="支店A">支店A</option>
                                  <option value="支店B">支店B</option>
                                  <option value="その他">その他</option>
                                </>
                              )}
                            </select>
                            <input
                              id="new-posting-start-time"
                              name="new-posting-start-time"
                              className="text-xs border rounded px-2 py-1"
                              type="time"
                              value={newPosting.start_time}
                              onChange={(e) => setNewPosting({ ...newPosting, start_time: e.target.value })}
                              placeholder="開始時間"
                            />
                            <input
                              id="new-posting-end-time"
                              name="new-posting-end-time"
                              className="text-xs border rounded px-2 py-1"
                              type="time"
                              value={newPosting.end_time}
                              onChange={(e) => setNewPosting({ ...newPosting, end_time: e.target.value })}
                              placeholder="終了時間"
                            />
                            <input
                              id="new-posting-required-staff"
                              name="new-posting-required-staff"
                              className="text-xs border rounded px-2 py-1"
                              type="number"
                              min={1}
                              value={newPosting.required_staff}
                              onChange={(e) => setNewPosting({ ...newPosting, required_staff: e.target.value })}
                              placeholder="必要人数"
                            />
                            <input
                              id="new-posting-memo"
                              name="new-posting-memo"
                              className="text-xs border rounded px-2 py-1"
                              value={newPosting.memo}
                              onChange={(e) => setNewPosting({ ...newPosting, memo: e.target.value })}
                              placeholder="メモ（任意）"
                            />
                          </div>
                          <div className="mt-2">
                            <button onClick={handleAddPosting} className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded">追加</button>
                          </div>
                        </div>
                      )}
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                      {(() => {
                        const dayAssigned = Array.isArray(assigned) ? assigned : [];
                        const list = Array.isArray(postings)
                          ? postings.filter((p: any) =>
                              p.date === selectedDate &&
                              p.time_slot !== 'consult' &&
                              p.status !== 'confirmed' &&
                              !dayAssigned.some((s: any) =>
                                s.date === p.date &&
                                s.pharmacy_id === p.pharmacy_id &&
                                s.status === 'confirmed'
                              )
                            )
                          : [];
                        return list.map((posting: any, index: number) => {
                          const pharmacyProfile = userProfiles[posting.pharmacy_id];
                          const isEditing = editingPostingId === posting.id;
                          // 店舗名を取得（store_name または memo から）
                          const getStoreName = (posting: any) => {
                            const direct = (posting.store_name || '').trim();
                            let fromMemo = '';
                            if (!direct && typeof posting.memo === 'string') {
                              const m = posting.memo.match(/\[store:([^\]]+)\]/);
                              if (m && m[1]) fromMemo = m[1];
                            }
                            return direct || fromMemo || '（店舗名未設定）';
                          };
                          return (
                            <div key={index} className="bg-white rounded border px-2 py-1">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <select
                                      className="text-xs border rounded px-2 py-1"
                                      value={postingEditForm.time_slot}
                                      onChange={(e) => setPostingEditForm({ ...postingEditForm, time_slot: e.target.value })}
                                    >
                                      <option value="morning">午前</option>
                                      <option value="afternoon">午後</option>
                                      <option value="full">終日</option>
                                    </select>
                                    <input
                                      className="text-xs border rounded px-2 py-1"
                                      type="number"
                                      min={1}
                                      value={postingEditForm.required_staff}
                                      onChange={(e) => setPostingEditForm({ ...postingEditForm, required_staff: e.target.value })}
                                      placeholder="必要人数"
                                    />
                                    <input
                                      className="text-xs border rounded px-2 py-1"
                                      value={postingEditForm.store_name}
                                      onChange={(e) => setPostingEditForm({ ...postingEditForm, store_name: e.target.value })}
                                      placeholder="店舗名（任意）"
                                    />
                                    <input
                                      className="text-xs border rounded px-2 py-1"
                                      value={postingEditForm.memo}
                                      onChange={(e) => setPostingEditForm({ ...postingEditForm, memo: e.target.value })}
                                      placeholder="メモ（任意）"
                                    />
                                  </div>
                                  <div className="text-right space-x-1">
                                    <button onClick={() => saveEditPosting(posting.id)} className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded">保存</button>
                                    <button onClick={() => setEditingPostingId(null)} className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded">キャンセル</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 pr-2">
                                    <div className="text-xs text-gray-800 leading-snug break-words">
                                      {pharmacyProfile?.name || pharmacyProfile?.email || '薬局未設定'} ({getStoreName(posting)})
                                    </div>
                                    <div className="text-[11px] text-gray-500 mt-0.5">
                                      {(() => {
                                        const s = (posting.start_time || '').toString();
                                        const e = (posting.end_time || '').toString();
                                        if (s && e) return `${s.slice(0,5)}-${e.slice(0,5)}`;
                                        if (posting.time_slot === 'morning') return '09:00-13:00';
                                        if (posting.time_slot === 'afternoon') return '13:00-18:00';
                                        if (posting.time_slot === 'full' || posting.time_slot === 'fullday') return '09:00-18:00';
                                        return '要相談';
                                      })()}
                                    </div>
                                    <div className="mt-1 space-x-1">
                                      <button onClick={() => beginEditPosting(posting)} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded">編集</button>
                                      <button onClick={() => deletePosting(posting.id)} className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded">削除</button>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500 whitespace-nowrap">
                                    {posting.required_staff}人
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                      </div>
                    </div>
                  )}
                  
                  {/* シフト希望 */}
                  {(
                    <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-blue-800">
                          応募している薬剤師 ({Array.isArray(requests) ? requests.filter((r: any) => r.date === selectedDate && r.time_slot !== 'consult').length : 0}件)
                        </h4>
                      </div>
                      {/* 追加ボタン */}
                      <div className="mb-3">
                        <button 
                          onClick={() => setShowAddForms({...showAddForms, request: !showAddForms.request})}
                          className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded"
                        >
                          {showAddForms.request ? 'フォームを閉じる' : '希望を追加'}
                        </button>
                      </div>
                      
                      {/* 追加フォーム */}
                      {showAddForms.request && (
                        <div className="mb-3 bg-white border rounded p-2">
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              id="new-request-pharmacist"
                              name="new-request-pharmacist"
                              className="text-xs border rounded px-2 py-1"
                              value={newRequest.pharmacist_id}
                              onChange={(e) => setNewRequest({ ...newRequest, pharmacist_id: e.target.value })}
                            >
                              <option value="">薬剤師を選択</option>
                              {Object.entries(userProfiles || {})
                                .filter(([_, profile]: [string, any]) => (profile as any).user_type === 'pharmacist')
                                .map(([id, profile]: [string, any]) => (
                                  <option key={id} value={id}>{(profile as any).name || (profile as any).email}</option>
                                ))}
                            </select>
                            <select
                              id="new-request-priority"
                              name="new-request-priority"
                              className="text-xs border rounded px-2 py-1"
                              value={newRequest.priority}
                              onChange={(e) => setNewRequest({ ...newRequest, priority: e.target.value })}
                            >
                              <option value="high">高</option>
                              <option value="medium">中</option>
                              <option value="low">低</option>
                            </select>
                            <input
                              className="text-xs border rounded px-2 py-1"
                              type="time"
                              value={newRequest.start_time}
                              onChange={(e) => setNewRequest({ ...newRequest, start_time: e.target.value })}
                              placeholder="開始時間"
                            />
                            <input
                              className="text-xs border rounded px-2 py-1"
                              type="time"
                              value={newRequest.end_time}
                              onChange={(e) => setNewRequest({ ...newRequest, end_time: e.target.value })}
                              placeholder="終了時間"
                            />
                          </div>
                          <div className="mt-2">
                            <button onClick={handleAddRequest} className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded">追加</button>
                          </div>
                        </div>
                      )}
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                      {Array.isArray(requests) && requests.filter((r: any) => r.date === selectedDate && r.time_slot !== 'consult').map((request: any, index: number) => {
                        const pharmacistProfile = userProfiles[request.pharmacist_id];
                        
                        // デバッグログ：薬剤師プロフィールの取得状況を確認
                        if (!pharmacistProfile) {
                          console.log('薬剤師プロフィールが見つかりません:', {
                            pharmacist_id: request.pharmacist_id,
                            available_user_ids: Object.keys(userProfiles),
                            userProfiles_count: Object.keys(userProfiles).length
                          });
                        }
                        
                        const isEditing = editingRequestId === request.id;
                        return (
                          <div key={index} className="bg-white rounded border px-2 py-1">
                            {isEditing ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <select
                                    className="text-xs border rounded px-2 py-1"
                                    value={requestEditForm.time_slot}
                                    onChange={(e) => setRequestEditForm({ ...requestEditForm, time_slot: e.target.value })}
                                  >
                                    <option value="morning">午前</option>
                                    <option value="afternoon">午後</option>
                                    <option value="full">終日</option>
                                  </select>
                                  <select
                                    className="text-xs border rounded px-2 py-1"
                                    value={requestEditForm.priority}
                                    onChange={(e) => setRequestEditForm({ ...requestEditForm, priority: e.target.value })}
                                  >
                                    <option value="high">高</option>
                                    <option value="medium">中</option>
                                    <option value="low">低</option>
                                  </select>
                                </div>
                                <div>
                                  <input
                                    type="text"
                                    placeholder="メモ（任意）"
                                    className="w-full text-xs border rounded px-2 py-1"
                                    value={requestEditForm.memo || ''}
                                    onChange={(e) => setRequestEditForm({ ...requestEditForm, memo: e.target.value })}
                                  />
                                </div>
                                <div className="text-right space-x-1">
                                  <button onClick={() => saveEditRequest(request.id)} className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded">保存</button>
                                  <button onClick={() => setEditingRequestId(null)} className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded">キャンセル</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between">
                                <div className="flex-1 pr-2">
                                  <div className="text-xs text-gray-800 leading-snug break-words">
                                    {pharmacistProfile?.name || pharmacistProfile?.email || '薬剤師未設定'}
                                  </div>
                                  <div className="text-[11px] text-gray-500 mt-0.5">
                                    {(() => {
                                      const s = (request.start_time || '').toString();
                                      const e = (request.end_time || '').toString();
                                      if (s && e) return `${s.slice(0,5)}-${e.slice(0,5)}`;
                                      if (request.time_slot === 'morning') return '09:00-13:00';
                                      if (request.time_slot === 'afternoon') return '13:00-18:00';
                                      if (request.time_slot === 'full' || request.time_slot === 'fullday') return '09:00-18:00';
                                      return '要相談';
                                    })()}
                                  </div>
                                  {request.memo && (
                                    <div className="text-[11px] text-gray-600 mt-1 italic">
                                      📝 {request.memo}
                                    </div>
                                  )}
                                  <div className="mt-1 space-x-1">
                                    <button onClick={() => beginEditRequest(request)} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded">編集</button>
                                    <button onClick={() => deleteRequest(request.id)} className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded">削除</button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                  
                  {/* マッチング可能な組み合わせ */}
                  {(() => {
                    // Railwayログ用の関数を定義
                    const logToRailway = (message: string, data?: any) => {
                      console.log(`[RAILWAY_LOG] ${message}`, data ? JSON.stringify(data) : '');
                      if (typeof window !== 'undefined') {
                        fetch('/api/log', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ message, data, timestamp: new Date().toISOString() })
                        }).catch(() => {});
                      }
                    };
                    
                    logToRailway('マッチング分析開始');
                    
                    const dayRequests = Array.isArray(requests) ? requests.filter((r: any) => r.date === selectedDate) : [];
                    const dayPostings = Array.isArray(postings) ? postings.filter((p: any) => p.date === selectedDate) : [];
                    
                    // デバッグ用ログ
                    console.log('=== マッチング分析デバッグ ===');
                    console.log('選択された日付:', selectedDate);
                    console.log('その日の希望:', dayRequests);
                    console.log('その日の募集:', dayPostings);
                    
                    // Railwayログにも送信
                    logToRailway('=== マッチング分析デバッグ ===');
                    logToRailway('選択された日付:', selectedDate);
                    logToRailway('その日の希望:', dayRequests);
                    logToRailway('その日の募集:', dayPostings);
                    
                    // 時間範囲ベースのマッチング状況を分析
                    const matchingAnalysis = [{
                      timeSlot: 'time_range',
                      totalRequired: dayPostings.reduce((sum: number, p: any) => sum + (Number(p.required_staff) || 0), 0),
                      totalAvailable: Array.isArray(dayRequests) ? dayRequests.filter((r: any) => r.start_time && r.end_time).length : 0,
                      totalMatched: 0,
                      shortage: 0,
                      requests: Array.isArray(dayRequests) ? dayRequests.filter((r: any) => r.start_time && r.end_time) : [],
                      postings: dayPostings,
                      matchedPharmacists: [] as any[],
                      matchedPharmacies: [] as any[]
                    }];
                    
                    // マッチング数を計算
                    let matchedCount = 0;
                    const matchedPharmacists = [] as any[];
                    const matchedPharmacies = [] as any[];
                    
                    // 薬剤師を評価順にソート
                    const sortedRequests = Array.isArray(dayRequests) ? dayRequests
                      .filter((r: any) => r.start_time && r.end_time)
                      .sort((a: any, b: any) => {
                        const aRating = getPharmacistRating(a.pharmacist_id);
                        const bRating = getPharmacistRating(b.pharmacist_id);
                        if (aRating !== bRating) return bRating - aRating;
                      const priorityOrder: { [key: string]: number } = { 'high': 3, 'medium': 2, 'low': 1 };
                      return priorityOrder[b.priority] - priorityOrder[a.priority];
                    }) : [];
                    
                    // 各薬局の必要人数を管理
                    const pharmacyNeeds = dayPostings.map((p: any) => ({
                      ...p,
                      remaining: Number(p.required_staff) || 0
                    }));
                    
                    // 優先順位順に薬剤師をマッチング
                    sortedRequests.forEach((request: any) => {
                      const pharmacist = userProfiles[request.pharmacist_id];
                      const pharmacistNg: string[] = Array.isArray(pharmacist?.ng_list) ? pharmacist.ng_list : [];
                      
                      // 利用可能な薬局を探す
                      for (const pharmacyNeed of pharmacyNeeds) {
                        if (pharmacyNeed.remaining <= 0) continue;
                        
                        const pharmacy = userProfiles[pharmacyNeed.pharmacy_id];
                        const pharmacyNg: string[] = Array.isArray(pharmacy?.ng_list) ? pharmacy.ng_list : [];
                        
                        const blockedByPharmacist = pharmacistNg.includes(pharmacyNeed.pharmacy_id);
                        const blockedByPharmacy = pharmacyNg.includes(request.pharmacist_id);
                            
                            // 時間範囲互換性をチェック
                            const rs = request?.start_time;
                            const re = request?.end_time;
                        const ps = pharmacyNeed?.start_time;
                        const pe = pharmacyNeed?.end_time;
                        
                        // 両方に時間範囲がある場合は包含関係で判定
                        let isCompatible = false;
                            if (rs && re && ps && pe) {
                          // 完全包含: 薬剤師の希望が薬局の募集時間をすべて覆う
                          isCompatible = rs <= ps && re >= pe;
                        }
                        
                        if (!blockedByPharmacist && !blockedByPharmacy && isCompatible) {
                              // 右側パネル用のマッチングログ
                          console.log(`✅ 右パネル時間範囲マッチング: 薬剤師(${pharmacist?.name}) ${request.start_time}-${request.end_time} → 薬局(${pharmacy?.name}) ${pharmacyNeed.start_time}-${pharmacyNeed.end_time}`);
                              
                          matchedCount++;
                              matchedPharmacists.push(request);
                          matchedPharmacies.push(pharmacyNeed);
                          pharmacyNeed.remaining--;
                          break;
                          }
                        }
                    });
                    
                    // 結果を更新
                    matchingAnalysis[0].totalMatched = matchedCount;
                    matchingAnalysis[0].shortage = Math.max(0, matchingAnalysis[0].totalRequired - matchedCount);
                    matchingAnalysis[0].matchedPharmacists = matchedPharmacists;
                    matchingAnalysis[0].matchedPharmacies = matchedPharmacies;
                    
                    // デバッグ用ログ
                    console.log('マッチング分析結果:', matchingAnalysis);
                    logToRailway('マッチング分析結果:', matchingAnalysis);
                    
                    return null;
                  })()}
                  
                  {/* 要相談セクション */}
                  {(() => {
                    const dayConsultRequests = Array.isArray(requests) ? requests.filter((r: any) => r.date === selectedDate && r.time_slot === 'consult') : [];
                    if (dayConsultRequests.length === 0) return null;
                    
                    return (
                      <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <h4 className="text-sm font-semibold text-purple-800">
                            要相談 ({dayConsultRequests.length}件)
                          </h4>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {dayConsultRequests.map((request: any) => {
                            const pharmacistProfile = userProfiles[request.pharmacist_id];
                            
                            return (
                              <div key={request.id} className="bg-white rounded border px-2 py-1">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 pr-2">
                                    <div className="text-xs text-gray-800 leading-snug break-words">
                                      {pharmacistProfile?.name || pharmacistProfile?.email || '薬剤師未設定'}
                                    </div>
                                    {request.memo && (
                                      <div className="text-xs text-gray-600 mt-1 italic">
                                        📝 {request.memo}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2 whitespace-nowrap">
                                    <div className="text-xs text-purple-600 font-medium">
                                      相談
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            
            <div className="text-xs text-gray-500">最終更新: {lastUpdated.toLocaleString('ja-JP')}</div>
          </div>
        </div>
      </div>

      {/* ユーザー一覧セクション */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">ユーザー管理</h2>
        
        {(() => {
          const { pharmacies, pharmacists } = getOrganizedUserData();
          
          return (
            <div className="space-y-4">
              {/* 薬局一覧 */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => {
                    console.log('Pharmacies section toggle clicked, current state:', expandedSections.pharmacies);
                    toggleSection('pharmacies');
                  }}
                  className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg flex items-center justify-between"
                >
                  <span className="font-medium text-gray-800">
                    薬局一覧 ({pharmacies.length}件)
                  </span>
                  <span className="text-gray-500">
                    {expandedSections.pharmacies ? '▼' : '▶'}
                  </span>
                </button>
                
                {expandedSections.pharmacies && (
                  <div className="p-4 space-y-3">
                    {pharmacies.length === 0 ? (
                      <div className="text-sm text-gray-500">登録されている薬局はありません</div>
                    ) : (
                      pharmacies.map((pharmacy: any) => (
                        <div key={pharmacy.id} className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            {editingUserId === pharmacy.id ? (
                              <input
                                className="text-sm border rounded px-2 py-1 w-1/2"
                                value={userEditForm.name}
                                onChange={(e) => setUserEditForm({ ...userEditForm, name: e.target.value })}
                              />
                            ) : (
                              <h4 className="font-medium text-gray-800">{pharmacy.name || '名前未設定'}</h4>
                            )}
                            <span className="text-xs text-gray-500">{pharmacy.email}</span>
                          </div>
                          
                          {/* 店舗名 */}
                          <div className="mb-2">
                            <div className="text-xs text-gray-600 mb-1">店舗名:</div>
                            {editingUserId === pharmacy.id ? (
                              <input
                                className="text-xs border rounded px-2 py-1 w-full"
                                placeholder="カンマ区切りで入力 (例: 渋谷,新宿)"
                                value={userEditForm.store_names}
                                onChange={(e) => setUserEditForm({ ...userEditForm, store_names: e.target.value })}
                              />
                            ) : (
                              <div className="text-sm">
                                {pharmacy.store_names && pharmacy.store_names.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {pharmacy.store_names.map((storeName: string, idx: number) => (
                                      <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                        {storeName}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-500">未設定</span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            {editingUserId === pharmacy.id ? (
                              <>
                                <button onClick={() => saveEditUser(pharmacy)} className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded">保存</button>
                                <button onClick={() => setEditingUserId(null)} className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded">キャンセル</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => {
                                  console.log('Edit button clicked for pharmacy:', pharmacy.id);
                                  beginEditUser(pharmacy);
                                }} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">編集</button>
                                <button onClick={() => {
                                  console.log('Delete button clicked for pharmacy:', pharmacy);
                                  alert('削除ボタンがクリックされました: ' + (pharmacy.name || pharmacy.email));
                                  deleteUser(pharmacy);
                                }} className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">削除</button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 薬剤師一覧 */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleSection('pharmacists')}
                  className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg flex items-center justify-between"
                >
                  <span className="font-medium text-gray-800">
                    薬剤師一覧 ({pharmacists.length}件)
                  </span>
                  <span className="text-gray-500">
                    {expandedSections.pharmacists ? '▼' : '▶'}
                  </span>
                </button>
                
                {expandedSections.pharmacists && (
                  <div className="p-4 space-y-3">
                    {pharmacists.length === 0 ? (
                      <div className="text-sm text-gray-500">登録されている薬剤師はありません</div>
                    ) : (
                      pharmacists.map((pharmacist: any) => (
                        <div key={pharmacist.id} className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            {editingUserId === pharmacist.id ? (
                              <input
                                className="text-sm border rounded px-2 py-1 w-1/2"
                                value={userEditForm.name}
                                onChange={(e) => setUserEditForm({ ...userEditForm, name: e.target.value })}
                              />
                            ) : (
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-800">{pharmacist.name || '名前未設定'}</h4>
                                {(() => {
                                  const pharmacistRatings = Array.isArray(ratings) ? ratings.filter(r => r.pharmacist_id === pharmacist.id) : [];
                                  if (pharmacistRatings.length > 0) {
                                    const average = pharmacistRatings.reduce((sum, r) => sum + r.rating, 0) / pharmacistRatings.length;
                                    return (
                                      <div className="flex items-center space-x-1">
                                        <div className="flex">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                              key={star}
                                              className={`w-3 h-3 ${
                                                star <= Math.round(average)
                                                  ? 'text-yellow-400 fill-current'
                                                  : 'text-gray-300'
                                              }`}
                                            />
                                          ))}
                                        </div>
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                          {average.toFixed(1)}/5 ({pharmacistRatings.length}件)
                                        </span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <span className="text-xs text-gray-400 px-2 py-1 rounded bg-gray-100">
                                      評価なし
                                    </span>
                                  );
                                })()}
                              </div>
                            )}
                            <span className="text-xs text-gray-500">{pharmacist.email}</span>
                          </div>
                          
                          {/* NG薬局・店舗リスト */}
                          <div>
                            <div className="text-xs text-gray-600 mb-1">NG薬局・店舗:</div>
                            {editingUserId === pharmacist.id ? (
                              <div className="space-y-2">
                                {Object.entries(userProfiles || {})
                                  .filter(([_, profile]: [string, any]) => (profile as any).user_type === 'pharmacy')
                                  .map(([id, profile]: [string, any]) => {
                                    const pharmacyName = (profile as any).name || (profile as any).email || id;
                                    // 薬局全体が選択されているか、または個別店舗が選択されているかをチェック
                                    const isPharmacySelected = userEditForm.ng_list.includes(id);
                                    const hasIndividualStores = userEditForm.ng_list.some((ngId: string) => ngId.startsWith(`${id}_`));
                                    const checked = isPharmacySelected || hasIndividualStores;
                                    
                                    return (
                                      <div key={id} className="border rounded p-2">
                                        <label className="inline-flex items-center gap-1 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            className="accent-red-600"
                                            checked={checked}
                                            onChange={(e) => {
                                              const next = new Set<string>(userEditForm.ng_list);
                                              
                                              if (e.target.checked) {
                                                // 薬局全体を選択する場合
                                                // 1. 薬局IDを追加
                                                next.add(id);
                                                // 2. その薬局の店舗個別選択は削除しない（全店舗選択として扱う）
                                              } else {
                                                // 薬局全体の選択を解除する場合
                                                next.delete(id);
                                                // その薬局の店舗個別選択もすべて削除
                                                const pharmacyProfile = userProfiles[id];
                                                const storeNames = pharmacyProfile?.store_names || ['本店'];
                                                storeNames.forEach((storeName: string) => {
                                                  next.delete(`${id}_${storeName}`);
                                                });
                                              }
                                              
                                              setUserEditForm({ ...userEditForm, ng_list: Array.from(next) });
                                            }}
                                          />
                                          <span className="font-medium">{pharmacyName}</span>
                                        </label>
                                        
                                        {/* 店舗選択 */}
                                        <div className="ml-6 mt-1 space-y-1">
                                          {((profile as any).store_names || ['本店']).map((storeName: string) => {
                                            const storeId = `${id}_${storeName}`;
                                            const isStoreSelected = userEditForm.ng_list.includes(storeId);
                                            const isPharmacySelectedForStore = userEditForm.ng_list.includes(id);
                                            const storeChecked = isStoreSelected;
                                            
                                            return (
                                              <label key={storeId} className="inline-flex items-center gap-1 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  className="accent-red-600"
                                                  checked={storeChecked}
                                                  disabled={false}
                                                  onChange={(e) => {
                                                    const next = new Set<string>(userEditForm.ng_list);
                                                    
                                                    if (e.target.checked) {
                                                      // 店舗を選択する場合
                                                      next.add(storeId);
                                                      // 薬局全体の選択は削除（個別店舗選択が優先）
                                                      next.delete(id);
                                                    } else {
                                                      // 店舗選択を解除する場合
                                                      next.delete(storeId);
                                                      // その薬局の他の店舗が選択されているかチェック
                                                      const otherStoresSelected = ((profile as any).store_names || ['本店'])
                                                        .filter((name: string) => name !== storeName)
                                                        .some((name: string) => next.has(`${id}_${name}`));
                                                      
                                                      // 他の店舗が選択されていない場合、薬局全体の選択も削除
                                                      if (!otherStoresSelected) {
                                                        next.delete(id);
                                                      }
                                                    }
                                                    
                                                    setUserEditForm({ ...userEditForm, ng_list: Array.from(next) });
                                                  }}
                                                />
                                                <span className="text-xs">{storeName}</span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            ) : (
                              <div className="text-sm">
                                {(() => {
                                  // store_ng_pharmaciesテーブルからNG薬局情報を取得
                                  const ngPharmacies = storeNgPharmacies[pharmacist.id] || [];
                                  
                                  // デバッグログ
                                  console.log('NG薬局表示デバッグ:', {
                                    pharmacistId: pharmacist.id,
                                    pharmacistName: pharmacist.name,
                                    ngPharmacies: ngPharmacies,
                                    storeNgPharmacies: storeNgPharmacies,
                                    storeNgPharmaciesKeys: Object.keys(storeNgPharmacies || {}),
                                    allPharmacistIds: Object.keys(userProfiles || {}).filter(id => userProfiles[id]?.user_type === 'pharmacist')
                                  });
                                  
                                  if (ngPharmacies.length === 0) {
                                    return <span className="text-gray-400">NG設定なし</span>;
                                  }
                                  
                                  return (
                                    <div className="space-y-1">
                                      {ngPharmacies.map((ngPharmacy: any, index: number) => {
                                        const pharmacyName = userProfiles[ngPharmacy.pharmacy_id]?.name || 'Unknown';
                                        const storeName = ngPharmacy.store_name || '本店';
                                        return (
                                          <div key={index} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">
                                            {pharmacyName} - {storeName}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            {editingUserId === pharmacist.id ? (
                              <>
                                <button onClick={() => saveEditUser(pharmacist)} className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded">保存</button>
                                <button onClick={() => setEditingUserId(null)} className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded">キャンセル</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => {
                                  console.log('Edit button clicked for pharmacist:', pharmacist.id);
                                  beginEditUser(pharmacist);
                                }} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">編集</button>
                                <button onClick={() => {
                                  console.log('Delete button clicked for pharmacist:', pharmacist);
                                  alert('削除ボタンがクリックされました: ' + (pharmacist.name || pharmacist.email));
                                  deleteUser(pharmacist);
                                }} className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">削除</button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default AdminDashboard;
