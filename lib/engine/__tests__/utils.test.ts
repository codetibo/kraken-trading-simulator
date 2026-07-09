import { formatUsd, formatPercent, formatNumber, cn } from '@/lib/utils';

describe('cn', () => {
  it('merges className values correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });
});

describe('formatUsd', () => {
  it('formats a positive number as USD', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.50');
  });

  it('formats a negative number', () => {
    expect(formatUsd(-500)).toBe('-$500.00');
  });

  it('adds a + prefix for signed positive values', () => {
    expect(formatUsd(100, { signed: true })).toBe('+$100.00');
  });

  it('does not add + prefix for signed zero', () => {
    expect(formatUsd(0, { signed: true })).toBe('$0.00');
  });

  it('uses compact notation for large values', () => {
    const result = formatUsd(1_500_000);
    expect(result).toContain('M');
  });

  it('handles zero', () => {
    expect(formatUsd(0)).toBe('$0.00');
  });
});

describe('formatPercent', () => {
  it('formats a positive percentage', () => {
    expect(formatPercent(15.5)).toBe('15.50%');
  });

  it('formats a negative percentage', () => {
    expect(formatPercent(-8.3)).toBe('-8.30%');
  });

  it('adds + prefix for signed values', () => {
    expect(formatPercent(5, { signed: true })).toBe('+5.00%');
  });

  it('handles zero', () => {
    expect(formatPercent(0, { signed: true })).toBe('0.00%');
  });

  it('respects custom decimals', () => {
    expect(formatPercent(12.3456, { decimals: 4 })).toBe('12.3456%');
  });
});

describe('formatNumber', () => {
  it('formats an integer', () => {
    expect(formatNumber(1234)).toBe('1,234');
  });

  it('formats a decimal with default precision', () => {
    expect(formatNumber(1.23456)).toBe('1.2346');
  });

  it('respects custom decimal places', () => {
    expect(formatNumber(1.23456, { decimals: 2 })).toBe('1.23');
  });

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});
