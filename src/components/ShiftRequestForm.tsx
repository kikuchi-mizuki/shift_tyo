import React, { useState } from 'react';
import { Plus, Calendar, Clock, Star, Trash2 } from 'lucide-react';
import { ShiftRequest } from '../types';

interface ShiftRequestFormProps {
  onSubmitRequest: (requests: Omit<ShiftRequest, 'id' | 'status'>[]) => void;
  currentUserId: string;
  currentMonth: number;
  currentYear: number;
}

export const ShiftRequestForm: React.FC<ShiftRequestFormProps> = ({
  onSubmitRequest,
  currentUserId,
  currentMonth,
  currentYear
}) => {
  const [requests, setRequests] = useState<Omit<ShiftRequest, 'id' | 'status'>[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [selectedPriority, setSelectedPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [notes, setNotes] = useState('');

  const timeSlots = [
    { value: 'morning', label: '朝 (6:00-10:00)', icon: '🌅' },
    { value: 'afternoon', label: '昼 (10:00-18:00)', icon: '☀️' },
    { value: 'evening', label: '夕 (18:00-22:00)', icon: '🌆' },
    { value: 'night', label: '夜 (22:00-6:00)', icon: '🌙' }
  ];

  const priorities = [
    { value: 'high', label: '高優先度', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' },
    { value: 'medium', label: '中優先度', color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200' },
    { value: 'low', label: '低優先度', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' }
  ];

  const addRequest = () => {
    if (!selectedDate) return;

    const newRequest = {
      userId: currentUserId,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      priority: selectedPriority,
      notes: notes.trim() || undefined
    };

    setRequests([...requests, newRequest]);
    setSelectedDate('');
    setNotes('');
  };

  const removeRequest = (index: number) => {
    setRequests(requests.filter((_, i) => i !== index));
  };

  const submitAllRequests = () => {
    if (requests.length > 0) {
      onSubmitRequest(requests);
      setRequests([]);
    }
  };

  const getDaysInMonth = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    });
  };

  const getTimeSlotIcon = (timeSlot: string) => {
    const slot = timeSlots.find(ts => ts.value === timeSlot);
    return slot?.icon || '⏰';
  };

  const getPriorityInfo = (priority: string) => {
    return priorities.find(p => p.value === priority) || priorities[1];
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
        <div className="flex items-center space-x-3">
          <Plus className="w-6 h-6" />
          <h2 className="text-2xl font-bold">シフト希望登録</h2>
        </div>
      </div>

      <div className="p-6">
        <div className="grid gap-6 mb-6">
          {/* 日付選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              希望日
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
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

          {/* 時間帯選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
              希望時間帯
            </label>
            <div className="grid grid-cols-2 gap-3">
              {timeSlots.map(slot => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => setSelectedTimeSlot(slot.value as any)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    selectedTimeSlot === slot.value
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                  }`}
                >
                  <div className="text-lg mb-1">{slot.icon}</div>
                  <div className="font-medium text-sm">{slot.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 優先度選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Star className="w-4 h-4 inline mr-2" />
              優先度
            </label>
            <div className="grid grid-cols-3 gap-3">
              {priorities.map(priority => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => setSelectedPriority(priority.value as any)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    selectedPriority === priority.value
                      ? `${priority.bgColor} border-current`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`font-medium ${selectedPriority === priority.value ? priority.color : 'text-gray-600'}`}>
                    {priority.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              メモ（任意）
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="特別な要望や注意事項があれば記入してください"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-none"
            />
          </div>

          <button
            onClick={addRequest}
            disabled={!selectedDate}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            希望を追加
          </button>
        </div>

        {/* 追加された希望のリスト */}
        {requests.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">追加済みの希望 ({requests.length}件)</h3>
            <div className="space-y-3 mb-6">
              {requests.map((request, index) => {
                const priorityInfo = getPriorityInfo(request.priority);
                const timeSlot = timeSlots.find(ts => ts.value === request.timeSlot);
                return (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{request.date}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{timeSlot?.icon}</span>
                          <span className="text-sm text-gray-600">{timeSlot?.label}</span>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${priorityInfo.bgColor} ${priorityInfo.color}`}>
                          {priorityInfo.label}
                        </div>
                      </div>
                      {request.notes && (
                        <div className="mt-2 text-sm text-gray-600">
                          メモ: {request.notes}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeRequest(index)}
                      className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={submitAllRequests}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200"
            >
              すべての希望を提出
            </button>
          </div>
        )}
      </div>
    </div>
  );
};