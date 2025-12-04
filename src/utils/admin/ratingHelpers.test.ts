import { describe, it, expect } from 'vitest';
import {
  getPharmacistRating,
  getRatingStars,
  getRatingText,
  getRatingCount,
  PharmacistRating,
} from './ratingHelpers';

const mockRatings: PharmacistRating[] = [
  {
    id: '1',
    pharmacist_id: 'pharmacist-1',
    pharmacy_id: 'pharmacy-1',
    rating: 4.5,
    created_at: '2025-01-01',
  },
  {
    id: '2',
    pharmacist_id: 'pharmacist-1',
    pharmacy_id: 'pharmacy-2',
    rating: 4.0,
    created_at: '2025-01-02',
  },
  {
    id: '3',
    pharmacist_id: 'pharmacist-2',
    pharmacy_id: 'pharmacy-1',
    rating: 3.5,
    created_at: '2025-01-03',
  },
];

describe('ratingHelpers', () => {
  describe('getPharmacistRating', () => {
    it('should return average rating for pharmacist with ratings', () => {
      // (4.5 + 4.0) / 2 = 4.25 → 4.3 (rounded to 1 decimal)
      expect(getPharmacistRating('pharmacist-1', mockRatings)).toBe(4.3);
    });

    it('should return exact rating for pharmacist with single rating', () => {
      expect(getPharmacistRating('pharmacist-2', mockRatings)).toBe(3.5);
    });

    it('should return 0 for pharmacist with no ratings', () => {
      expect(getPharmacistRating('pharmacist-3', mockRatings)).toBe(0);
    });

    it('should return 0 for empty ratings array', () => {
      expect(getPharmacistRating('pharmacist-1', [])).toBe(0);
    });

    it('should handle non-array ratings gracefully', () => {
      expect(getPharmacistRating('pharmacist-1', null as any)).toBe(0);
      expect(getPharmacistRating('pharmacist-1', undefined as any)).toBe(0);
    });

    it('should round to 1 decimal place correctly', () => {
      const ratings: PharmacistRating[] = [
        { id: '1', pharmacist_id: 'p1', pharmacy_id: 'ph1', rating: 4.44, created_at: '2025-01-01' },
        { id: '2', pharmacist_id: 'p1', pharmacy_id: 'ph2', rating: 4.45, created_at: '2025-01-02' },
      ];
      // (4.44 + 4.45) / 2 = 4.445 → 4.4
      expect(getPharmacistRating('p1', ratings)).toBe(4.4);
    });
  });

  describe('getRatingStars', () => {
    it('should round rating to nearest integer', () => {
      expect(getRatingStars(4.4)).toBe(4);
      expect(getRatingStars(4.5)).toBe(5);
      expect(getRatingStars(4.6)).toBe(5);
      expect(getRatingStars(3.4)).toBe(3);
    });

    it('should handle edge cases', () => {
      expect(getRatingStars(0)).toBe(0);
      expect(getRatingStars(5)).toBe(5);
    });
  });

  describe('getRatingText', () => {
    it('should return "未評価" for 0 rating', () => {
      expect(getRatingText(0)).toBe('未評価');
    });

    it('should return "優秀" for rating >= 4.5', () => {
      expect(getRatingText(4.5)).toBe('優秀');
      expect(getRatingText(5.0)).toBe('優秀');
    });

    it('should return "良好" for rating >= 4.0 and < 4.5', () => {
      expect(getRatingText(4.0)).toBe('良好');
      expect(getRatingText(4.4)).toBe('良好');
    });

    it('should return "普通" for rating >= 3.5 and < 4.0', () => {
      expect(getRatingText(3.5)).toBe('普通');
      expect(getRatingText(3.9)).toBe('普通');
    });

    it('should return "やや低い" for rating >= 3.0 and < 3.5', () => {
      expect(getRatingText(3.0)).toBe('やや低い');
      expect(getRatingText(3.4)).toBe('やや低い');
    });

    it('should return "要改善" for rating < 3.0', () => {
      expect(getRatingText(2.9)).toBe('要改善');
      expect(getRatingText(1.0)).toBe('要改善');
    });
  });

  describe('getRatingCount', () => {
    it('should return correct count for pharmacist with ratings', () => {
      expect(getRatingCount('pharmacist-1', mockRatings)).toBe(2);
      expect(getRatingCount('pharmacist-2', mockRatings)).toBe(1);
    });

    it('should return 0 for pharmacist with no ratings', () => {
      expect(getRatingCount('pharmacist-3', mockRatings)).toBe(0);
    });

    it('should return 0 for empty ratings array', () => {
      expect(getRatingCount('pharmacist-1', [])).toBe(0);
    });

    it('should handle non-array ratings gracefully', () => {
      expect(getRatingCount('pharmacist-1', null as any)).toBe(0);
      expect(getRatingCount('pharmacist-1', undefined as any)).toBe(0);
    });
  });
});
