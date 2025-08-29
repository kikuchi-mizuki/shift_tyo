import React from 'react';
import { X, Clock, MapPin, DollarSign, User, Building2, Calendar, Star } from 'lucide-react';
import { AssignedShift, User as UserType, Pharmacy } from '../types';

interface ShiftDetailModalProps {
  shift: AssignedShift;
  user: UserType;
  pharmacy: Pharmacy;
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftDetailModal: React.FC<ShiftDetailModalProps> = ({
  shift,
  user,
  pharmacy,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  // 希望のみの場合（薬局未確定）
  const isPendingRequest = shift.pharmacyId === 'pending';

  const getTimeSlotInfo = (timeSlot: string) => {
    const slots = {
      morning: { label: '午前勤務', time: '9:00-13:00', icon: '🌅', color: 'text-yellow-600 bg-yellow-50' },
      afternoon: { label: '午後勤務', time: '13:00-18:00', icon: '☀️', color: 'text-blue-600 bg-blue-50' },
      fullday: { label: '終日勤務', time: '9:00-18:00', icon: '🌞', color: 'text-orange-600 bg-orange-50' },
      negotiable: { label: '要相談', time: '時間応相談', icon: '💬', color: 'text-purple-600 bg-purple-50' }
    };
    return slots[timeSlot as keyof typeof slots] || slots.morning;
  };

  const timeSlotInfo = getTimeSlotInfo(shift.timeSlot);
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${dayOfWeek})`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${timeSlotInfo.color}`}>
              <span className="text-xl">{timeSlotInfo.icon}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isPendingRequest ? `${timeSlotInfo.label}（希望）` : timeSlotInfo.label}
              </h2>
              <p className="text-sm text-gray-600">{formatDate(shift.date)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 基本情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-900">勤務詳細</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">日時:</span>
                  <span className="font-medium">{formatDate(shift.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">時間帯:</span>
                  <span className="font-medium">{timeSlotInfo.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">勤務時間:</span>
                  <span className="font-medium">{shift.duration}時間</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <DollarSign className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-900">報酬・条件</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">時給:</span>
                  <span className="font-medium">¥{shift.hourlyRate.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">予想報酬:</span>
                  <span className="font-semibold text-green-600">
                    ¥{(shift.hourlyRate * shift.duration).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 担当者情報 */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <User className="w-4 h-4 text-green-600" />
              <span className="font-medium text-gray-900">担当薬剤師</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{user.name}</div>
                <div className="text-sm text-gray-600">{user.email}</div>
                {user.specialties && user.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {user.specialties.map(specialty => (
                      <span key={specialty} className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full">
                        {specialty}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 薬局情報 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-gray-900">勤務先薬局</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{pharmacy.name}</div>
                <div className="text-sm text-gray-600">種別: {pharmacy.type === 'hospital' ? '病院薬局' : pharmacy.type === 'retail' ? '調剤薬局' : 'クリニック'}</div>
                <div className="text-sm text-gray-600">{pharmacy.address}</div>
                <div className="text-sm text-gray-600">
                  必要スキル: {pharmacy.requirements.specialties.join(', ')}
                </div>
              </div>
            </div>
          </div>

          {/* 報酬詳細 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Star className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">報酬詳細</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">時給:</span>
                <span className="font-medium ml-2">¥{shift.hourlyRate.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-600">勤務時間:</span>
                <span className="font-medium ml-2">{shift.duration}時間</span>
              </div>
              <div>
                <span className="text-gray-600">予想報酬:</span>
                <span className="font-semibold text-green-600 ml-2">
                  ¥{(shift.hourlyRate * shift.duration).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">ステータス:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  shift.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                  shift.status === 'provisional' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {shift.status === 'confirmed' ? '確定' : 
                   shift.status === 'provisional' ? '仮確定' :
                   '調整中'}
                </span>
              </div>
            </div>
          </div>

          {/* 勤務場所情報 */}
          {pharmacy.address && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <MapPin className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-900">勤務場所</span>
              </div>
              <p className="text-sm text-gray-700">{pharmacy.address}</p>
              <p className="text-sm text-gray-600 mt-1">TEL: {pharmacy.phone}</p>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              シフトID: {shift.id}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};