'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useNotificationStore } from '@/store/notificationStore';
import { Zap, XSquare, PenSquare, Loader2, AlertTriangle } from 'lucide-react';
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

export function QuickActions() {
  const router = useRouter();
  const notify = useNotificationStore((s) => s.notify);
  const [closingAll, setClosingAll] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const handleQuickBuy = useCallback(() => {
    router.push('/trade');
  }, [router]);

  const handleQuickSell = useCallback(() => {
    router.push('/trade');
  }, [router]);

  const handleNewJournal = useCallback(() => {
    router.push('/trade');
  }, [router]);

  const handleCloseAllPositions = useCallback(async () => {
    setShowCloseConfirm(false);
    setClosingAll(true);
    let successCount = 0;
    let failCount = 0;
    try {
      const res = await fetch('/api/positions', { cache: 'no-store' });
      const data = await res.json();
      const positions = data.positions || [];

      if (positions.length === 0) {
        notify('info', 'No Positions', 'There are no open positions to close.');
        setClosingAll(false);
        return;
      }

      for (const pos of positions) {
        try {
          const closeRes = await fetch(`/api/positions/${pos.id}`, {
            method: 'DELETE',
          });
          if (closeRes.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      if (successCount > 0) {
        notify(
          'position_closed',
          'Positions Closed',
          `Closed ${successCount} position${successCount !== 1 ? 's' : ''} at market.${failCount > 0 ? ` ${failCount} failed.` : ''}`,
        );
      } else {
        notify('error', 'Close Failed', `Failed to close ${failCount} position${failCount !== 1 ? 's' : ''}.`);
      }
    } catch {
      notify('error', 'Close Failed', 'Could not fetch open positions.');
    } finally {
      setClosingAll(false);
    }
  }, [notify]);

  return (
    <>
      <div className='fixed bottom-4 right-4 z-50 flex flex-col gap-2'>
        {/* Quick Buy */}
        <button
          onClick={handleQuickBuy}
          className='flex h-10 w-10 items-center justify-center rounded-full bg-positive text-white shadow-lg transition-all hover:bg-positive/90 hover:shadow-xl focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
          title='Quick Buy — go to Trade page (Ctrl+B)'
          aria-label='Quick buy'
        >
          <Zap className='h-4 w-4' />
        </button>

        {/* Quick Sell */}
        <button
          onClick={handleQuickSell}
          className='flex h-10 w-10 items-center justify-center rounded-full bg-negative text-white shadow-lg transition-all hover:bg-negative/90 hover:shadow-xl focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
          title='Quick Sell — go to Trade page (Ctrl+S)'
          aria-label='Quick sell'
        >
          <Zap className='h-4 w-4 rotate-180' />
        </button>

        {/* Close All Positions */}
        <button
          onClick={() => setShowCloseConfirm(true)}
          disabled={closingAll}
          className='flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg transition-all hover:bg-amber-500/90 hover:shadow-xl disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
          title='Close all open positions'
          aria-label='Close all open positions'
        >
          {closingAll ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <XSquare className='h-4 w-4' />
          )}
        </button>

        {/* New Journal Entry */}
        <button
          onClick={handleNewJournal}
          className='flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-all hover:bg-accent/90 hover:shadow-xl focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
          title='New journal entry — go to Trade page'
          aria-label='New journal entry'
        >
          <PenSquare className='h-4 w-4' />
        </button>
      </div>

      {/* Close All Confirmation Dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent className='max-w-sm'>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2 text-amber-500'>
              <AlertTriangle className='h-5 w-5' />
              Close All Positions?
            </AlertDialogTitle>
            <AlertDialogDescription className='space-y-1'>
              <p>
                This will close every open position at market price. Each
                position is settled individually and P&amp;L is realized.
              </p>
              <p className='pt-1 text-xs text-muted-foreground'>
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='border-border text-xs'>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseAllPositions}
              className='bg-amber-500 text-xs text-white hover:bg-amber-500/90'
            >
              <XSquare className='mr-1 h-3.5 w-3.5' />
              Close All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
