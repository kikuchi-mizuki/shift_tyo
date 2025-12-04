import { describe, it, expect } from 'vitest';
import { safeArray, safeLength, safeObject } from './arrayHelpers';

describe('arrayHelpers', () => {
  describe('safeArray', () => {
    it('should return empty array for null', () => {
      expect(safeArray(null)).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(safeArray(undefined)).toEqual([]);
    });

    it('should return the array as-is if valid', () => {
      const arr = [1, 2, 3];
      expect(safeArray(arr)).toBe(arr);
    });

    it('should return empty array for non-array values', () => {
      expect(safeArray('string' as any)).toEqual([]);
      expect(safeArray(123 as any)).toEqual([]);
      expect(safeArray({} as any)).toEqual([]);
    });
  });

  describe('safeLength', () => {
    it('should return 0 for null', () => {
      expect(safeLength(null)).toBe(0);
    });

    it('should return 0 for undefined', () => {
      expect(safeLength(undefined)).toBe(0);
    });

    it('should return correct length for array', () => {
      expect(safeLength([1, 2, 3])).toBe(3);
      expect(safeLength([])).toBe(0);
    });

    it('should return 0 for non-array values', () => {
      expect(safeLength('string' as any)).toBe(0);
      expect(safeLength(123 as any)).toBe(0);
      expect(safeLength({} as any)).toBe(0);
    });
  });

  describe('safeObject', () => {
    it('should return empty object for null', () => {
      expect(safeObject(null)).toEqual({});
    });

    it('should return empty object for undefined', () => {
      expect(safeObject(undefined)).toEqual({});
    });

    it('should return the object as-is if valid', () => {
      const obj = { a: 1, b: 2 };
      expect(safeObject(obj)).toBe(obj);
    });

    it('should return empty object for non-object values', () => {
      expect(safeObject('string' as any)).toEqual({});
      expect(safeObject(123 as any)).toEqual({});
      expect(safeObject([] as any)).toEqual({});
    });

    it('should handle complex objects', () => {
      const obj = {
        nested: { deep: { value: 42 } },
        array: [1, 2, 3],
        string: 'test'
      };
      expect(safeObject(obj)).toBe(obj);
    });
  });
});
