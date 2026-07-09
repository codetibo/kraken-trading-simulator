'use client';

import { cn } from '@/lib/utils';
import { OrderSide } from '@/lib/engine/types';
import { Kbd } from '@/components/ui/kbd';

interface SideSelectorProps {
  side: OrderSide;
  onSideChange: (v: OrderSide) => void;
}

export function SideSelector({ side, onSideChange }: SideSelectorProps) {
  return (
    <div className='mb-3 flex gap-2'>
      <button
        onClick={() => onSideChange('BUY')}
        className={cn(
          'flex-1 rounded-md border py-2 text-center text-xs font-semibold uppercase tracking-wide transition-colors',
          'focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
          side === 'BUY'
            ? 'border-positive/30 bg-positive/20 text-positive'
            : 'border-border/50 bg-transparent text-muted-foreground hover:bg-positive/10 hover:text-positive',
        )}
      >
        {side === 'BUY' && <span className='mr-1'>&#10003;</span>}Buy
        <Kbd className='ml-1'>Ctrl+B</Kbd>
      </button>
      <button
        onClick={() => onSideChange('SELL')}
        className={cn(
          'flex-1 rounded-md border py-2 text-center text-xs font-semibold uppercase tracking-wide transition-colors',
          'focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
          side === 'SELL'
            ? 'border-negative/30 bg-negative/20 text-negative'
            : 'border-border/50 bg-transparent text-muted-foreground hover:bg-negative/10 hover:text-negative',
        )}
      >
        {side === 'SELL' && <span className='mr-1'>&#10003;</span>}Sell
        <Kbd className='ml-1'>Ctrl+S</Kbd>
      </button>
    </div>
  );
}
