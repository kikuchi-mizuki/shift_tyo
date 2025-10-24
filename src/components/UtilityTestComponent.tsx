import React, { useState } from 'react';
import { 
  safeArray, 
  safeLength, 
  getMonthName, 
  getDaysInMonth, 
  formatDate, 
  formatTime,
  getMatchingStatus,
  getConsultRequests,
  calculateMonthlyStats,
  validateUserData,
  formatCurrency,
  getStatusColor
} from '../utils/adminUtils';
import { 
  calculateMatchingScore,
  findMatches,
  validateMatch,
  formatMatchResult,
  sortMatchesByScore,
  filterMatchesByScore
} from '../utils/matchingUtils';

const UtilityTestComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<any>({});

  const runAdminUtilsTests = () => {
    const results: any = {};

    // safeArray テスト
    results.safeArray = {
      normal: safeArray([1, 2, 3]),
      null: safeArray(null),
      undefined: safeArray(undefined),
      string: safeArray('not an array')
    };

    // safeLength テスト
    results.safeLength = {
      normal: safeLength([1, 2, 3]),
      null: safeLength(null),
      empty: safeLength([])
    };

    // getMonthName テスト
    results.getMonthName = {
      current: getMonthName(new Date()),
      specific: getMonthName(new Date(2024, 0, 1)) // January 2024
    };

    // getDaysInMonth テスト
    results.getDaysInMonth = {
      current: getDaysInMonth(new Date()),
      february: getDaysInMonth(new Date(2024, 1, 1)) // February 2024
    };

    // formatDate テスト
    results.formatDate = {
      string: formatDate('2024-01-15'),
      date: formatDate(new Date(2024, 0, 15))
    };

    // formatTime テスト
    results.formatTime = {
      normal: formatTime('14:30:00'),
      short: formatTime('14:30'),
      empty: formatTime('')
    };

    // getMatchingStatus テスト
    const mockAssigned = [
      { id: 1, date: '2024-01-15', pharmacist_id: '1', pharmacy_id: '1' }
    ];
    const mockRequests = [
      { id: 1, date: '2024-01-15', pharmacist_id: '1' },
      { id: 2, date: '2024-01-15', pharmacist_id: '2' }
    ];
    const mockPostings = [
      { id: 1, date: '2024-01-15', pharmacy_id: '1' }
    ];

    results.getMatchingStatus = getMatchingStatus('2024-01-15', mockAssigned, mockRequests, mockPostings);

    // getConsultRequests テスト
    const mockRequestsWithConsult = [
      { id: 1, date: '2024-01-15', notes: '通常のリクエスト' },
      { id: 2, date: '2024-01-15', notes: '相談したいことがあります' },
      { id: 3, date: '2024-01-15', notes: '相談対応お願いします' }
    ];

    results.getConsultRequests = getConsultRequests('2024-01-15', mockRequestsWithConsult);

    // calculateMonthlyStats テスト
    results.calculateMonthlyStats = calculateMonthlyStats(mockAssigned, mockRequests, mockPostings);

    // validateUserData テスト
    results.validateUserData = {
      valid: validateUserData({
        name: 'テストユーザー',
        email: 'test@example.com',
        phone: '090-1234-5678'
      }),
      invalid: validateUserData({
        name: '',
        email: 'invalid-email',
        phone: ''
      })
    };

    // formatCurrency テスト
    results.formatCurrency = {
      normal: formatCurrency(1500),
      zero: formatCurrency(0),
      large: formatCurrency(1000000)
    };

    // getStatusColor テスト
    results.getStatusColor = {
      active: getStatusColor('active'),
      error: getStatusColor('error'),
      pending: getStatusColor('pending'),
      unknown: getStatusColor('unknown')
    };

    setTestResults(prev => ({ ...prev, adminUtils: results }));
  };

  const runMatchingUtilsTests = () => {
    const results: any = {};

    // モックデータ
    const mockRequest = {
      start_time: '09:00',
      end_time: '18:00',
      hourly_rate: 1500,
      pharmacist: { address: '東京都渋谷区' }
    };

    const mockPosting = {
      start_time: '09:00',
      end_time: '18:00',
      hourly_rate: 1500,
      pharmacy: { address: '東京都渋谷区' }
    };

    // calculateMatchingScore テスト
    results.calculateMatchingScore = calculateMatchingScore(mockRequest, mockPosting);

    // findMatches テスト
    const mockRequests = [
      { id: 1, pharmacist_id: '1', start_time: '09:00', end_time: '18:00', hourly_rate: 1500, pharmacist: { name: '薬剤師A' } },
      { id: 2, pharmacist_id: '2', start_time: '10:00', end_time: '19:00', hourly_rate: 1600, pharmacist: { name: '薬剤師B' } }
    ];

    const mockPostings = [
      { id: 1, pharmacy_id: '1', start_time: '09:00', end_time: '18:00', hourly_rate: 1500, pharmacy: { name: '薬局A' } },
      { id: 2, pharmacy_id: '2', start_time: '10:00', end_time: '19:00', hourly_rate: 1600, pharmacy: { name: '薬局B' } }
    ];

    const matchingResult = findMatches(mockRequests, mockPostings);
    results.findMatches = matchingResult;

    // validateMatch テスト
    const mockMatch = {
      pharmacist_id: '1',
      pharmacy_id: '1',
      start_time: '09:00',
      end_time: '18:00',
      hourly_rate: 1500
    };

    results.validateMatch = validateMatch(mockMatch);

    // formatMatchResult テスト
    results.formatMatchResult = formatMatchResult(matchingResult);

    // sortMatchesByScore テスト
    const mockMatches = [
      { pharmacist_id: '1', pharmacy_id: '1', score: 85 },
      { pharmacist_id: '2', pharmacy_id: '2', score: 92 },
      { pharmacist_id: '3', pharmacy_id: '3', score: 78 }
    ];

    results.sortMatchesByScore = sortMatchesByScore(mockMatches);

    // filterMatchesByScore テスト
    results.filterMatchesByScore = filterMatchesByScore(mockMatches, 80);

    setTestResults(prev => ({ ...prev, matchingUtils: results }));
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">ユーティリティ関数動作確認</h2>
      
      <div className="flex space-x-4">
        <button
          onClick={runAdminUtilsTests}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          AdminUtils テスト実行
        </button>
        
        <button
          onClick={runMatchingUtilsTests}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          MatchingUtils テスト実行
        </button>
      </div>

      {/* AdminUtils テスト結果 */}
      {testResults.adminUtils && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">AdminUtils テスト結果</h3>
          <div className="space-y-2 text-sm">
            <div><strong>safeArray:</strong> {JSON.stringify(testResults.adminUtils.safeArray)}</div>
            <div><strong>safeLength:</strong> {JSON.stringify(testResults.adminUtils.safeLength)}</div>
            <div><strong>getMonthName:</strong> {JSON.stringify(testResults.adminUtils.getMonthName)}</div>
            <div><strong>getDaysInMonth:</strong> {JSON.stringify(testResults.adminUtils.getDaysInMonth)}</div>
            <div><strong>formatDate:</strong> {JSON.stringify(testResults.adminUtils.formatDate)}</div>
            <div><strong>formatTime:</strong> {JSON.stringify(testResults.adminUtils.formatTime)}</div>
            <div><strong>getMatchingStatus:</strong> {JSON.stringify(testResults.adminUtils.getMatchingStatus)}</div>
            <div><strong>getConsultRequests:</strong> {testResults.adminUtils.getConsultRequests.length}件</div>
            <div><strong>calculateMonthlyStats:</strong> {JSON.stringify(testResults.adminUtils.calculateMonthlyStats)}</div>
            <div><strong>validateUserData:</strong> {JSON.stringify(testResults.adminUtils.validateUserData)}</div>
            <div><strong>formatCurrency:</strong> {JSON.stringify(testResults.adminUtils.formatCurrency)}</div>
            <div><strong>getStatusColor:</strong> {JSON.stringify(testResults.adminUtils.getStatusColor)}</div>
          </div>
        </div>
      )}

      {/* MatchingUtils テスト結果 */}
      {testResults.matchingUtils && (
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-800 mb-4">MatchingUtils テスト結果</h3>
          <div className="space-y-2 text-sm">
            <div><strong>calculateMatchingScore:</strong> {testResults.matchingUtils.calculateMatchingScore}</div>
            <div><strong>findMatches:</strong> {testResults.matchingUtils.findMatches.matches.length}件のマッチ</div>
            <div><strong>validateMatch:</strong> {JSON.stringify(testResults.matchingUtils.validateMatch)}</div>
            <div><strong>formatMatchResult:</strong> {JSON.stringify(testResults.matchingUtils.formatMatchResult)}</div>
            <div><strong>sortMatchesByScore:</strong> {JSON.stringify(testResults.matchingUtils.sortMatchesByScore.map((m: any) => m.score))}</div>
            <div><strong>filterMatchesByScore:</strong> {testResults.matchingUtils.filterMatchesByScore.length}件（スコア80以上）</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UtilityTestComponent;
