'use client';

import { Keyboard } from 'lucide-react';

interface OrderEntryHeaderProps {
  selectedAsset: string;
  onShowShortcuts: () => void;
}

export function OrderEntryHeader({ selectedAsset, onShowShortcuts }: OrderEntryHeaderProps) {
  return (
    <div className='flex items-center justify-between border-b border-border px-3 py-2'>
      <h2 className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
        {selectedAsset} — Order Entry
      </h2>
      <button
        onClick={onShowShortcuts}
        className='rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
        title='Keyboard shortcuts (?)'
      >
        <Keyboard className='h-3.5 w-3.5' />
      </button>
    </div>
  );
}
