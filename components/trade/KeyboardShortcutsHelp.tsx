'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { ALLOWED_LEVERAGE } from '@/lib/engine/types';

interface ShortcutEntry {
  keys: string[];
  desc: string;
}

const SHORTCUTS: ShortcutEntry[] = [
  { keys: ['Ctrl', 'B'], desc: 'Buy Market' },
  { keys: ['Ctrl', 'S'], desc: 'Sell Market' },
  { keys: ['Ctrl', 'Enter'], desc: 'Submit order' },
  { keys: ['Ctrl', 'K'], desc: 'Command palette (search assets / pages)' },
  {
    keys: ['1', `${ALLOWED_LEVERAGE.length}`],
    desc: `Select leverage (${ALLOWED_LEVERAGE.join('x, ')}x)`,
  },
  { keys: ['↑'], desc: 'Increase quantity' },
  { keys: ['↓'], desc: 'Decrease quantity' },
  { keys: ['Esc'], desc: 'Dismiss / Close' },
  { keys: ['?'], desc: 'Show shortcuts' },
];

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({
  open,
  onClose,
}: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className='divide-y divide-border/50'>
          {SHORTCUTS.map((s) => (
            <div
              key={s.keys.join('')}
              className='flex items-center justify-between py-2.5 first:pt-0 last:pb-0'
            >
              <span className='text-sm text-foreground'>{s.desc}</span>
              <KbdGroup>
                {s.keys.map((k, i) => (
                  <span key={k} className='flex items-center gap-0.5'>
                    {i > 0 && (
                      <span className='px-0.5 text-[11px] text-muted-foreground'>
                        +
                      </span>
                    )}
                    <Kbd>{k}</Kbd>
                  </span>
                ))}
              </KbdGroup>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
