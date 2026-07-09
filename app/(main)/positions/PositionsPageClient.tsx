'use client';

import { useState, useCallback } from 'react';
import { cn, formatUsd, formatPercent, formatNumber } from '@/lib/utils';
import { SideBadge, PnLDisplay, PercentChange, RiskLabel } from '@/lib/color-blind';
import { RotateCcw, XSquare, Layers, CandlestickChart } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useColumns, type ColumnDef } from '@/components/ui/column-chooser';
import type { PositionView } from '@/server/actions/positions';

const POSITION_COLUMNS: ColumnDef[] = [
  { key: 'pair', label: 'Pair' },
  { key: 'side', label: 'Side' },
  { key: 'size', label: 'Size' },
  { key: 'entry', label: 'Entry' },
  { key: 'mark', label: 'Mark' },
  { key: 'pnl', label: 'PnL' },
  { key: 'roe', label: 'ROE' },
  { key: 'liq', label: 'Liq.', defaultTablet: false, defaultMobile: false },
  { key: 'lev', label: 'Lev.', defaultTablet: false, defaultMobile: false },
  { key: 'margin', label: 'Margin', defaultTablet: false, defaultMobile: false },
  { key: 'liqRisk', label: 'Liq. Risk' },
  { key: 'actions', label: '', defaultMobile: true },
];

const LIQ_DANGER_THRESHOLD = 5;
const LIQ_WARNING_THRESHOLD = 15;

export function PositionsPageClient({
  initialPositions,
}: {
  initialPositions: PositionView[];
}) {
  const [positions, setPositions] = useState<PositionView[]>(initialPositions);
  const [loading, setLoading] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/positions', { cache: 'no-store' });
      const data = await res.json();
      if (data.positions) setPositions(data.positions);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClosePosition = async (positionId: string) => {
    setClosingId(positionId);
    try {
      await fetch(`/api/positions/${positionId}`, { method: 'DELETE' });
      await refresh();
    } catch {
      // Silent
    } finally {
      setClosingId(null);
    }
  };

  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const totalUsedMargin = positions.reduce((sum, p) => sum + p.usedMargin, 0);
  const totalPositionSize = positions.reduce((sum, p) => sum + p.positionSizeUsd, 0);

  return (
    <div aria-busy={loading ? 'true' : 'false'}>
      <div className='flex items-center justify-between'>
        <h1 className='font-display text-lg font-semibold tracking-tight text-foreground md:text-xl'>
          Positions
        </h1>
        <button
          onClick={refresh}
          disabled={loading}
          className='flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-panel-raised/50 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
        >
          <RotateCcw className={cn('h-3 w-3', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {positions.length > 0 && (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <Card>
            <CardHeader className='pb-1'>
              <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                Open Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='font-display text-xl font-semibold tabular-nums text-foreground'>
                {positions.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-1'>
              <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                Total Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='font-display text-xl font-semibold tabular-nums text-foreground'>
                {formatUsd(totalPositionSize)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-1'>
              <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                Unrealized PnL
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='font-display text-xl font-semibold tabular-nums'>
                <PnLDisplay value={totalUnrealizedPnl} formatted={formatUsd(totalUnrealizedPnl, { signed: true })} />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-1'>
              <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                Total Margin Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='font-display text-xl font-semibold tabular-nums text-amber-500'>
                {formatUsd(totalUsedMargin)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <PositionsTable
        positions={positions}
        onClose={handleClosePosition}
        closingId={closingId}
      />
    </div>
  );
}

function PositionsTable({
  positions,
  onClose,
  closingId,
}: {
  positions: PositionView[];
  onClose: (id: string) => void;
  closingId: string | null;
}) {
  const { visibleColumns, ColumnChooserButton } = useColumns(POSITION_COLUMNS, 'positions-cols');

  if (positions.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-16'>
        <Layers className='mb-3 h-10 w-10 text-muted-foreground/30' />
        <p className='text-sm text-muted-foreground mb-3'>No open positions</p>
        <Link href='/trade' className='inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground'>
          <CandlestickChart className='h-3.5 w-3.5' />
          Open a Margin Trade
        </Link>
      </div>
    );
  }

  const col = (key: string) => visibleColumns.includes(key);

  return (
    <div className='overflow-x-auto rounded-lg border border-border'>
      <div className='flex items-center justify-end border-b border-border bg-muted/20 px-3 py-1'>
        {ColumnChooserButton}
      </div>
      <table className='w-full text-left text-sm'>
        <thead>
          <tr className='border-b border-border bg-muted/20 text-[11px] text-muted-foreground'>
            {col('pair') && <th className='px-4 py-2.5 font-medium'>Pair</th>}
            {col('side') && <th className='px-4 py-2.5 font-medium'>Side</th>}
            {col('size') && <th className='px-4 py-2.5 font-medium'>Size</th>}
            {col('entry') && <th className='px-4 py-2.5 font-medium'>Entry</th>}
            {col('mark') && <th className='px-4 py-2.5 font-medium'>Mark</th>}
            {col('pnl') && <th className='px-4 py-2.5 font-medium'>PnL</th>}
            {col('roe') && <th className='px-4 py-2.5 font-medium'>ROE</th>}
            {col('liq') && <th className='px-4 py-2.5 font-medium'>Liq.</th>}
            {col('lev') && <th className='px-4 py-2.5 font-medium'>Lev.</th>}
            {col('margin') && <th className='px-4 py-2.5 font-medium'>Margin</th>}
            {col('liqRisk') && <th className='px-4 py-2.5 font-medium'>Liq. Risk</th>}
            {col('actions') && <th className='px-4 py-2.5 font-medium' />}
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            const liqDistance = calculateLiquidationDistance(p.side, p.markPrice, p.liquidationPrice);
            const liqState: 'safe' | 'warning' | 'danger' =
              liqDistance === null ? 'safe'
              : liqDistance <= LIQ_DANGER_THRESHOLD ? 'danger'
              : liqDistance <= LIQ_WARNING_THRESHOLD ? 'warning'
              : 'safe';
            return (
              <tr key={p.id} className='border-b border-border/50 transition-colors hover:bg-panel-raised/30'>
                {col('pair') && <td className='whitespace-nowrap px-4 py-2.5 font-medium text-foreground'>{p.assetSymbol}</td>}
                {col('side') && <td className='whitespace-nowrap px-4 py-2.5'><SideBadge side={p.side} /></td>}
                {col('size') && <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-foreground'>{formatNumber(p.size)}</td>}
                {col('entry') && <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-foreground'>{formatUsd(p.entryPrice)}</td>}
                {col('mark') && <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-foreground'>{formatUsd(p.markPrice)}</td>}
                {col('pnl') && <td className='whitespace-nowrap px-4 py-2.5'><PnLDisplay value={p.unrealizedPnl} formatted={formatUsd(p.unrealizedPnl, { signed: true })} /></td>}
                {col('roe') && <td className='whitespace-nowrap px-4 py-2.5'><PercentChange value={p.roe} formatted={formatPercent(p.roe, { signed: true })} /></td>}
                {col('liq') && <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted-foreground'>{formatUsd(p.liquidationPrice)}</td>}
                {col('lev') && <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted-foreground'>{p.leverage}x</td>}
                {col('margin') && <td className='whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-muted-foreground'>{formatUsd(p.usedMargin)}</td>}
                {col('liqRisk') && <td className='whitespace-nowrap px-4 py-2.5'><RiskLabel state={liqState} distance={liqDistance} /></td>}
                {col('actions') && <td className='px-4 py-2.5'>
                  <button
                    onClick={() => onClose(p.id)}
                    disabled={closingId === p.id}
                    className={cn('flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                      'border-negative/30 text-negative hover:bg-negative/10',
                      closingId === p.id && 'animate-pulse opacity-50')}
                    title='Close position'
                  >
                    <XSquare className='h-3 w-3' />
                    {closingId === p.id ? 'Closing...' : 'Close'}
                  </button>
                </td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function calculateLiquidationDistance(
  side: 'LONG' | 'SHORT',
  markPrice: number,
  liquidationPrice: number,
): number | null {
  if (markPrice === 0 || liquidationPrice === 0) return null;
  if (side === 'LONG') return ((markPrice - liquidationPrice) / markPrice) * 100;
  return ((liquidationPrice - markPrice) / markPrice) * 100;
}
