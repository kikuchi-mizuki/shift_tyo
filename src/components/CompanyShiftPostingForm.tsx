import React, { useState } from 'react';
import { Plus, Calendar, Clock, Users, DollarSign, MapPin, FileText, Trash2 } from 'lucide-react';
import { ShiftPosting } from '../types';

interface CompanyShiftPostingFormProps {
  onSubmitPosting: (postings: Omit<ShiftPosting, 'id' | 'status' | 'createdAt'>[]) => void;
  currentCompanyId: string;
  currentMonth: number;
  currentYear: number;
}

export const CompanyShiftPostingForm: React.FC<CompanyShiftPostingFormProps> = ({
  onSubmitPosting,
  currentCompanyId,
  currentMonth,
  currentYear
}) => {
  const [postings, setPostings] = useState<Omit<ShiftPosting, 'id' | 'status' | 'createdAt'>[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [requiredPeople, setRequiredPeople] = useState(1);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState(2000);
  const [task, setTask] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const timeSlots = [
    { value: 'morning', label: '朝 (6:00-10:00)', icon: '🌅' },
    { value: 'afternoon', label: '昼 (10:00-18:00)', icon: '☀️' },
    { value: 'evening', label: '夕 (18:00-22:00)', icon: '🌆' },
    { value: 'night', label: '夜 (22:00-6:00)', icon: '🌙' }
  ];

  const availableSkills = [
    'プログラミング', 'Webデザイン', 'データ分析', 'マーケティング', 
    'SNS運用', 'コンテンツ制作', '翻訳', '通訳', '営業サポート', 
    '経理', '人事', 'プロジェクト管理', 'カスタマーサポート'
  ];

  const addPosting = () => {
    if (!selectedDate || !task || !location) return;

    const newPosting = {
      companyId: currentCompanyId,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      requiredPeople,
      requiredSkills: [...requiredSkills],
      hourlyRate,
      task,
      location,
      notes: notes.trim() || undefined
    };

    setPostings([...postings, newPosting]);
    setSelectedDate('');
    setTask('');
    setLocation('');
    setNotes('');
    setRequiredSkills([]);
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

  const toggleSkill = (skill: string) => {
    setRequiredSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="flex items-center space-x-3">
          <Plus className="w-6 h-6" />
          <h2 className="text-2xl font-bold">シフト募集登録</h2>
        </div>
      </div>

      <div className="p-6">
        <div className="grid gap-6 mb-6">
          {/* 日付選択 */}
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

          {/* 時間帯選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
              募集時間帯
            </label>
            <div className="grid grid-cols-2 gap-3">
              {timeSlots.map(slot => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => setSelectedTimeSlot(slot.value as any)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    selectedTimeSlot === slot.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="text-lg mb-1">{slot.icon}</div>
                  <div className="font-medium text-sm">{slot.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 必要人数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              必要人数
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={requiredPeople}
              onChange={(e) => setRequiredPeople(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* 時給設定 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-2" />
              時給（円）
            </label>
            <input
              type="number"
              min="1000"
              step="100"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(parseInt(e.target.value) || 2000)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* 必要スキル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              必要スキル
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableSkills.map(skill => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`p-2 text-sm rounded-lg border transition-all duration-200 ${
                    requiredSkills.includes(skill)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          {/* 業務内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              業務内容
            </label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="具体的な業務内容を記入してください"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          {/* 勤務場所 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              勤務場所
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="勤務場所を入力してください"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* 備考 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              備考（任意）
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="特別な要件や注意事項があれば記入してください"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          <button
            onClick={addPosting}
            disabled={!selectedDate || !task || !location}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            募集を追加
          </button>
        </div>

        {/* 追加された募集のリスト */}
        {postings.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">追加済みの募集 ({postings.length}件)</h3>
            <div className="space-y-4 mb-6">
              {postings.map((posting, index) => {
                const timeSlot = timeSlots.find(ts => ts.value === posting.timeSlot);
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
                            <span className="text-lg">{timeSlot?.icon}</span>
                            <span className="text-sm text-gray-600">{timeSlot?.label}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">{posting.requiredPeople}名</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">¥{posting.hourlyRate.toLocaleString()}/時</span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 mb-2">
                          <strong>業務:</strong> {posting.task}
                        </div>
                        <div className="text-sm text-gray-700 mb-2">
                          <strong>場所:</strong> {posting.location}
                        </div>
                        {posting.requiredSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {posting.requiredSkills.map(skill => (
                              <span key={skill} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
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
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all duration-200"
            >
              すべての募集を公開
            </button>
          </div>
        )}
      </div>
    </div>
  );
};