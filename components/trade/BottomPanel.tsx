'use client';

import { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useBottomPanelData } from '@/hooks/useBottomPanelData';
import { OrdersTable, PositionsTable, OrderHistoryTable, TradesTable } from './bottom-panel/tables';
import { JournalTab } from './bottom-panel/JournalTab';

type Tab = 'open-orders' | 'positions' | 'order-history' | 'trade-history' | 'journal';

const TABS: { id: Tab; label: string }[] = [
  { id: 'open-orders', label: 'Open Orders' },
  { id: 'positions', label: 'Positions' },
  { id: 'order-history', label: 'Order History' },
  { id: 'trade-history', label: 'Trade History' },
  { id: 'journal', label: 'Journal' },
];

export const BottomPanel = memo(function BottomPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('open-orders');
  const {
    orders,
    positions,
    trades,
    historyOrders,
    loading,
    handleCancelOrder,
    handleClosePosition,
  } = useBottomPanelData();

  return (
    <div className='flex h-full flex-col border-t border-border'>
      {/* Tab headers — horizontally scrollable for mobile swipe */}
      <div className='flex overflow-x-auto border-b border-border [&::-webkit-scrollbar]:hidden snap-x snap-mandatory'>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'shrink-0 snap-start px-4 py-2 text-[11px] font-medium uppercase tracking-wider transition-colors',
              'focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
              activeTab === tab.id
                ? 'border-b-2 border-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
        {loading && <span className='ml-auto self-center pr-3 text-[11px] text-muted-foreground'>...</span>}
      </div>

      {/* Tab content */}
      <div className='flex-1 overflow-auto'>
        {activeTab === 'open-orders' && (
          <OrdersTable orders={orders} onCancel={handleCancelOrder} />
        )}
        {activeTab === 'positions' && (
          <PositionsTable positions={positions} onClose={handleClosePosition} />
        )}
        {activeTab === 'order-history' && (
          <OrderHistoryTable orders={historyOrders} />
        )}
        {activeTab === 'trade-history' && (
          <TradesTable trades={trades} />
        )}
        {activeTab === 'journal' && (
          <JournalTab />
        )}
      </div>
    </div>
  );
});
