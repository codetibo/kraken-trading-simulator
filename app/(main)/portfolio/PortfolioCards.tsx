'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUsd, formatNumber, formatPercent } from '@/lib/utils';
import { SideBadge, PnLDisplay, PercentChange } from '@/lib/color-blind';
import Link from 'next/link';
import { CandlestickChart, Layers, Wallet } from 'lucide-react';
import { useColumns, type ColumnDef } from '@/components/ui/column-chooser';

const HOLDING_COLUMNS: ColumnDef[] = [
  { key: 'asset', label: 'Asset' },
  { key: 'qty', label: 'Quantity' },
  { key: 'price', label: 'Price' },
  { key: 'value', label: 'Value' },
];

const PORTFOLIO_POSITION_COLUMNS: ColumnDef[] = [
  { key: 'pair', label: 'Pair' },
  { key: 'side', label: 'Side' },
  { key: 'size', label: 'Size' },
  { key: 'entry', label: 'Entry' },
  { key: 'mark', label: 'Mark' },
  { key: 'pnl', label: 'PnL' },
  { key: 'roe', label: 'ROE' },
  { key: 'lev', label: 'Lev.', defaultTablet: false, defaultMobile: false },
  { key: 'margin', label: 'Margin', defaultTablet: false, defaultMobile: false },
];

export function HoldingsCard({
  holdings,
}: {
  holdings: Array<{
    assetSymbol: string;
    baseSymbol: string;
    quantity: number;
    currentPrice: number;
    valueUsd: number;
  }>;
}) {
  const { visibleColumns, ColumnChooserButton } = useColumns(HOLDING_COLUMNS, 'portfolio-holdings-cols');
  const col = (key: string) => visibleColumns.includes(key);

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
          Crypto Holdings
          {holdings.length > 0 && (
            <span className='ml-1 font-normal text-muted-foreground/60'>({holdings.length})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        {holdings.length === 0 ? (
          <div className='flex flex-col items-center justify-center px-4 py-10'>
            <Wallet className='mb-3 h-10 w-10 text-muted-foreground/30' />
            <p className='text-sm text-muted-foreground mb-3'>No crypto holdings</p>
            <Link href='/trade' className='inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground'>
              <CandlestickChart className='h-3.5 w-3.5' />
              Buy Crypto
            </Link>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <div className='flex items-center justify-end border-b border-border bg-muted/20 px-3 py-1'>
              {ColumnChooserButton}
            </div>
            <table className='w-full text-left text-sm'>
              <thead>
                <tr className='border-b border-border text-xs text-muted-foreground'>
                  {col('asset') && <th className='px-4 py-2 font-medium'>Asset</th>}
                  {col('qty') && <th className='px-4 py-2 font-medium'>Quantity</th>}
                  {col('price') && <th className='px-4 py-2 font-medium'>Price</th>}
                  {col('value') && <th className='px-4 py-2 font-medium'>Value</th>}
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <tr key={h.assetSymbol} className='border-b border-border/50 transition-colors hover:bg-panel-raised/50'>
                    {col('asset') && <td className='whitespace-nowrap px-4 py-2.5 font-medium text-foreground'>{h.baseSymbol}</td>}
                    {col('qty') && <td className='whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-foreground'>{formatNumber(h.quantity)}</td>}
                    {col('price') && <td className='whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-foreground'>{formatUsd(h.currentPrice)}</td>}
                    {col('value') && <td className='whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-foreground'>{formatUsd(h.valueUsd)}</td>}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className='border-t-2 border-border bg-muted/30'>
                  <td className='px-4 py-2.5 text-xs font-medium text-muted-foreground'>Total</td>
                  <td colSpan={2} />
                  <td className='whitespace-nowrap px-4 py-2.5 font-mono text-sm font-semibold tabular-nums text-foreground'>
                    {formatUsd(holdings.reduce((sum, h) => sum + h.valueUsd, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MarginPositionsCard({
  positions,
}: {
  positions: Array<{
    id: string;
    assetSymbol: string;
    side: string;
    leverage: number;
    size: number;
    entryPrice: number;
    markPrice: number;
    unrealizedPnl: number;
    roe: number;
    usedMargin: number;
  }>;
}) {
  const { visibleColumns, ColumnChooserButton } = useColumns(PORTFOLIO_POSITION_COLUMNS, 'portfolio-margin-cols');
  const col = (key: string) => visibleColumns.includes(key);

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
          Margin Positions
          {positions.length > 0 && (
            <span className='ml-1 font-normal text-muted-foreground/60'>({positions.length})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        {positions.length === 0 ? (
          <div className='flex flex-col items-center justify-center px-4 py-10'>
            <Layers className='mb-3 h-10 w-10 text-muted-foreground/30' />
            <p className='text-sm text-muted-foreground mb-3'>No open margin positions</p>
            <Link href='/trade' className='inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground'>
              <CandlestickChart className='h-3.5 w-3.5' />
              Open a Margin Trade
            </Link>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <div className='flex items-center justify-end border-b border-border bg-muted/20 px-3 py-1'>
              {ColumnChooserButton}
            </div>
            <table className='w-full text-left text-sm'>
              <thead>
                <tr className='border-b border-border text-xs text-muted-foreground'>
                  {col('pair') && <th className='px-4 py-2 font-medium'>Pair</th>}
                  {col('side') && <th className='px-4 py-2 font-medium'>Side</th>}
                  {col('size') && <th className='px-4 py-2 font-medium'>Size</th>}
                  {col('entry') && <th className='px-4 py-2 font-medium'>Entry</th>}
                  {col('mark') && <th className='px-4 py-2 font-medium'>Mark</th>}
                  {col('pnl') && <th className='px-4 py-2 font-medium'>PnL</th>}
                  {col('roe') && <th className='px-4 py-2 font-medium'>ROE</th>}
                  {col('lev') && <th className='px-4 py-2 font-medium'>Lev.</th>}
                  {col('margin') && <th className='px-4 py-2 font-medium'>Margin</th>}
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.id} className='border-b border-border/50 transition-colors hover:bg-panel-raised/50'>
                    {col('pair') && <td className='whitespace-nowrap px-4 py-2.5 font-medium text-foreground'>{p.assetSymbol}</td>}
                    {col('side') && <td className='px-4 py-2.5'><SideBadge side={p.side} /></td>}
                    {col('size') && <td className='whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-foreground'>{formatNumber(p.size)}</td>}
                    {col('entry') && <td className='whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-foreground'>{formatUsd(p.entryPrice)}</td>}
                    {col('mark') && <td className='whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-foreground'>{formatUsd(p.markPrice)}</td>}
                    {col('pnl') && <td className='whitespace-nowrap px-4 py-2.5'><PnLDisplay value={p.unrealizedPnl} formatted={formatUsd(p.unrealizedPnl, { signed: true })} /></td>}
                    {col('roe') && <td className='whitespace-nowrap px-4 py-2.5'><PercentChange value={p.roe} formatted={formatPercent(p.roe, { signed: true })} /></td>}
                    {col('lev') && <td className='whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-muted-foreground'>{p.leverage}x</td>}
                    {col('margin') && <td className='whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-muted-foreground'>{formatUsd(p.usedMargin)}</td>}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className='border-t-2 border-border bg-muted/30'>
                  <td className='px-4 py-2.5 text-xs font-medium text-muted-foreground'>Summary</td>
                  <td colSpan={4} />
                  <td className='whitespace-nowrap px-4 py-2.5'>
                    <PnLDisplay
                      value={positions.reduce((sum, p) => sum + p.unrealizedPnl, 0)}
                      formatted={formatUsd(positions.reduce((sum, p) => sum + p.unrealizedPnl, 0), { signed: true })}
                    />
                  </td>
                  <td colSpan={2} />
                  <td className='whitespace-nowrap px-4 py-2.5 font-mono text-sm font-semibold tabular-nums text-foreground'>
                    {formatUsd(positions.reduce((sum, p) => sum + p.usedMargin, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
