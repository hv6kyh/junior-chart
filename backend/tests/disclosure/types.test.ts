// backend/tests/disclosure/types.test.ts
import {
  DISCLOSURE_TYPES,
  isValidDisclosureType,
  type DisclosureType,
} from '../../src/services/disclosure/types.js';

describe('Disclosure Types', () => {
  test('DISCLOSURE_TYPES에 13개 유형이 정의되어 있다', () => {
    expect(Object.keys(DISCLOSURE_TYPES)).toHaveLength(13);
  });

  test('isValidDisclosureType — 유효한 유형은 true', () => {
    expect(isValidDisclosureType('treasury_stock_acquire')).toBe(true);
    expect(isValidDisclosureType('convertible_bond')).toBe(true);
  });

  test('isValidDisclosureType — 유효하지 않은 유형은 false', () => {
    expect(isValidDisclosureType('unknown_type')).toBe(false);
    expect(isValidDisclosureType('')).toBe(false);
  });
});
