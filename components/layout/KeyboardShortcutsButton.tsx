'use client';

import { useState } from 'react';
import { Keyboard } from 'lucide-react';
import { KeyboardShortcutsHelp } from '@/components/trade/KeyboardShortcutsHelp';

export function KeyboardShortcutsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className='flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-panel-raised/50 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
        title='Keyboard shortcuts (Ctrl+K / ?)'
      >
        <Keyboard className='h-3 w-3' />
        <span className='hidden sm:inline'>Shortcuts</span>
      </button>
      <KeyboardShortcutsHelp open={open} onClose={() => setOpen(false)} />
    </>
  );
}
