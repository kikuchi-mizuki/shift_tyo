import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PharmacistRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignedShift: {
    id: string;
    pharmacist_id: string;
    pharmacist_name: string;
    date: string;
    store_name: string;
  };
  pharmacyId: string;
  onSuccess: () => void;
}

export function PharmacistRatingModal({
  isOpen,
  onClose,
  assignedShift,
  pharmacyId,
  onSuccess
}: PharmacistRatingModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError('評価を選択してください');
      return;
    }

    setIsSubmitting(true);

    try {
      // 評価を保存
      const { error: insertError } = await supabase
        .from('pharmacist_ratings')
        .insert({
          pharmacy_id: pharmacyId,
          pharmacist_id: assignedShift.pharmacist_id,
          assigned_shift_id: assignedShift.id,
          rating: rating,
          comment: comment.trim() || null,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        throw insertError;
      }

      console.log('評価を保存しました:', {
        pharmacy_id: pharmacyId,
        pharmacist_id: assignedShift.pharmacist_id,
        rating,
        comment
      });

      // 成功時の処理
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('評価の保存に失敗しました:', err);
      setError(err.message || '評価の保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setHoverRating(0);
    setComment('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">薬剤師を評価する</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* シフト情報 */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="text-sm text-gray-600">
              <span className="font-medium">薬剤師:</span> {assignedShift.pharmacist_name}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">日付:</span> {assignedShift.date}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">店舗:</span> {assignedShift.store_name}
            </div>
          </div>

          {/* 評価 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              評価 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-lg font-semibold text-gray-700">
                  {rating}.0
                </span>
              )}
            </div>
          </div>

          {/* コメント */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              コメント（任意）
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="勤務態度や改善点などを記入してください"
              disabled={isSubmitting}
            />
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* ボタン */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || rating === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '送信中...' : '評価を送信'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
