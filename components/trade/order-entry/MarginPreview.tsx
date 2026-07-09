'use client';

import { useMemo } from 'react';
import { cn, formatUsd, formatNumber, formatPercent } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  YAxis,
} from 'recharts';
import { MarketType, PositionSide, DEFAULT_FEE_SCHEDULE } from '@/lib/engine/types';
import {
  calculateRequiredMargin,
  MARGIN_CALL_LEVEL,
  LIQUIDATION_LEVEL,
} from '@/lib/engine/marginEngine';
import { RiskManagementPanel } from '@/components/trade/RiskManagementPanel';

interface MarginPreviewProps {
  marketType: MarketType;
  orderType: string;
  positionSide: PositionSide;
  selectedAsset: string;
  quantity: string;
  limitPrice: string;
  triggerPrice: string;
  leverage: number;
  /** Controlled stop-loss price value from the parent form state. */
  stopLossPrice?: string;
  /** Controlled take-profit price value from the parent form state. */
  takeProfitPrice?: string;
  /** Called when the stop-loss price changes. */
  onStopLossPriceChange?: (v: string) => void;
  /** Called when the take-profit price changes. */
  onTakeProfitPriceChange?: (v: string) => void;
  /** Whether trailing stop is enabled as a conditional order. */
  trailingStopEnabled?: boolean;
  /** Called when the trailing stop enabled toggle changes. */
  onTrailingStopEnabledChange?: (v: boolean) => void;
  /** Controlled trailing stop offset type. */
  trailingOffsetType?: 'PERCENT' | 'FIXED';
  /** Called when the trailing offset type changes. */
  onTrailingOffsetTypeChange?: (v: 'PERCENT' | 'FIXED') => void;
  /** Controlled trailing stop offset value. */
  trailingOffsetValue?: string;
  /** Called when the trailing offset value changes. */
  onTrailingOffsetValueChange?: (v: string) => void;
  /** Controlled trailing stop limit offset (for TRAILING_STOP_LIMIT). */
  trailingLimitOffset?: string;
  /** Called when the trailing limit offset changes. */
  onTrailingLimitOffsetChange?: (v: string) => void;
  /** Cash balance for margin status estimation. */
  cashBalance?: number | null;
  /** Reserved margin for margin status calculation. */
  reservedMargin?: number;
  /** Time In Force for validity period display. */
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'GTD';
  // TP/SL mode and Simple trigger props
  tpSlMode?: 'PRICE' | 'SIMPLE' | 'ADVANCED';
  onTpSlModeChange?: (v: 'PRICE' | 'SIMPLE' | 'ADVANCED') => void;
  simpleTpType?: 'PERCENT' | 'PNL_USD' | 'PRICE';
  onSimpleTpTypeChange?: (v: 'PERCENT' | 'PNL_USD' | 'PRICE') => void;
  simpleTpValue?: string;
  onSimpleTpValueChange?: (v: string) => void;
  simpleSlType?: 'PERCENT' | 'PNL_USD' | 'PRICE';
  onSimpleSlTypeChange?: (v: 'PERCENT' | 'PNL_USD' | 'PRICE') => void;
  simpleSlValue?: string;
  onSimpleSlValueChange?: (v: string) => void;
  // Advanced mode props
  advField1?: 'PROFIT_TAKING' | 'PROFIT_TAKING_LIMIT' | 'LIMIT';
  onAdvField1Change?: (v: 'PROFIT_TAKING' | 'PROFIT_TAKING_LIMIT' | 'LIMIT') => void;
  advField2Type?: 'DISTANCE' | 'PNL';
  onAdvField2TypeChange?: (v: 'DISTANCE' | 'PNL') => void;
  advField2Value?: string;
  onAdvField2ValueChange?: (v: string) => void;
  advField3?: 'STOP_LOSS_DISTANCE' | 'STOP_LOSS_PNL' | 'STOP_LOSS_LIMIT_DISTANCE' | 'STOP_LOSS_LIMIT_PNL' | 'TRAILING_STOP' | 'TRAILING_STOP_LIMIT';
  onAdvField3Change?: (v: 'STOP_LOSS_DISTANCE' | 'STOP_LOSS_PNL' | 'STOP_LOSS_LIMIT_DISTANCE' | 'STOP_LOSS_LIMIT_PNL' | 'TRAILING_STOP' | 'TRAILING_STOP_LIMIT') => void;
  advField3Value?: string;
  onAdvField3ValueChange?: (v: string) => void;
  advField3Extra?: string;
  onAdvField3ExtraChange?: (v: string) => void;
}

function PreviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className='flex items-center justify-between'>
      <span className='text-[11px] text-muted-foreground'>{label}</span>
      <span className='font-mono text-[11px] tabular-nums text-foreground'>{value}</span>
    </div>
  );
}

export function MarginPreview({
  marketType, orderType, positionSide, selectedAsset,
  quantity, limitPrice, triggerPrice, leverage,
  stopLossPrice, takeProfitPrice,
  onStopLossPriceChange, onTakeProfitPriceChange,
  trailingStopEnabled, onTrailingStopEnabledChange,
  trailingOffsetType, onTrailingOffsetTypeChange,
  trailingOffsetValue, onTrailingOffsetValueChange,
  trailingLimitOffset, onTrailingLimitOffsetChange,
  cashBalance,
  reservedMargin: reservedMarginProp = 0,
  timeInForce = 'GTC',
  tpSlMode, onTpSlModeChange,
  simpleTpType, onSimpleTpTypeChange,
  simpleTpValue, onSimpleTpValueChange,
  simpleSlType, onSimpleSlTypeChange,
  simpleSlValue, onSimpleSlValueChange,
  advField1, onAdvField1Change,
  advField2Type, onAdvField2TypeChange,
  advField2Value, onAdvField2ValueChange,
  advField3, onAdvField3Change,
  advField3Value, onAdvField3ValueChange,
  advField3Extra, onAdvField3ExtraChange,
}: MarginPreviewProps) {
  if (!quantity) return null;

  const entry = parseFloat(limitPrice) || 50000;
  const qty = parseFloat(quantity) || 0;

  // ── Computed values ───────────────────────────────────
  const notional = qty * entry;
  const requiredMargin = calculateRequiredMargin(qty, entry, leverage);
  // Estimate equity after this order is placed.
  // `reservedMargin` defaults to 0 since it isn't exposed from the wallet hook yet,
  // so equity ≈ cashBalance + requiredMargin (the margin hasn't been deducted yet).
  const equity =
    cashBalance != null
      ? cashBalance - reservedMarginProp + requiredMargin
      : 10000;
  const marginStatusPct =
    requiredMargin > 0 ? (equity / requiredMargin) * 100 : 0;
  const liqPrice =
    positionSide === 'LONG'
      ? entry * (1 - 1 / leverage + 0.006)
      : entry * (1 + 1 / leverage - 0.006);
  const liqDistPct = ((1 / leverage - 0.006) * 100);
  const takerFeeNotional = notional * (DEFAULT_FEE_SCHEDULE.takerFeeBps / 10000);
  const makerFeeNotional = notional * (DEFAULT_FEE_SCHEDULE.makerFeeBps / 10000);
  // Estimated margin (funding) fee: ~0.01% of position notional per 4 hours
  const marginFeePer4h = notional * 0.0001;
  const marginFeePer24h = marginFeePer4h * 6;

  // ── Simulated funding rate history (last 12 × 4h periods = 48h) ──
  const fundingHistory = useMemo(() => {
    const now = Date.now();
    const data: { time: number; rate: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const hoursAgo = i * 4;
      // Sinusoidal + random noise around ±0.01% to simulate realistic funding
      const base = 0.0001 * Math.sin((now - hoursAgo * 3_600_000) / 3_600_000);
      const noise = (Math.random() - 0.5) * 0.00015;
      data.push({
        time: now - hoursAgo * 3600_000,
        rate: Math.round((base + noise) * 1_000_000) / 1_000_000,
      });
    }
    return data;
  }, []);

  const currentFundingRate = fundingHistory[fundingHistory.length - 1]?.rate ?? 0;
  const maxFunding = Math.max(...fundingHistory.map(d => d.rate));
  const minFunding = Math.min(...fundingHistory.map(d => d.rate));

  function formatFundingTime(ts: number): string {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:00`;
  }

  function validityLabel(tif: string): string {
    switch (tif) {
      case 'GTC': return 'Valid until canceled';
      case 'IOC': return 'Immediate or Cancel';
      case 'FOK': return 'Fill or Kill';
      case 'GTD': return 'Valid until date';
      default: return tif;
    }
  }

  function marginStatusColor(pct: number): string {
    if (pct <= LIQUIDATION_LEVEL) return 'text-negative';
    if (pct <= MARGIN_CALL_LEVEL) return 'text-amber-500';
    return 'text-positive';
  }

  // Margin-specific preview card (only shown for MARGIN)
  const marginCard = marketType === 'MARGIN' ? (
    <Card className='mb-3'>
      <CardContent className='space-y-1 p-2.5'>
        <p className='mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>Order Details</p>
        <PreviewRow
          label='Size'
          value={`${formatNumber(qty)} ${selectedAsset.split('/')[0]}`}
        />
        <PreviewRow
          label='Notional'
          value={formatUsd(notional)}
        />

        <div className='border-t border-border/40 pt-1' />

        <PreviewRow
          label='Required Margin'
          value={formatUsd(requiredMargin)}
        />
        <PreviewRow
          label='Margin Status'
          value={
            <span className={cn('font-mono text-[11px] tabular-nums', marginStatusColor(marginStatusPct))}>
              {marginStatusPct > 0 ? `${marginStatusPct.toFixed(1)}%` : '—'}
            </span>
          }
        />

        <div className='border-t border-border/40 pt-1' />

        <PreviewRow
          label='Liq. Price'
          value={formatUsd(liqPrice)}
        />
        <PreviewRow
          label='Liq. Distance'
          value={
            <span
              className={cn(
                'font-mono text-[11px] tabular-nums',
                liqDistPct <= 10 ? 'text-negative' : liqDistPct <= 20 ? 'text-amber-500' : 'text-foreground',
              )}
            >
              {liqDistPct.toFixed(1)}%
            </span>
          }
        />

        <div className='border-t border-border/40 pt-1' />

        <PreviewRow
          label='Validity Period'
          value={<span className='text-[11px] text-foreground'>{validityLabel(timeInForce)}</span>}
        />

        <div className='border-t border-border/40 pt-1' />

        <PreviewRow
          label='Est. Trading Fee'
          value={
            <div className='text-right'>
              <span className='text-[11px] text-muted-foreground'>Taker </span>
              <span className='font-mono text-[11px] tabular-nums text-foreground'>{formatUsd(takerFeeNotional)}</span>
              <br />
              <span className='text-[11px] text-muted-foreground'>Maker </span>
              <span className='font-mono text-[11px] tabular-nums text-foreground'>{formatUsd(makerFeeNotional)}</span>
            </div>
          }
        />
        <PreviewRow
          label='Est. Margin Fee'
          value={
            <div className='text-right'>
              <span className='font-mono text-[11px] tabular-nums text-foreground'>{formatUsd(marginFeePer4h)}</span>
              <br />
              <span className='text-[10px] text-muted-foreground'>USD / 4 hours</span>
            </div>
          }
        />
        <PreviewRow
          label='Est. 24h Cost'
          value={
            <div className='text-right'>
              <span className='font-mono text-[11px] tabular-nums text-foreground'>{formatUsd(marginFeePer24h)}</span>
              <br />
              <span className='text-[10px] text-muted-foreground'>({formatPercent(0.0001 * 6, { signed: false })} of notional)</span>
            </div>
          }
        />

        {/* Funding Rate History */}
        <div className='border-t border-border/40 pt-1.5'>
          <div className='mb-1 flex items-center justify-between'>
            <span className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>Funding Rate History</span>
            <span
              className={cn(
                'font-mono text-[11px] tabular-nums',
                currentFundingRate > 0 ? 'text-positive' : currentFundingRate < 0 ? 'text-negative' : 'text-muted-foreground',
              )}
            >
              {formatPercent(currentFundingRate, { signed: true })}
            </span>
          </div>
          <div className='h-12 w-full'>
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart data={fundingHistory}>
                <YAxis domain={['auto', 'auto']} hide />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className='rounded border border-border bg-popover px-2 py-1 text-[10px] shadow-sm'>
                        <p className='text-muted-foreground'>{formatFundingTime(d.time)}</p>
                        <p className={cn('font-mono tabular-nums', d.rate > 0 ? 'text-positive' : d.rate < 0 ? 'text-negative' : 'text-foreground')}>
                          {formatPercent(d.rate, { signed: true })}
                        </p>
                      </div>
                    );
                  }}
                />
                <Line
                  type='monotone'
                  dataKey='rate'
                  stroke='hsl(var(--chart-2))'
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 1 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className='mt-0.5 flex justify-between text-[10px] text-muted-foreground'>
            <span>Min: <span className={cn('font-mono tabular-nums', minFunding < 0 ? 'text-negative' : 'text-foreground')}>{formatPercent(minFunding, { signed: true })}</span></span>
            <span>Max: <span className={cn('font-mono tabular-nums', maxFunding > 0 ? 'text-positive' : 'text-foreground')}>{formatPercent(maxFunding, { signed: true })}</span></span>
          </div>
        </div>
      </CardContent>
    </Card>
  ) : null;

  return (
    <>
      {marginCard}

      <RiskManagementPanel
        quantity={quantity}
        entryPrice={limitPrice || triggerPrice || ''}
        assetSymbol={selectedAsset}
        marketType={marketType}
        leverage={leverage}
        positionSide={positionSide}
        stopLossPrice={stopLossPrice}
        takeProfitPrice={takeProfitPrice}
        onStopLossPriceChange={onStopLossPriceChange}
        onTakeProfitPriceChange={onTakeProfitPriceChange}
        trailingStopEnabled={trailingStopEnabled}
        onTrailingStopEnabledChange={onTrailingStopEnabledChange}
        trailingOffsetType={trailingOffsetType}
        onTrailingOffsetTypeChange={onTrailingOffsetTypeChange}
        trailingOffsetValue={trailingOffsetValue}
        onTrailingOffsetValueChange={onTrailingOffsetValueChange}
        trailingLimitOffset={trailingLimitOffset}
        onTrailingLimitOffsetChange={onTrailingLimitOffsetChange}
        tpSlMode={tpSlMode}
        onTpSlModeChange={onTpSlModeChange}
        simpleTpType={simpleTpType}
        onSimpleTpTypeChange={onSimpleTpTypeChange}
        simpleTpValue={simpleTpValue}
        onSimpleTpValueChange={onSimpleTpValueChange}
        simpleSlType={simpleSlType}
        onSimpleSlTypeChange={onSimpleSlTypeChange}
        simpleSlValue={simpleSlValue}
        onSimpleSlValueChange={onSimpleSlValueChange}
        advField1={advField1}
        onAdvField1Change={onAdvField1Change}
        advField2Type={advField2Type}
        onAdvField2TypeChange={onAdvField2TypeChange}
        advField2Value={advField2Value}
        onAdvField2ValueChange={onAdvField2ValueChange}
        advField3={advField3}
        onAdvField3Change={onAdvField3Change}
        advField3Value={advField3Value}
        onAdvField3ValueChange={onAdvField3ValueChange}
        advField3Extra={advField3Extra}
        onAdvField3ExtraChange={onAdvField3ExtraChange}
        expanded={
          marketType === 'MARGIN' ||
          ['STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT', 'TRAILING_STOP', 'TRAILING_STOP_LIMIT'].includes(orderType)
        }
      />
    </>
  );
}
