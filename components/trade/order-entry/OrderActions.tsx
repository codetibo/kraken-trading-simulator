'use client';
import { Loader2, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { cn, formatUsd, formatNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MarketType, OrderSide, OrderType, PositionSide } from '@/lib/engine/types';

interface OrderActionsProps {
  submitting: boolean;
  result: { success: boolean; message: string } | null;
  showConfirm: boolean;
  orderType: OrderType;
  side: OrderSide;
  marketType: MarketType;
  positionSide: PositionSide;
  selectedAsset: string;
  quantity: string;
  limitPrice: string;
  triggerPrice: string;
  leverage: number;
  cashBalance: number | null;
  assetHolding: number | null;
  canSubmit: boolean;
  onConfirm: () => void;
  onConfirmDialogClose: () => void;
  onConfirmPlace: () => Promise<void>;
}

export function OrderActions({
  submitting, result, showConfirm,
  orderType, side, marketType, positionSide,
  selectedAsset, quantity, limitPrice, triggerPrice, leverage,
  cashBalance, assetHolding, canSubmit,
  onConfirm, onConfirmDialogClose, onConfirmPlace,
}: OrderActionsProps) {
  return (
    <>
      {/* Insufficient holdings warning for SPOT SELL */}
      {marketType === 'SPOT' && side === 'SELL' && assetHolding !== null &&
        parseFloat(quantity || '0') > 0 && parseFloat(quantity) > assetHolding && (
        <div className='mb-2 rounded-md bg-negative/10 px-2.5 py-1.5 text-[11px] text-negative'>
          Insufficient {selectedAsset.split('/')[0]} balance. You have {formatNumber(assetHolding)} {selectedAsset.split('/')[0]}.
        </div>
      )}

      {/* Insufficient cash warning for SPOT BUY */}
      {marketType === 'SPOT' && side === 'BUY' && cashBalance !== null &&
        parseFloat(quantity || '0') > 0 &&
        (() => {
          const refPrice = parseFloat(limitPrice) || 50000;
          const estimatedCost = parseFloat(quantity) * refPrice;
          return estimatedCost > cashBalance ? (
            <div className='mb-2 rounded-md bg-negative/10 px-2.5 py-1.5 text-[11px] text-negative'>
              Insufficient cash. Need {formatUsd(estimatedCost)}, have {formatUsd(cashBalance)}.
            </div>
          ) : null;
        })()
      }

      {/* Result message */}
      {result && (
        <div
          className={cn(
            'mb-2 rounded-md px-2.5 py-1.5 text-xs',
            result.success ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative',
          )}
        >
          {result.message}
          {result.success && (
            <Link
              href='/journal'
              className='mt-1.5 flex items-center gap-1 text-[11px] font-medium text-accent hover:text-accent/80 transition-colors'
            >
              <BookOpen className='h-3 w-3' />
              Journal this trade →
            </Link>
          )}
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={onConfirm}
        disabled={submitting || !quantity || canSubmit === false}
        className={cn(
          'w-full py-2 text-xs font-semibold uppercase tracking-wider',
          side === 'BUY'
            ? 'bg-positive text-white hover:bg-positive/90'
            : 'bg-negative text-white hover:bg-negative/90',
        )}
      >
        {submitting ? (
          <Loader2 className='h-3.5 w-3.5 animate-spin' />
        ) : (
          <span className='flex items-center justify-center gap-1.5'>
            {`${side === 'BUY' ? 'Buy' : 'Sell'} ${orderType.replace(/_/g, ' ')}`}
            <Kbd>Ctrl+Enter</Kbd>
          </span>
        )}
      </Button>

      {/* Order Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={(open) => { if (!open) onConfirmDialogClose(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2'>Confirm Order</AlertDialogTitle>
            <AlertDialogDescription>
              <div className='mt-2 space-y-1.5 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Action</span>
                  <span className={side === 'BUY' ? 'text-positive font-medium' : 'text-negative font-medium'}>
                    {side} {orderType.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Asset</span>
                  <span className='text-foreground font-medium'>{selectedAsset}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Quantity</span>
                  <span className='font-mono text-foreground'>{quantity || '0'}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Market</span>
                  <span className='text-foreground'>{marketType}</span>
                </div>
                {limitPrice && (
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Limit Price</span>
                    <span className='font-mono text-foreground'>{formatUsd(parseFloat(limitPrice))}</span>
                  </div>
                )}
                {triggerPrice && (
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Trigger Price</span>
                    <span className='font-mono text-foreground'>{formatUsd(parseFloat(triggerPrice))}</span>
                  </div>
                )}
                {marketType === 'MARGIN' && (
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Position / Leverage</span>
                    <span className='text-foreground'>{positionSide} {leverage}x</span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='text-xs'>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmPlace}
              className={cn(
                'text-xs',
                side === 'BUY'
                  ? 'bg-positive text-white hover:bg-positive/90'
                  : 'bg-negative text-white hover:bg-negative/90',
              )}
            >
              Place Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
