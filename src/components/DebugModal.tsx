import React from 'react';

interface DebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  debugData: any;
  selectedDate: string;
}

const DebugModal: React.FC<DebugModalProps> = ({ isOpen, onClose, debugData, selectedDate }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            デバッグ情報 - {selectedDate}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          {/* マッチング結果のデバッグ情報 */}
          {debugData?.aiMatches && debugData.aiMatches.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-blue-600">
                AIマッチング結果 ({debugData.aiMatches.length}件)
              </h3>
              {debugData.aiMatches.map((match: any, index: number) => (
                <div key={index} className="mb-4 p-3 bg-gray-50 rounded">
                  <h4 className="font-semibold text-green-600 mb-2">
                    マッチ {index + 1}: {match.pharmacist?.name || '薬剤師' + (index + 1)}
                  </h4>
                  
                  {/* 基本情報 */}
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <strong>薬剤師ID:</strong> {match.pharmacist?.id || 'N/A'}
                    </div>
                    <div>
                      <strong>薬局ID:</strong> {match.pharmacy?.id || 'N/A'}
                    </div>
                    <div>
                      <strong>適合スコア:</strong> {match.compatibilityScore || 'N/A'}
                    </div>
                    <div>
                      <strong>理由:</strong> {match.reasons?.join(', ') || 'N/A'}
                    </div>
                  </div>

                  {/* 時間情報 */}
                  <div className="mb-3">
                    <h5 className="font-semibold text-purple-600 mb-2">時間情報</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong>表示時間:</strong> {match.timeSlot?.start || 'N/A'} - {match.timeSlot?.end || 'N/A'}
                      </div>
                      <div>
                        <strong>薬局募集時間:</strong> {match.posting?.start_time || 'N/A'} - {match.posting?.end_time || 'N/A'}
                      </div>
                      <div>
                        <strong>薬剤師希望時間:</strong> {match.request?.start_time || 'N/A'} - {match.request?.end_time || 'N/A'}
                      </div>
                      <div>
                        <strong>薬局ニーズ時間:</strong> {match.pharmacyNeed?.start_time || 'N/A'} - {match.pharmacyNeed?.end_time || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* AIマッチングエンジンのデバッグ情報 */}
                  {match.debugAITimeSlot && (
                    <div className="mb-3">
                      <h5 className="font-semibold text-orange-600 mb-2">AIマッチングエンジン デバッグ</h5>
                      <div className="bg-orange-50 p-3 rounded">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <strong>Posting Start:</strong> {match.debugAITimeSlot.postingStart}
                          </div>
                          <div>
                            <strong>Posting End:</strong> {match.debugAITimeSlot.postingEnd}
                          </div>
                          <div>
                            <strong>Request Start:</strong> {match.debugAITimeSlot.requestStart}
                          </div>
                          <div>
                            <strong>Request End:</strong> {match.debugAITimeSlot.requestEnd}
                          </div>
                          <div>
                            <strong>TimeSlot Start:</strong> {match.debugAITimeSlot.timeSlotStart}
                          </div>
                          <div>
                            <strong>TimeSlot End:</strong> {match.debugAITimeSlot.timeSlotEnd}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 詳細なデバッグ情報 */}
                  {match.debugDetailedInfo && (
                    <div className="mb-3">
                      <h5 className="font-semibold text-red-600 mb-2">詳細デバッグ情報</h5>
                      <div className="bg-red-50 p-3 rounded">
                        <div className="mb-3">
                          <strong>Posting詳細:</strong>
                          <div className="ml-4 text-sm">
                            <div>ID: {match.debugDetailedInfo.posting?.id}</div>
                            <div>薬局ID: {match.debugDetailedInfo.posting?.pharmacy_id}</div>
                            <div>開始時間: {match.debugDetailedInfo.posting?.start_time}</div>
                            <div>終了時間: {match.debugDetailedInfo.posting?.end_time}</div>
                            <div>日付: {match.debugDetailedInfo.posting?.date}</div>
                            <div>店舗名: {match.debugDetailedInfo.posting?.store_name}</div>
                          </div>
                        </div>
                        <div>
                          <strong>Request詳細:</strong>
                          <div className="ml-4 text-sm">
                            <div>ID: {match.debugDetailedInfo.request?.id}</div>
                            <div>薬剤師ID: {match.debugDetailedInfo.request?.pharmacist_id}</div>
                            <div>開始時間: {match.debugDetailedInfo.request?.start_time}</div>
                            <div>終了時間: {match.debugDetailedInfo.request?.end_time}</div>
                            <div>日付: {match.debugDetailedInfo.request?.date}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* その他のデバッグ情報 */}
                  {match.debugPharmacyNeed && (
                    <div className="mb-3">
                      <h5 className="font-semibold text-indigo-600 mb-2">薬局ニーズ デバッグ</h5>
                      <div className="bg-indigo-50 p-3 rounded text-sm">
                        <pre>{JSON.stringify(match.debugPharmacyNeed, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  {match.debugTimeSlotCreation && (
                    <div className="mb-3">
                      <h5 className="font-semibold text-pink-600 mb-2">TimeSlot作成 デバッグ</h5>
                      <div className="bg-pink-50 p-3 rounded text-sm">
                        <pre>{JSON.stringify(match.debugTimeSlotCreation, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  {match.debugFinalTimeSlot && (
                    <div className="mb-3">
                      <h5 className="font-semibold text-teal-600 mb-2">最終TimeSlot デバッグ</h5>
                      <div className="bg-teal-50 p-3 rounded text-sm">
                        <pre>{JSON.stringify(match.debugFinalTimeSlot, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* シフト投稿のデバッグ情報 */}
          {debugData?.shiftPostings && debugData.shiftPostings.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-blue-600">
                シフト投稿 ({debugData.shiftPostings.length}件)
              </h3>
              {debugData.shiftPostings.map((posting: any, index: number) => (
                <div key={index} className="mb-3 p-3 bg-gray-50 rounded">
                  <div className="grid grid-cols-2 gap-4">
                    <div><strong>ID:</strong> {posting.id}</div>
                    <div><strong>薬局ID:</strong> {posting.pharmacy_id}</div>
                    <div><strong>開始時間:</strong> {posting.start_time}</div>
                    <div><strong>終了時間:</strong> {posting.end_time}</div>
                    <div><strong>日付:</strong> {posting.date}</div>
                    <div><strong>店舗名:</strong> {posting.store_name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* シフトリクエストのデバッグ情報 */}
          {debugData?.shiftRequests && debugData.shiftRequests.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-blue-600">
                シフトリクエスト ({debugData.shiftRequests.length}件)
              </h3>
              {debugData.shiftRequests.map((request: any, index: number) => (
                <div key={index} className="mb-3 p-3 bg-gray-50 rounded">
                  <div className="grid grid-cols-2 gap-4">
                    <div><strong>ID:</strong> {request.id}</div>
                    <div><strong>薬剤師ID:</strong> {request.pharmacist_id}</div>
                    <div><strong>開始時間:</strong> {request.start_time}</div>
                    <div><strong>終了時間:</strong> {request.end_time}</div>
                    <div><strong>日付:</strong> {request.date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 生のデバッグデータ */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-600">
              生のデバッグデータ
            </h3>
            <div className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
              <pre>{JSON.stringify(debugData, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugModal;
