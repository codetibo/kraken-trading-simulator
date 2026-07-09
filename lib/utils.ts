import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type FormatOptions = { signed?: boolean; decimals?: number };

/**
 * Returns the appropriate number of decimal places for USD price display
 * based on the price magnitude. Small prices (sub-$1 coins like XRP, DOGE)
 * get more precision so their movements are visible.
 */
export function getPriceDecimals(value: number): number {
  const abs = Math.abs(value);
  if (abs === 0) return 2;
  if (abs >= 1_000) return 2;
  if (abs >= 1) return 2;
  if (abs >= 0.01) return 4;
  if (abs >= 0.0001) return 6;
  return 8;
}

export function formatUsd(value: number, options?: FormatOptions): string {
  const abs = Math.abs(value);
  const decimals = options?.decimals ?? getPriceDecimals(value);

  if (abs >= 1_000_000) {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const prefix = options?.signed && value > 0 ? '+' : value < 0 ? '-' : '';
    return prefix + formatter.format(abs);
  }

  const formatted = abs.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const prefix = options?.signed && value > 0 ? '+' : value < 0 ? '-' : '';
  return prefix + formatted;
}

export function formatPercent(value: number, options?: FormatOptions): string {
  const decimals = options?.decimals ?? 2;
  const formatted = `${Math.abs(value).toFixed(decimals)}%`;
  const prefix = options?.signed && value > 0 ? '+' : value < 0 ? '-' : '';
  return prefix + formatted;
}

export function formatNumber(value: number, options?: { decimals?: number }): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: options?.decimals ?? 4,
  });
}
