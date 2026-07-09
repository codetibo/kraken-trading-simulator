'use client';

import { useRef } from 'react';
import { usePanelResize } from '@/hooks/usePanelResize';
import { usePriceStream } from '@/hooks/usePriceStream';
import { useResponsive } from '@/hooks/useResponsive';
import { Watchlist } from '@/components/trade/Watchlist';
import { WatchlistSheet } from '@/components/trade/WatchlistSheet';
import { TradingChart } from '@/components/trade/TradingChart';
import { OrderEntry } from '@/components/trade/OrderEntry';
import { OrderBook } from '@/components/trade/OrderBook';
import { MobileOrderDrawer } from '@/components/trade/MobileOrderDrawer';
import { BottomPanel } from '@/components/trade/BottomPanel';
import { TradeFeedHealth } from '@/components/trade/TradeFeedHealth';
import { useSelectedAsset } from '@/components/trade/AssetProvider';
import { useTradeStore } from '@/store/tradeStore';
import { cn, formatUsd } from '@/lib/utils';

const HANDLE_CLASS =
  'group shrink-0 flex items-center justify-center bg-border/40 transition-colors hover:bg-accent/30 data-[active]:bg-accent/50';
const HANDLE_BAR_CLASS =
  'shrink-0 rounded-sm bg-muted-foreground/30 transition-colors group-hover:bg-accent group-data-[active]:bg-accent';

// ─── Desktop Layout (3+ resizable panels) ──────────────────

function DesktopLayout() {
  const outerRef = useRef<HTMLDivElement>(null);
  const topSectionRef = useRef<HTMLDivElement>(null);

  const {
    getPanelStyle: getVerticalStyle,
    getResizeHandleProps: getVerticalHandle,
  } = usePanelResize({
    defaultSizes: { top: 65, bottom: 35 },
    minSizes: { top: 40, bottom: 20 },
    direction: 'vertical',
    containerRef: outerRef,
  });

  const {
    getPanelStyle: getHorizontalStyle,
    getResizeHandleProps: getHorizontalHandle,
  } = usePanelResize({
    defaultSizes: { watchlist: 15, chart: 55, right: 30 },
    minSizes: { watchlist: 10, chart: 35, right: 20 },
    maxSizes: { watchlist: 25, right: 40 },
    direction: 'horizontal',
    containerRef: topSectionRef,
  });

  const {
    containerRef: rightContainerRef,
    getPanelStyle: getRightStyle,
    getResizeHandleProps: getRightHandle,
  } = usePanelResize({
    defaultSizes: { entry: 60, book: 40 },
    minSizes: { entry: 25, book: 20 },
    direction: 'vertical',
  });

  return (
    <div ref={outerRef} className="flex h-full w-full flex-col overflow-hidden">
      {/* Top section */}
      <div
        ref={topSectionRef}
        className="flex min-h-0 flex-row overflow-hidden"
        style={getVerticalStyle('top')}
      >
        {/* Watchlist */}
        <div
          className="flex min-w-0 flex-col overflow-hidden border-r border-border"
          style={getHorizontalStyle('watchlist')}
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Watchlist />
          </div>
        </div>

        {/* Drag handle (Watchlist / Chart) */}
        <div
          className={cn(HANDLE_CLASS, 'w-[5px] cursor-col-resize')}
          {...getHorizontalHandle('watchlist')}
        >
          <div className={cn(HANDLE_BAR_CLASS, 'h-8 w-[3px]')} />
        </div>

        {/* Chart */}
        <div
          className="flex min-w-0 flex-col overflow-hidden"
          style={getHorizontalStyle('chart')}
        >
          <TradingChart />
        </div>

        {/* Drag handle (Chart / Right panel) */}
        <div
          className={cn(HANDLE_CLASS, 'w-[5px] cursor-col-resize')}
          {...getHorizontalHandle('chart')}
        >
          <div className={cn(HANDLE_BAR_CLASS, 'h-8 w-[3px]')} />
        </div>

        {/* Right panel */}
        <div
          className="flex min-w-0 flex-col overflow-hidden border-l border-border"
          style={getHorizontalStyle('right')}
        >
          <div ref={rightContainerRef} className="flex h-full w-full flex-col overflow-hidden">
            {/* Order Entry */}
            <div
              className="flex min-h-0 flex-col overflow-hidden"
              style={getRightStyle('entry')}
            >
              <div className="min-h-0 flex-1 overflow-y-auto">
                <OrderEntry />
              </div>
            </div>

            {/* Drag handle (OrderEntry / OrderBook) */}
            <div
              className={cn(HANDLE_CLASS, 'h-[5px] shrink-0 cursor-row-resize')}
              {...getRightHandle('entry')}
            >
              <div className={cn(HANDLE_BAR_CLASS, 'h-[3px] w-8')} />
            </div>

            {/* Order Book */}
            <div
              className="flex min-h-0 flex-col overflow-hidden"
              style={getRightStyle('book')}
            >
              <div className="min-h-0 flex-1 overflow-y-auto">
                <OrderBook />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drag handle (Top / Bottom) */}
      <div
        className={cn(HANDLE_CLASS, 'h-[5px] shrink-0 cursor-row-resize')}
        {...getVerticalHandle('top')}
      >
        <div className={cn(HANDLE_BAR_CLASS, 'h-[3px] w-8')} />
      </div>

      {/* Bottom section */}
      <div
        className="flex min-h-0 flex-col overflow-hidden border-t border-border"
        style={getVerticalStyle('bottom')}
      >
        <div className="min-h-0 flex-1 overflow-hidden">
          <BottomPanel />
        </div>
      </div>
    </div>
  );
}

// ─── Tablet Layout (768-1024px) ───────────────────────────

function TabletLayout() {
  const { selectedAsset } = useSelectedAsset();

  return (
    <>
      {/* Top bar with hamburger + asset name */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <WatchlistSheet />
        <span className="text-xs font-medium text-foreground">{selectedAsset}</span>
      </div>

      {/* Chart — simplified on tablet */}
      <div className="flex min-h-0 flex-[4] flex-col overflow-hidden">
        <TradingChart simplified />
      </div>

      {/* Order Entry + Order Book side by side */}
      <div className="flex min-h-0 flex-[2] flex-row gap-px overflow-hidden border-t border-border">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-border/50">
          <OrderEntry />
        </div>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <OrderBook />
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="min-h-0 flex-[1.2] overflow-hidden border-t border-border">
        <BottomPanel />
      </div>
    </>
  );
}

// ─── Mobile Layout (<768px) ──────────────────────────────

function MobileLayout() {
  const { selectedAsset } = useSelectedAsset();
  const selectedPair = useTradeStore((s) => s.selectedPair);
  const { priceMap } = usePriceStream();
  const currentPrice = priceMap[selectedPair];

  return (
    <>
      {/* Top bar with hamburger + asset name + price */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <WatchlistSheet />
        <span className="text-sm font-medium text-foreground">{selectedAsset}</span>
        {currentPrice && (
          <span className="ml-auto font-mono text-xs tabular-nums text-foreground/70">
            {formatUsd(currentPrice)}
          </span>
        )}
      </div>

      {/* Full-width chart — simplified on mobile */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TradingChart simplified />
      </div>

      {/* Bottom tabs (simple inline tab bar) */}
      <div className="min-h-0 flex-[0.6] overflow-hidden border-t border-border">
        <BottomPanel />
      </div>

      {/* Floating Trade button that opens the OrderEntry drawer */}
      <MobileOrderDrawer />
    </>
  );
}

// ─── Main Export ─────────────────────────────────────────

export function ResizableLayout() {
  const breakpoint = useResponsive();

  return (
    <div className="relative h-full w-full">
      <TradeFeedHealth />

      {/* Desktop: use the full resizable layout in flex-col */}
      {breakpoint === 'desktop' && (
        <div className="flex h-full w-full flex-col overflow-hidden">
          <DesktopLayout />
        </div>
      )}

      {/* Tablet: stacked vertical layout with sheet watchlist */}
      {breakpoint === 'tablet' && (
        <div className="flex h-full w-full flex-col overflow-hidden">
          <TabletLayout />
        </div>
      )}

      {/* Mobile: full-width chart + bottom tabs + trade drawer */}
      {breakpoint === 'mobile' && (
        <div className="flex h-full w-full flex-col overflow-hidden">
          <MobileLayout />
        </div>
      )}
    </div>
  );
}
