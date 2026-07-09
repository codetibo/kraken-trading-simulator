'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';

interface OrderSettingsProps {
  orderType: string;
  postOnly: boolean;
  timeInForce: 'GTC' | 'IOC' | 'FOK' | 'GTD';
  triggerType: 'LAST_PRICE' | 'INDEX_PRICE' | 'MARK_PRICE';
  selectedPositionId: string;
  openPositions: Array<{ id: string; assetSymbol: string; side: string; size: number }>;
  onPostOnlyChange: (v: boolean) => void;
  onTimeInForceChange: (v: 'GTC' | 'IOC' | 'FOK' | 'GTD') => void;
  onTriggerTypeChange: (v: 'LAST_PRICE' | 'INDEX_PRICE' | 'MARK_PRICE') => void;
  onSelectedPositionIdChange: (v: string) => void;
  onRefreshPositions: () => Promise<void>;
}

export function OrderSettings({
  orderType, postOnly, timeInForce, triggerType,
  selectedPositionId, openPositions,
  onPostOnlyChange, onTimeInForceChange, onTriggerTypeChange,
  onSelectedPositionIdChange, onRefreshPositions,
}: OrderSettingsProps) {
  return (
    <>
      {/* Post-Only Toggle (LIMIT / ICEBERG families) */}
      {(orderType === 'LIMIT' || orderType === 'ICEBERG') && (
        <div className='mb-2 flex items-center gap-3 rounded-md border border-border/50 p-2.5'>
          <button
            onClick={() => onPostOnlyChange(!postOnly)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors',
              'focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
              postOnly ? 'bg-accent' : 'bg-muted-foreground/30',
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                postOnly ? 'translate-x-[18px]' : 'translate-x-[2px]',
              )}
            />
          </button>
          <div className='flex-1'>
            <p className='text-[11px] font-medium text-foreground'>Post Only</p>
            <p className='text-[11px] text-muted-foreground'>
              Ensures maker-only execution; cancels if would take liquidity
            </p>
          </div>
        </div>
      )}

      {/* Position Selector (SETTLE_POSITION / REDUCE_ONLY) */}
      {(orderType === 'SETTLE_POSITION' || orderType === 'REDUCE_ONLY') && (
        <div className='mb-3'>
          <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>
            {orderType === 'SETTLE_POSITION' ? 'Close Position' : 'Reduce Position'}
          </label>
          <button
            onClick={onRefreshPositions}
            className='mb-1.5 w-full rounded-md border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
          >
            Refresh positions
          </button>
          {openPositions.length === 0 ? (
            <p className='text-[11px] text-muted-foreground'>
              No open positions found. <Link href='/trade' className='text-accent hover:underline'>Go to Trade page</Link>
            </p>
          ) : (
            <div className='space-y-1'>
              {openPositions.map(p => (
                <button
                  key={p.id}
                  onClick={() => onSelectedPositionIdChange(p.id)}
                  className={`w-full rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors ${
                    selectedPositionId === p.id
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-foreground hover:border-accent/50'
                  }`}
                >
                  <span className='font-medium'>{p.assetSymbol}</span>
                  <span className={`ml-1.5 ${p.side === 'LONG' ? 'text-positive' : 'text-negative'}`}>{p.side}</span>
                  <span className='ml-1.5 text-muted-foreground'>{p.size.toFixed(4)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TimeInForce + TriggerType */}
      {(orderType === 'LIMIT' || orderType === 'STOP_LOSS' || orderType === 'TAKE_PROFIT' ||
        orderType === 'STOP_LOSS_LIMIT' || orderType === 'TAKE_PROFIT_LIMIT' || orderType === 'OCO') && (
        <div className='mb-2 grid grid-cols-2 gap-2 rounded-md border border-border/50 p-2.5'>
          <div>
            <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>Time In Force</label>
            <select
              value={timeInForce}
              onChange={e => onTimeInForceChange(e.target.value as 'GTC' | 'IOC' | 'FOK' | 'GTD')}
              className='w-full rounded border border-border bg-background px-1.5 py-1 text-[11px] text-foreground outline-none focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
            >
              <option value='GTC'>GTC</option>
              <option value='IOC'>IOC</option>
              <option value='FOK'>FOK</option>
              <option value='GTD'>GTD</option>
            </select>
          </div>
          <div>
            <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>Trigger Type</label>
            <select
              value={triggerType}
              onChange={e => onTriggerTypeChange(e.target.value as 'LAST_PRICE' | 'INDEX_PRICE' | 'MARK_PRICE')}
              className='w-full rounded border border-border bg-background px-1.5 py-1 text-[11px] text-foreground outline-none focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
            >
              <option value='LAST_PRICE'>Last</option>
              <option value='INDEX_PRICE'>Index</option>
              <option value='MARK_PRICE'>Mark</option>
            </select>
          </div>
        </div>
      )}
    </>
  );
}
