'use client';

import { useEffect } from 'react';
import { ALLOWED_LEVERAGE } from '@/lib/engine/types';

export interface ShortcutHandlers {
  /** Buy Market with current settings. */
  onBuyMarket: () => void;
  /** Sell Market with current settings. */
  onSellMarket: () => void;
  /** Set leverage (receives the leverage value from ALLOWED_LEVERAGE). */
  onSetLeverage: (leverage: number) => void;
  /** Submit the current order form. */
  onSubmit: () => void;
  /** Dismiss dialogs, clear results. */
  onDismiss: () => void;
  /** Toggle the shortcuts help overlay. */
  onToggleHelp: () => void;
  /** Open the command palette (Ctrl+K). */
  onToggleCommandPalette?: () => void;
}

/**
 * Registers global keyboard shortcuts for the trading interface.
 * Only fires when the hook is enabled (e.g., not while typing in inputs).
 *   * Shortcuts:
   *   Ctrl+B  — Buy Market
   *   Ctrl+S  — Sell Market
   *   1–5     — Select leverage (maps to ALLOWED_LEVERAGE indices)
   *   Enter   — Submit order (only when no input/select is focused)
   *   Esc     — Dismiss dialogs / close panels
   *   ?       — Toggle shortcuts help overlay
   *   Ctrl+K  — Open command palette
   */
export function useKeyboardShortcuts(
  handlers: ShortcutHandlers,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isInput =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Ctrl+B — Buy Market
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        handlers.onBuyMarket();
        return;
      }

      // Ctrl+S — Sell Market
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handlers.onSellMarket();
        return;
      }

      // Ctrl+K — Command palette (only when not typing)
      if (e.ctrlKey && e.key === 'k' && !isInput) {
        e.preventDefault();
        handlers.onToggleCommandPalette?.();
        return;
      }

      // ? — Toggle help overlay (only when not typing)
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        handlers.onToggleHelp();
        return;
      }

      // Esc — Dismiss (always works)
      if (e.key === 'Escape') {
        handlers.onDismiss();
        return;
      }

      // Don't handle shortcuts while the user is typing in inputs
      if (isInput) return;

      // Enter — Submit order
      if (e.key === 'Enter') {
        e.preventDefault();
        handlers.onSubmit();
        return;
      }

      // 1–N — Select leverage (maps to ALLOWED_LEVERAGE indices)
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= ALLOWED_LEVERAGE.length) {
        e.preventDefault();
        handlers.onSetLeverage(ALLOWED_LEVERAGE[num - 1]);
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers, enabled]);
}
