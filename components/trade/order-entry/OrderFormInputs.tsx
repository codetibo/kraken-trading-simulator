'use client';

import { Wallet } from 'lucide-react';
import { cn, formatUsd, formatNumber } from '@/lib/utils';
import { getOrderTypeConfig, MarketType, OrderSide, OrderType } from '@/lib/engine/types';

interface OrderFormInputsProps {
  marketType: MarketType;
  orderType: OrderType;
  side: OrderSide;
  selectedAsset: string;
  quantity: string;
  limitPrice: string;
  triggerPrice: string;
  trailingOffsetType: 'PERCENT' | 'FIXED';
  trailingOffsetValue: string;
  trailingLimitOffset: string;
  visibleQuantity: string;
  twapDuration: string;
  twapSlices: string;
  secondTriggerPrice: string;
  secondLimitPrice: string;
  cashBalance: number | null;
  assetHolding: number | null;
  onQuantityChange: (v: string) => void;
  onLimitPriceChange: (v: string) => void;
  onTriggerPriceChange: (v: string) => void;
  onTrailingOffsetTypeChange: (v: 'PERCENT' | 'FIXED') => void;
  onTrailingOffsetValueChange: (v: string) => void;
  onTrailingLimitOffsetChange: (v: string) => void;
  onVisibleQuantityChange: (v: string) => void;
  onTwapDurationChange: (v: string) => void;
  onTwapSlicesChange: (v: string) => void;
  onSecondTriggerPriceChange: (v: string) => void;
  onSecondLimitPriceChange: (v: string) => void;
}

function NumericInput({
  value,
  onChange,
  placeholder,
  onKeyDown,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type='number'
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      step='any'
      onKeyDown={onKeyDown}
      className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs tabular-nums text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-accent focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
    />
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className='mb-1 block text-[11px] font-medium text-muted-foreground'>{children}</label>;
}

export function OrderFormInputs({
  marketType, orderType, side, selectedAsset,
  quantity, limitPrice, triggerPrice,
  trailingOffsetType, trailingOffsetValue, trailingLimitOffset,
  visibleQuantity, twapDuration, twapSlices,
  secondTriggerPrice, secondLimitPrice,
  cashBalance, assetHolding,
  onQuantityChange, onLimitPriceChange, onTriggerPriceChange,
  onTrailingOffsetTypeChange, onTrailingOffsetValueChange, onTrailingLimitOffsetChange,
  onVisibleQuantityChange, onTwapDurationChange, onTwapSlicesChange,
  onSecondTriggerPriceChange, onSecondLimitPriceChange,
}: OrderFormInputsProps) {
  const config = getOrderTypeConfig(orderType);

  return (
    <>
      {/* Quantity */}
      <div className='mb-2'>
        <div className='mb-1 flex items-center justify-between'>
          <FieldLabel>Quantity</FieldLabel>
          {marketType === 'SPOT' && (
            <span className='flex items-center gap-1 text-[11px] text-muted-foreground'>
              <Wallet className='h-3 w-3' />
              {side === 'BUY' ? (
                cashBalance !== null ? <span>Avail: {formatUsd(cashBalance)}</span> : <span>Loading...</span>
              ) : (
                assetHolding !== null ? <span>Avail: {formatNumber(assetHolding)} {selectedAsset.split('/')[0]}</span> : <span>Loading...</span>
              )}
            </span>
          )}
        </div>
        <NumericInput
          value={quantity}
          onChange={onQuantityChange}
          placeholder='0.00'
          onKeyDown={e => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              const current = parseFloat(quantity) || 0;
              const inc = current < 1 ? 0.01 : current < 10 ? 0.1 : current < 100 ? 1 : 10;
              onQuantityChange((current + inc).toFixed(Math.max(2, -Math.floor(Math.log10(inc)))));
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              const current = parseFloat(quantity) || 0;
              const dec = current <= 0.01 ? 0.001 : current <= 0.1 ? 0.01 : current <= 1 ? 0.1 : current <= 10 ? 1 : 10;
              onQuantityChange(Math.max(0, current - dec).toFixed(Math.max(2, -Math.floor(Math.log10(dec)))));
            }
          }}
        />
      </div>

      {/* Limit Price */}
      {config.requiresLimitPrice && (
        <div className='mb-2'>
          <FieldLabel>Limit Price</FieldLabel>
          <NumericInput value={limitPrice} onChange={onLimitPriceChange} placeholder='0.00' />
        </div>
      )}

      {/* Trigger Price */}
      {config.requiresTriggerPrice && (
        <div className='mb-2'>
          <FieldLabel>Trigger Price</FieldLabel>
          <NumericInput value={triggerPrice} onChange={onTriggerPriceChange} placeholder='0.00' />
        </div>
      )}

      {/* Trailing Stop */}
      {config.supportsTrailing && (
        <div className='mb-2 space-y-2'>
          <div>
            <FieldLabel>Offset Type</FieldLabel>
            <div className='flex gap-2'>
              {(['PERCENT', 'FIXED'] as const).map(type => (
                <button
                  key={type}
                  type='button'
                  onClick={() => onTrailingOffsetTypeChange(type)}
                  className={cn(
                    'flex-1 rounded py-1 text-center text-[11px] font-medium transition-colors',
                    'focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                    trailingOffsetType === type
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {type === 'PERCENT' ? '%' : 'Fixed'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Offset {trailingOffsetType === 'PERCENT' ? '(%)' : '(USD)'}</FieldLabel>
            <NumericInput value={trailingOffsetValue} onChange={onTrailingOffsetValueChange} placeholder='0.00' />
          </div>
          {orderType === 'TRAILING_STOP_LIMIT' && (
            <div>
              <FieldLabel>Limit Offset</FieldLabel>
              <NumericInput value={trailingLimitOffset} onChange={onTrailingLimitOffsetChange} placeholder='0.00' />
            </div>
          )}
        </div>
      )}

      {/* Iceberg */}
      {config.requiresVisibleQuantity && (
        <div className='mb-2'>
          <FieldLabel>Visible Quantity</FieldLabel>
          <NumericInput value={visibleQuantity} onChange={onVisibleQuantityChange} placeholder='0.00' />
        </div>
      )}

      {/* TWAP */}
      {config.requiresTwapDuration && (
        <>
          <div className='mb-2'>
            <FieldLabel>Duration (seconds)</FieldLabel>
            <input
              type='number'
              value={twapDuration}
              onChange={e => onTwapDurationChange(e.target.value)}
              placeholder='300'
              className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-accent'
            />
          </div>
          <div className='mb-2'>
            <FieldLabel>Number of Slices</FieldLabel>
            <input
              type='number'
              value={twapSlices}
              onChange={e => onTwapSlicesChange(e.target.value)}
              placeholder='10'
              className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-accent'
            />
          </div>
        </>
      )}

      {/* OCO */}
      {config.requiresSecondTrigger && (
        <>
          <div className='mb-2'>
            <FieldLabel>Second Trigger Price</FieldLabel>
            <NumericInput value={secondTriggerPrice} onChange={onSecondTriggerPriceChange} placeholder='0.00' />
          </div>
          <div className='mb-2'>
            <FieldLabel>Second Limit Price</FieldLabel>
            <NumericInput value={secondLimitPrice} onChange={onSecondLimitPriceChange} placeholder='0.00' />
          </div>
        </>
      )}
    </>
  );
}
