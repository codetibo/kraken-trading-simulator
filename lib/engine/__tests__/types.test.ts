import { isValidLeverage, ALLOWED_LEVERAGE } from '../types';

describe('isValidLeverage', () => {
  it('returns true for allowed leverage values', () => {
    for (const lev of ALLOWED_LEVERAGE) {
      expect(isValidLeverage(lev)).toBe(true);
    }
  });

  it('returns false for leverage values below the allowed range', () => {
    expect(isValidLeverage(1)).toBe(false);
    expect(isValidLeverage(0)).toBe(false);
    expect(isValidLeverage(-1)).toBe(false);
  });

  it('returns false for leverage values above the allowed range', () => {
    expect(isValidLeverage(6)).toBe(false);
    expect(isValidLeverage(11)).toBe(false);
    expect(isValidLeverage(100)).toBe(false);
  });

  it('returns false for fractional leverages', () => {
    expect(isValidLeverage(2.5)).toBe(false);
    expect(isValidLeverage(3.14)).toBe(false);
  });

  it('returns false for NaN', () => {
    expect(isValidLeverage(NaN)).toBe(false);
  });

  it('returns false for non-integer values that are close to allowed values', () => {
    // Even if a number is very close to 2, it should be rejected
    expect(isValidLeverage(2.0001)).toBe(false);
  });
});
