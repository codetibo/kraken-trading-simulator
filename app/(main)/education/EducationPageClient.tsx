'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  BookOpen, GraduationCap, ChevronDown, CheckCircle2, Circle,
  ArrowRight, Star, AlertTriangle, ThumbsUp, ThumbsDown, Lightbulb, RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TUTORIAL_TASKS_WITH_INSTRUCTIONS } from '@/lib/engine/tutorialTasks';
import type { TutorialTask as TutorialTaskType } from '@/server/actions/tutorial';
import type { ExecutionType } from '@/lib/engine/types';

type Tab = 'types' | 'tutorial';

interface OrderTypeInfo {
  id: string; name: string; summary: string; icon: string; color: string;
  whatIsIt: string; howItWorks: string; whenToUse: string; whenNotToUse: string;
  advantages: string[]; disadvantages: string[]; example: string;
  executionType: ExecutionType;
}

const ORDER_TYPES: OrderTypeInfo[] = [
  { id: 'MARKET', name: 'Market Order', summary: 'Execute immediately at the current market price.', icon: '⚡', color: 'text-blue-500 border-blue-500/30',
    whatIsIt: 'A Market order is the simplest and fastest way to enter or exit a trade. It instructs the exchange to buy or sell an asset immediately at the best available current price.',
    howItWorks: 'When you place a Market order, it matches against existing limit orders on the order book. The order consumes liquidity (taker order) and is filled at the best available prices until the full quantity is executed.',
    whenToUse: 'Use Market orders when speed is more important than price — for example, when entering a fast-moving market, closing a position quickly, or executing a stop-loss trigger.',
    whenNotToUse: 'Avoid Market orders in thin markets with low liquidity, where slippage can be significant. Also avoid when you need a specific entry price for your strategy.',
    advantages: ['Instant execution — no waiting', 'Guaranteed to fill (at some price)', 'Simple to understand and use', 'Ideal for entering/exiting quickly'],
    disadvantages: ['No price control — you get what the market offers', 'Subject to slippage in volatile or low-liquidity markets', 'Higher fees (taker fee applies)', 'Can suffer from price impact on large orders'],
    example: 'You want to buy 0.5 BTC immediately. The current ask price is $50,000. You place a Market order and get filled at $50,010 (slight slippage). Total cost: ~$25,005 + taker fee.',
    executionType: 'Market' as ExecutionType },
  { id: 'LIMIT', name: 'Limit Order', summary: 'Buy or sell at a specific price or better.', icon: '🎯', color: 'text-emerald-500 border-emerald-500/30',
    whatIsIt: 'A Limit order lets you specify the exact price at which you want to buy or sell. The order will only execute if the market reaches your specified price or better.',
    howItWorks: 'Your order sits on the order book until either the market price reaches your limit price, or you cancel the order. If buying, it executes at your limit price or lower. If selling, at your limit price or higher.',
    whenToUse: 'Use Limit orders when you have a specific entry or exit price in mind, when you want to reduce costs by paying the maker fee, or when you\'re patient and can wait for the right price.',
    whenNotToUse: 'Don\'t use Limit orders when you need immediate execution, in fast-moving markets where the price might never reach your limit, or when closing a losing position quickly.',
    advantages: ['Full price control — you decide the price', 'Lower fees (maker fee applies when providing liquidity)', 'No slippage risk', 'Can be used for automated trading strategies'],
    disadvantages: ['No guarantee of execution — price may never reach your limit', 'May miss opportunities in fast-moving markets', 'Requires monitoring and patience', 'Partial fills possible with large orders'],
    example: 'BTC is trading at $50,000. You want to buy at $49,500. You place a Limit order at $49,500. If the price drops to $49,500, your order fills. If not, it remains open until cancelled.',
    executionType: 'Limit' as ExecutionType },
  { id: 'STOP_LOSS', name: 'Stop Loss Order', summary: 'Limit losses by triggering a Market sell when price hits a level.', icon: '🛡️', color: 'text-red-500 border-red-500/30',
    whatIsIt: 'A Stop Loss order is a conditional order designed to limit potential losses on an existing position. When the market price reaches your specified stop price, a Market order is triggered to close the position.',
    howItWorks: 'You set a trigger price below the current market (for long positions) or above it (for shorts). When the market crosses this trigger, the stop loss converts into a Market order.',
    whenToUse: 'Always use Stop Loss orders when opening any position — they are essential for risk management.',
    whenNotToUse: 'Be cautious with stops during highly volatile periods or news events when prices can gap through your stop level.',
    advantages: ['Automatic loss protection', 'Essential risk management tool', 'Helps remove emotion from trading decisions', 'Can be set when opening the position'],
    disadvantages: ['No guaranteed fill price — slippage can occur', 'Can be triggered by temporary price spikes', 'May lock in losses on normal volatility if set too tight', 'Not suitable during extreme market gaps'],
    example: 'You bought BTC at $50,000. To limit your loss to 5%, you place a Stop Loss at $47,500. If BTC drops to $47,500, a Market sell order triggers to close your position.',
    executionType: 'Market' as ExecutionType },
  { id: 'STOP_LOSS_LIMIT', name: 'Stop Limit Order', summary: 'Stop loss with price control — triggers a Limit order instead of Market.', icon: '🎛️', color: 'text-orange-500 border-orange-500/30',
    whatIsIt: 'A Stop Limit order combines the features of a Stop Loss and a Limit order. When the market hits your stop price, instead of a Market order, it places a Limit order at your specified limit price.',
    howItWorks: 'You set two prices: a stop price (trigger) and a limit price (execution floor/ceiling). When the market reaches the stop price, the system creates a Limit order at your specified limit price.',
    whenToUse: 'Use Stop Limit orders when you want to protect against losses but also want price control.',
    whenNotToUse: 'Avoid in fast-crashing markets where the price might blow through both your stop and limit levels without filling.',
    advantages: ['Price control — prevents excessive slippage', 'Combines risk management with execution precision', 'Good for volatile markets', 'Can be used for both entry and exit strategies'],
    disadvantages: ['No guarantee of execution — price may gap past your limit', 'More complex to set up', 'May not protect in fast-moving markets', 'Partial fill risk on the limit order'],
    example: 'You bought BTC at $50,000. Set a Stop Limit: stop at $47,500, limit at $47,000. If BTC drops to $47,500, a Limit order to sell at $47,000 is placed.',
    executionType: 'Limit' as ExecutionType },
  { id: 'TAKE_PROFIT', name: 'Take Profit Order', summary: 'Lock in gains by triggering a Market sell when price hits a target.', icon: '💰', color: 'text-green-500 border-green-500/30',
    whatIsIt: 'A Take Profit order automatically closes a position when the market reaches a specified profit target.',
    howItWorks: 'You set a trigger price above the current market (for longs) or below it (for shorts). When the price reaches this trigger, the Take Profit converts to a Market order and executes.',
    whenToUse: 'Use Take Profit orders whenever you have a predefined profit target for your trade.',
    whenNotToUse: 'Avoid in strongly trending markets where you might want to let profits run.',
    advantages: ['Automatic profit-taking', 'Removes greed from decision making', 'Works well with predefined trading plans', 'Can be combined with Stop Loss'],
    disadvantages: ['May exit too early in a strong trend', 'No price control on execution', 'Slippage can reduce actual profit', 'Requires accurate target setting'],
    example: 'You bought BTC at $50,000, targeting $55,000. You place a Take Profit at $55,000. When BTC reaches $55,000, a Market sell order triggers.',
    executionType: 'Market' as ExecutionType },
  { id: 'TAKE_PROFIT_LIMIT', name: 'Take Profit Limit Order', summary: 'Take profit with price control — triggers a Limit order at target.', icon: '🎯', color: 'text-teal-500 border-teal-500/30',
    whatIsIt: 'A Take Profit Limit order gives you automatic profit-taking with price control.',
    howItWorks: 'You set a trigger price and a limit price. When the market crosses the trigger, the system creates a Limit order at your specified limit price.',
    whenToUse: 'Use when you want precise control over your exit price while still taking profits automatically.',
    whenNotToUse: 'Avoid in fast-moving markets where the price might hit your trigger but never return to fill your limit order.',
    advantages: ['Precise price control on exits', 'Can get better fills than Market orders', 'Useful for technical analysis-based targets', 'Combines automation with precision'],
    disadvantages: ['May not execute if price reverses quickly', 'Complex setup', 'Risk of partial fills', 'Not ideal for illiquid markets'],
    example: 'You bought BTC at $50,000. Set Take Profit Limit: trigger at $55,000, limit at $54,900.',
    executionType: 'Limit' as ExecutionType },
  { id: 'TRAILING_STOP', name: 'Trailing Stop Order', summary: 'Dynamic stop that follows the price as it moves in your favor.', icon: '📈', color: 'text-purple-500 border-purple-500/30',
    whatIsIt: 'A Trailing Stop is a dynamic stop loss order that automatically adjusts as the market price moves in your favor.',
    howItWorks: 'You set an offset below the market for longs. As the price moves favorably, the stop price moves with it. If the price reverses by the offset amount, a Market order triggers.',
    whenToUse: 'Perfect for trending markets when you want to let profits run while protecting against reversals.',
    whenNotToUse: 'Not ideal in choppy/sideways markets where the price oscillates and frequently triggers the stop.',
    advantages: ['Lets profits run in trending markets', 'Automatically locks in gains', 'No need to predict exact exit price', 'Dynamic risk management'],
    disadvantages: ['Can be triggered by normal pullbacks', 'Offset setting requires experience', 'Market order execution may have slippage', 'Not suitable for range-bound markets'],
    example: 'You buy BTC at $50,000 with a 5% trailing stop. BTC rises to $55,000 — stop trails to $52,250. If BTC drops 5% from $55,000, the stop triggers.',
    executionType: 'Market' as ExecutionType },
  { id: 'TRAILING_STOP_LIMIT', name: 'Trailing Stop Limit Order', summary: 'Trailing stop with a limit order for price-controlled exits.', icon: '🔮', color: 'text-indigo-500 border-indigo-500/30',
    whatIsIt: 'A Trailing Stop Limit combines the dynamic trailing feature with the price control of a limit order.',
    howItWorks: 'You set a trailing offset and a limit offset. When triggered by a reversal, a Limit order is placed at a price determined by the limit offset.',
    whenToUse: 'Use when you want trailing stop protection but also want to avoid slippage from Market orders.',
    whenNotToUse: 'Avoid in fast-declining markets where the limit order might not fill.',
    advantages: ['Combines trailing protection with price control', 'Reduces slippage', 'Can result in better exit prices', 'Automated strategy'],
    disadvantages: ['Highest complexity', 'No guarantee the limit order will fill', 'Not suitable for inexperienced traders', 'Risk of non-execution in fast markets'],
    example: 'You buy BTC at $50,000. Trailing offset: 5%, limit offset: 2%. BTC rises to $55,000. Stop trails to $52,250.',
    executionType: 'Limit' as ExecutionType },
  { id: 'ICEBERG', name: 'Iceberg Order', summary: 'Hide a large order by exposing only a small visible portion.', icon: '🧊', color: 'text-cyan-500 border-cyan-500/30',
    whatIsIt: 'An Iceberg order hides the true size of a large order by displaying only a small portion on the order book.',
    howItWorks: 'You specify both the total order quantity and the visible quantity. Only the visible quantity is shown to the market.',
    whenToUse: 'Ideal for institutional traders or anyone executing large positions without revealing their full intent.',
    whenNotToUse: 'Avoid for small orders where hiding order size provides little benefit.',
    advantages: ['Reduces market impact', 'Hides total order size', 'Can achieve better average execution', 'Useful for large positions'],
    disadvantages: ['May take longer to fully execute', 'Not supported on every exchange', 'Can miss fills during fast markets', 'More parameters to configure'],
    example: 'Buy 100 BTC while displaying only 5 BTC at any time. Each filled slice automatically posts another 5 BTC.',
    executionType: 'Limit' as ExecutionType },
  { id: 'TWAP', name: 'TWAP Order', summary: 'Split a large order into smaller trades over time.', icon: '⏱️', color: 'text-sky-500 border-sky-500/30',
    whatIsIt: 'A Time-Weighted Average Price (TWAP) order automatically divides a large order into multiple smaller orders executed evenly over a specified time period.',
    howItWorks: 'You choose the total quantity, execution duration and number of slices. The system submits smaller child orders according to the schedule.',
    whenToUse: 'Best for executing large trades while minimizing market impact.',
    whenNotToUse: 'Avoid when immediate execution is required or market conditions change rapidly.',
    advantages: ['Reduces market impact', 'Improves average execution price', 'Fully automated execution', 'Ideal for large trades'],
    disadvantages: ['Execution takes time', 'Price can move during execution', 'Not suitable for urgent trades', 'More complex than standard orders'],
    example: 'Buy 20 BTC over 2 hours using 24 equally sized orders.',
    executionType: 'Algorithmic' as ExecutionType },
  { id: 'OCO', name: 'One Cancels the Other (OCO)', summary: 'Two linked orders where executing one automatically cancels the other.', icon: '🔀', color: 'text-fuchsia-500 border-fuchsia-500/30',
    whatIsIt: 'An OCO order combines two orders into one strategy. When one order executes, the remaining order is automatically cancelled.',
    howItWorks: 'Most commonly combines a Take Profit and Stop Loss order. Only one of them can execute.',
    whenToUse: 'Ideal for managing existing positions with both profit targets and downside protection.',
    whenNotToUse: 'Not useful for simple entries where only one order is required.',
    advantages: ['Automatic trade management', 'Reduces manual intervention', 'Protects both profit and downside', 'Eliminates conflicting orders'],
    disadvantages: ['Requires planning before entry', 'More complex than standalone orders', 'Not supported everywhere', 'Requires multiple price levels'],
    example: 'Take profit at $60,000 and stop loss at $48,000. If either executes, the other is cancelled automatically.',
    executionType: 'Conditional' as ExecutionType },
  { id: 'SETTLE_POSITION', name: 'Settle Position', summary: 'Close and settle an existing leveraged position.', icon: '📦', color: 'text-amber-500 border-amber-500/30',
    whatIsIt: 'A Settle Position order closes an existing leveraged position and settles all associated borrowed funds and realized profit or loss.',
    howItWorks: 'The exchange automatically offsets the open position and releases the reserved margin.',
    whenToUse: 'Use when manually closing an entire leveraged position.',
    whenNotToUse: 'Not applicable to spot-only trading.',
    advantages: ['Simple position closure', 'Automatically settles margin', 'Releases collateral', 'Calculates realized PnL'],
    disadvantages: ['Only available for margin positions', 'May incur closing fees', 'Cannot partially manage advanced exits', 'Not useful for spot trading'],
    example: 'Close an open 5× BTC/USD long position and release all reserved margin.',
    executionType: 'Settlement' as ExecutionType },
  { id: 'POST_ONLY_LIMIT', name: 'Post Only Limit', summary: 'Guarantees that the order adds liquidity instead of taking it.', icon: '📌', color: 'text-emerald-400 border-emerald-400/30',
    whatIsIt: 'A Post Only Limit order ensures your order is added to the order book.',
    howItWorks: 'The exchange checks whether the order would match instantly. If so, it rejects or cancels the order to preserve maker status.',
    whenToUse: 'Ideal when minimizing fees or earning maker rebates is important.',
    whenNotToUse: 'Avoid when immediate execution is required.',
    advantages: ['Maker fees only', 'Never removes liquidity', 'Improves execution cost', 'Simple to use'],
    disadvantages: ['May be cancelled immediately', 'No guarantee of execution', 'Can miss fast-moving markets', 'Limited flexibility'],
    example: 'Place a buy order slightly below the current market price so it rests on the order book.',
    executionType: 'Limit' as ExecutionType },
  { id: 'REDUCE_ONLY', name: 'Reduce Only', summary: 'Only decreases an existing position and never increases exposure.', icon: '📉', color: 'text-rose-500 border-rose-500/30',
    whatIsIt: 'Reduce Only is an execution restriction ensuring that an order can only reduce or close an existing position.',
    howItWorks: 'If executing the order would increase position size or reverse direction, the exchange rejects or adjusts the order.',
    whenToUse: 'Essential for managing leveraged positions safely.',
    whenNotToUse: 'Not intended for opening new positions.',
    advantages: ['Prevents accidental position increases', 'Safer risk management', 'Useful for automated trading', 'Protects against execution mistakes'],
    disadvantages: ['Cannot open new positions', 'May be partially executed', 'Only useful when a position already exists', 'Margin-only feature on many exchanges'],
    example: 'You have a 2 BTC long position. A Reduce Only sell order can decrease or close it but will never open a short position.',
    executionType: 'Restriction' as ExecutionType },
];

const TABS: { id: Tab; label: string; icon: typeof BookOpen }[] = [
  { id: 'types', label: 'Order Types', icon: BookOpen },
  { id: 'tutorial', label: 'Interactive Tutorial', icon: GraduationCap },
];

export function EducationPageClient({
  initialProgress,
}: {
  initialProgress: TutorialTaskType[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>('types');
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [progress, setProgress] = useState<TutorialTaskType[]>(initialProgress);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_loadingProgress, setLoadingProgress] = useState(false);

  const fetchProgress = useCallback(async () => {
    setLoadingProgress(true);
    try {
      const res = await fetch('/api/tutorial', { cache: 'no-store' });
      const data = await res.json();
      if (data.progress) setProgress(data.progress);
    } catch (err) { console.warn('Failed to fetch tutorial progress:', err); } finally { setLoadingProgress(false); }
  }, []);

  const handleCompleteTask = async (taskKey: string) => {
    try {
      await fetch('/api/tutorial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskKey }),
      });
      fetchProgress();
    } catch (err) { console.warn('Failed to complete tutorial task:', err); }
  };

  const handleResetProgress = async () => {
    try { await fetch('/api/tutorial', { method: 'DELETE' }); fetchProgress(); } catch (err) { console.warn('Failed to reset tutorial progress:', err); }
  };

  const completedCount = progress.filter(t => t.isCompleted).length;
  const totalCount = progress.length;

  return (
    <div className='flex h-full flex-col overflow-y-auto p-4 pb-8 md:p-6' aria-busy='false'>
      <div className='mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-4 md:space-y-6'>
        <div className='flex items-center justify-between'>
          <h1 className='font-display text-lg font-semibold tracking-tight text-foreground md:text-xl'>Education</h1>
        </div>

        <div className='flex border-b border-border'>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'tutorial') fetchProgress(); }}
              className={cn('flex items-center gap-2 px-4 py-2 text-[11px] font-medium uppercase tracking-wider transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                activeTab === tab.id ? 'border-b-2 border-accent text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              <tab.icon className='h-3.5 w-3.5' /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'types' ? (
          <OrderTypesSection expandedType={expandedType} setExpandedType={setExpandedType} />
        ) : (
          <TutorialSection
            progress={progress}
            completedCount={completedCount} totalCount={totalCount}
            onCompleteTask={handleCompleteTask} onResetProgress={handleResetProgress}
          />
        )}
      </div>
    </div>
  );
}

function OrderTypesSection({ expandedType, setExpandedType }: { expandedType: string | null; setExpandedType: (id: string | null) => void }) {
  return (
    <div className='space-y-4'>
      <p className='text-xs leading-relaxed text-muted-foreground'>Learn about all order types available in the simulator. Click each card to expand for detailed explanations, examples, and usage tips.</p>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {ORDER_TYPES.map(type => {
          const isExpanded = expandedType === type.id;
          return (
            <Card key={type.id} className={cn('cursor-pointer transition-all duration-200', isExpanded && 'ring-1 ring-accent/30')}
              onClick={() => setExpandedType(isExpanded ? null : type.id)}>
              <CardHeader className='pb-2'>
                <div className='flex items-start justify-between'>
                  <div className='flex items-center gap-2'>
                    <span className='text-lg'>{type.icon}</span>
                    <CardTitle className='text-sm font-semibold text-foreground'>{type.name}</CardTitle>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className={cn('border px-2 text-[11px] font-medium', type.color)}>{type.executionType} Order</Badge>
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', isExpanded && 'rotate-180')} />
                  </div>
                </div>
                <p className='mt-1 text-xs text-muted-foreground'>{type.summary}</p>
              </CardHeader>
              {isExpanded && (
                <CardContent className='space-y-4 pt-2'>
                  <div><h4 className='mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-foreground'><Lightbulb className='h-3.5 w-3.5 text-amber-500' /> What is it?</h4><p className='text-xs leading-relaxed text-muted-foreground'>{type.whatIsIt}</p></div>
                  <div><h4 className='mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-foreground'><Star className='h-3.5 w-3.5 text-accent' /> How it works</h4><p className='text-xs leading-relaxed text-muted-foreground'>{type.howItWorks}</p></div>
                  <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                    <div><h4 className='mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-positive'><ThumbsUp className='h-3.5 w-3.5' /> When to use</h4><p className='text-xs leading-relaxed text-muted-foreground'>{type.whenToUse}</p></div>
                    <div><h4 className='mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-negative'><ThumbsDown className='h-3.5 w-3.5' /> When not to use</h4><p className='text-xs leading-relaxed text-muted-foreground'>{type.whenNotToUse}</p></div>
                  </div>
                  <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                    <div><h4 className='mb-1 text-[11px] font-semibold text-positive'>Advantages</h4><ul className='space-y-1'>{type.advantages.map((a, i) => <li key={i} className='flex items-start gap-1.5 text-xs text-muted-foreground'><span className='mt-0.5 text-positive'>✓</span>{a}</li>)}</ul></div>
                    <div><h4 className='mb-1 text-[11px] font-semibold text-negative'>Disadvantages</h4><ul className='space-y-1'>{type.disadvantages.map((d, i) => <li key={i} className='flex items-start gap-1.5 text-xs text-muted-foreground'><span className='mt-0.5 text-negative'>✗</span>{d}</li>)}</ul></div>
                  </div>
                  <div className='rounded-lg border border-border/50 bg-muted/20 p-3'><h4 className='mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-foreground'><AlertTriangle className='h-3.5 w-3.5 text-amber-500' /> Example</h4><p className='text-xs leading-relaxed text-muted-foreground'>{type.example}</p></div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function TutorialSection({ progress, completedCount, totalCount, onCompleteTask, onResetProgress }: {
  progress: TutorialTaskType[]; completedCount: number; totalCount: number;
  onCompleteTask: (key: string) => void; onResetProgress: () => void;
}) {
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  return (
    <div className='space-y-4'>
      <Card><CardContent className='p-4'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div><h3 className='text-sm font-semibold text-foreground'>Your Progress</h3><p className='mt-0.5 text-xs text-muted-foreground'>Complete {totalCount} hands-on tasks to learn the platform</p></div>
          <div className='flex items-center gap-3'>
            <div className='text-right'><p className='text-xl font-bold tabular-nums text-foreground'>{completedCount}/{totalCount}</p><p className='text-[11px] text-muted-foreground'>tasks done</p></div>
            <div className='flex h-12 w-12 items-center justify-center rounded-full border-2 border-accent/30'><span className='text-sm font-bold text-accent'>{percentage}%</span></div>
          </div>
        </div>
        <div className='mt-3 h-1.5 overflow-hidden rounded-full bg-muted'><div className='h-full rounded-full bg-accent transition-all duration-500' style={{ width: `${percentage}%` }} /></div>
      </CardContent></Card>
      {completedCount > 0 && <div className='flex justify-end'><button onClick={onResetProgress} className='flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-negative/30 hover:text-negative focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'><RefreshCw className='h-3 w-3' /> Reset progress</button></div>}
      <div className='space-y-3'>
        {TUTORIAL_TASKS_WITH_INSTRUCTIONS.map((task, index) => {
          const taskProgress = progress.find(t => t.taskKey === task.taskKey);
          const isCompleted = taskProgress?.isCompleted ?? false;
          return (
            <Card key={task.taskKey} className={cn('transition-all duration-200', isCompleted && 'border-positive/20 opacity-80')}>
              <CardContent className='p-4'>
                <div className='flex items-start gap-3'>
                  <button onClick={() => onCompleteTask(task.taskKey)} className='mt-0.5 shrink-0 transition-colors hover:scale-110 focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]' title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}>
                    {isCompleted ? <CheckCircle2 className='h-5 w-5 text-positive' /> : <Circle className='h-5 w-5 text-muted-foreground/40 hover:text-accent' />}
                  </button>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2'>
                      <span className='flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground'>{index + 1}</span>
                      <h4 className={cn('text-sm font-medium', isCompleted ? 'text-muted-foreground line-through' : 'text-foreground')}>{task.label}</h4>
                      {isCompleted && <Badge variant='outline' className='border-positive/30 text-[11px] text-positive'>Done</Badge>}
                    </div>
                    <p className='mt-1 text-xs text-muted-foreground'>{task.description}</p>
                    {!isCompleted && <div className='mt-3 space-y-1.5'>{task.instructions.map((step, si) => <div key={si} className='flex items-start gap-2 text-xs text-muted-foreground'><ArrowRight className='mt-0.5 h-3 w-3 shrink-0 text-accent' /><span>{step}</span></div>)}</div>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
