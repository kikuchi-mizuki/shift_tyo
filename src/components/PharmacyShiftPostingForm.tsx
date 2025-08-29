import React, { useState } from 'react';
import { Plus, Calendar, Clock, Users, DollarSign, MapPin, FileText, Trash2, AlertCircle } from 'lucide-react';
import { ShiftPosting } from '../types';

interface PharmacyShiftPostingFormProps {
  onSubmitPosting: (postings: Omit<ShiftPosting, 'id' | 'status' | 'createdAt'>[]) => void;
  currentPharmacyId: string;
  currentMonth: number;
  currentYear: number;
}

export const PharmacyShiftPostingForm: React.FC<PharmacyShiftPostingFormProps> = ({
  onSubmitPosting,
  currentPharmacyId,
  currentMonth,
  currentYear
}) => {
  const [postings, setPostings] = useState<Omit<ShiftPosting, 'id' | 'status' | 'createdAt'>[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<'morning' | 'afternoon' | 'fullday' | 'negotiable'>('morning');
  const [requiredPeople, setRequiredPeople] = useState(1);
  const [notes, setNotes] = useState('');

  const timeSlots = [
    { value: 'morning', label: '午前 (9:00-13:00)', icon: '🌅', color: 'border-yellow-300 hover:bg-yellow-50' },
    { value: 'afternoon', label: '午後 (13:00-18:00)', icon: '☀️', color: 'border-blue-300 hover:bg-blue-50' },
    { value: 'fullday', label: '終日 (9:00-18:00)', icon: '🌞', color: 'border-orange-300 hover:bg-orange-50' },
    { value: 'negotiable', label: '要相談', icon: '💬', color: 'border-purple-300 hover:bg-purple-50' }
  ];

  const addPosting = () => {
    if (!selectedDate) return;

    const newPosting = {
      pharmacyId: currentPharmacyId,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      requiredPeople,
      hourlyRate: 2800, // デフォルト値
      requirements: [], // 空配列
      notes: notes.trim() || undefined
    };

    setPostings([...postings, newPosting]);
    setSelectedDate('');
    setNotes('');
  };

  const removePosting = (index: number) => {
    setPostings(postings.filter((_, i) => i !== index));
  };

  const submitAllPostings = () => {
    if (postings.length > 0) {
      onSubmitPosting(postings);
      setPostings([]);
    }
  };

  const getDaysInMonth = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    });
  };

  const getTimeSlotInfo = (timeSlot: string) => {
    return timeSlots.find(ts => ts.value === timeSlot) || timeSlots[0];
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="flex items-center space-x-3">
          <Plus className="w-6 h-6" />
          <h2 className="text-2xl font-bold">薬剤師募集登録</h2>
        </div>
        <p className="text-blue-100 mt-2">必要な薬剤師の募集条件を設定してください</p>
      </div>

      <div className="p-6">
        <div className="grid gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              募集日
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">日付を選択してください</option>
              {getDaysInMonth().map(date => {
                const dateObj = new Date(date);
                const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
                return (
                  <option key={date} value={date}>
                    {date} ({dayOfWeek})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
              募集時間帯
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {timeSlots.map(slot => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => setSelectedTimeSlot(slot.value as any)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    selectedTimeSlot === slot.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : `border-gray-200 ${slot.color}`
                  }`}
                >
                  <div className="text-lg mb-1">{slot.icon}</div>
                  <div className="font-medium text-sm">{slot.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 必要人数選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              必要人数
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setRequiredPeople(num)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    requiredPeople === num
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="text-lg mb-1">👥</div>
                  <div className="font-medium text-sm">{num}人</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              備考・特記事項（任意）
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="経験年数の要件、特別な業務内容、その他の条件があれば記入してください"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          <button
            onClick={addPosting}
            disabled={!selectedDate}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            募集を追加
          </button>
        </div>

        {postings.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">追加済みの募集 ({postings.length}件)</h3>
            <div className="space-y-4 mb-6">
              {postings.map((posting, index) => {
                const timeSlotInfo = getTimeSlotInfo(posting.timeSlot);
                return (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">{posting.date}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{timeSlotInfo.icon}</span>
                            <span className="text-sm text-gray-600">{timeSlotInfo.label}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">{posting.requiredPeople}名</span>
                          </div>
                        </div>
                        {posting.notes && (
                          <div className="text-sm text-gray-600">
                            <strong>備考:</strong> {posting.notes}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removePosting(index)}
                        className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={submitAllPostings}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200"
            >
              すべての募集を公開（自動マッチング実行）
            </button>
          </div>
        )}

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <div className="font-medium mb-1">募集登録のポイント</div>
              <ul className="space-y-1 text-xs">
                <li>• 月初に必要な全ての日程を一括登録することをお勧めします</li>
                <li>• 必要な時間帯と人数を明確にしてください</li>
                <li>• NG薬剤師の設定は別途管理画面で行えます</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};export default PharmacyShiftPostingForm;
