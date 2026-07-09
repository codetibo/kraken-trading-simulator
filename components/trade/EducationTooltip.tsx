'use client';

import { useState } from 'react';
import { Info, X } from 'lucide-react';

const MODE_EDUCATION: Record<
  string,
  {
    title: string;
    what: string;
    when: string;
    example: string;
  }
> = {
  MARKET: {
    title: 'Market Mode',
    what: 'Market orders execute instantly at the current best available price. This is the fastest way to enter or exit a trade but offers no price control — you take whatever the market offers, which typically incurs taker fees.',
    when: 'Use when execution speed matters more than price precision. Ideal for quickly entering a position, exiting in fast-moving markets, or when order book liquidity is sufficient to minimize slippage.',
    example: 'You want to buy Bitcoin immediately because you expect a breakout. A market order fills within seconds at the current best ask price.',
  },

  LIMIT: {
    title: 'Limit Mode',
    what: 'Limit orders let you set a specific price at which you are willing to buy or sell. The order rests on the order book until matched, which usually qualifies you for lower maker fees.',
    when: 'Use when you have a target price in mind and can wait for the market to come to you. Ideal for swing trading, accumulating at support levels, or taking profits at resistance levels.',
    example: 'You want to buy 0.5 ETH at $3,200, well below the current $3,400 market price. Your limit order sits on the book and fills when the price dips.',
  },

  ADVANCED: {
    title: 'Advanced Mode',
    what: 'Advanced order types give you precise control over trade execution, risk management, and position sizing. Choose from stop-losses, take-profits, icebergs, trailing stops, OCO orders, and more.',
    when: 'Use when you need conditional logic, automated risk management, or special execution strategies. Each order type serves a specific purpose — select the one that matches your trading plan.',
    example: 'Place a trailing stop to protect gains on a winning position, or an OCO order to bracket a trade with both a stop-loss and take-profit simultaneously.',
  },
};

const EDUCATION_DATA: Record<
  string,
  {
    title: string;
    what: string;
    when: string;
    example: string;
  }
> = {
  STOP_LOSS: {
    title: 'Stop Loss',
    what: 'Triggers a Market order once the trigger price is reached to help limit potential losses.',
    when: 'Use to automatically exit losing positions.',
    example: 'Sell BTC if price falls below $45,000.',
  },

  STOP_LOSS_LIMIT: {
    title: 'Stop Loss Limit',
    what: 'Triggers a Limit order after the stop price is reached, giving more control over execution price.',
    when: 'Use when you want stop protection while avoiding large slippage.',
    example: 'Stop at $45,000 with a limit order at $44,900.',
  },

  TAKE_PROFIT: {
    title: 'Take Profit',
    what: 'Triggers a Market order once your profit target is reached.',
    when: 'Use to automatically lock in profits.',
    example: 'Sell BTC when price reaches $55,000.',
  },

  TAKE_PROFIT_LIMIT: {
    title: 'Take Profit Limit',
    what: 'Triggers a Limit order after your profit target is reached.',
    when: 'Use when you want to secure profits while maintaining price control.',
    example: 'Trigger at $55,000 and place a limit sell at $54,900.',
  },

  TRAILING_STOP: {
    title: 'Trailing Stop',
    what: 'Automatically moves the stop price as the market moves in your favor and triggers a Market order once the offset is reached.',
    when: 'Use to protect profits while allowing winning trades to continue.',
    example:
      'A 5% trailing stop follows BTC upward and triggers if price drops 5% from the highest point.',
  },

  TRAILING_STOP_LIMIT: {
    title: 'Trailing Stop Limit',
    what: 'Similar to a Trailing Stop, but submits a Limit order instead of a Market order when triggered.',
    when: 'Use when you want trailing protection with additional price control.',
    example: 'A trailing stop with a limit offset of $100.',
  },

  ICEBERG: {
    title: 'Iceberg Order',
    what: 'Splits one large order into smaller visible portions to reduce market impact and hide total order size.',
    when: 'Use when trading large positions without revealing your full size.',
    example: 'Place a 100 BTC order while displaying only 5 BTC at a time.',
  },

  TWAP: {
    title: 'TWAP Order',
    what: 'Time-Weighted Average Price orders split a large trade into smaller executions over a specified period.',
    when: 'Use when you want to minimize market impact during large trades.',
    example: 'Buy 20 BTC over 2 hours using 24 equal slices.',
  },

  OCO: {
    title: 'One Cancels the Other (OCO)',
    what: 'Places two linked orders. When one executes, the other is automatically cancelled.',
    when: 'Use to simultaneously define a take-profit and stop-loss for the same position.',
    example:
      'Take profit at $60,000 and stop loss at $48,000. Executing one cancels the other.',
  },

  SETTLE_POSITION: {
    title: 'Settle Position',
    what: 'Closes an open margin position and settles the borrowed funds.',
    when: 'Use when you want to manually close an entire leveraged position.',
    example: 'Close an open 5× BTC/USD long position.',
  },

  POST_ONLY_LIMIT: {
    title: 'Post Only Limit',
    what: 'A Limit order that will only be placed on the order book. If it would execute immediately, it is cancelled.',
    when: 'Use when you only want maker fees and never want to remove liquidity.',
    example:
      'Place a buy order below the current market price so it rests in the book.',
  },

  REDUCE_ONLY: {
    title: 'Reduce Only',
    what: 'Ensures the order can only decrease or close an existing position and never increase its size.',
    when: 'Use when managing leveraged positions to avoid accidentally opening a larger position.',
    example:
      'Place a Reduce Only sell order that can only decrease your current long position.',
  },
};

export function EducationTooltip({ type, tradingMode }: { type: string; tradingMode?: string }) {
  const [open, setOpen] = useState(false);

  // When in MARKET or LIMIT mode, show the mode-level tooltip.
  // In ADVANCED mode, show the specific order type tooltip.
  const info =
    tradingMode && tradingMode !== 'ADVANCED'
      ? MODE_EDUCATION[tradingMode]
      : EDUCATION_DATA[type];

  if (!info) return null;

  return (
    <div className='relative'>
      <button
        onClick={() => setOpen(!open)}
        className='inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground/50 hover:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
      >
        <Info className='h-3 w-3' />
      </button>

      {open && (
        <>
          <div className='fixed inset-0 z-40' onClick={() => setOpen(false)} />
          <div className='absolute left-0 top-5 z-50 w-72 rounded-lg border border-border bg-popover p-3 shadow-lg'>
            <div className='mb-2 flex items-center justify-between'>
              <h3 className='text-xs font-semibold text-foreground'>
                {info.title}
              </h3>
              <button onClick={() => setOpen(false)} className='focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)] rounded'>
                <X className='h-3 w-3 text-muted-foreground' />
              </button>
            </div>
            <div className='space-y-2 text-[11px] leading-relaxed text-muted-foreground'>
              <p>
                <span className='font-medium text-foreground'>
                  What is it:{' '}
                </span>
                {info.what}
              </p>
              <p>
                <span className='font-medium text-foreground'>
                  When to use:{' '}
                </span>
                {info.when}
              </p>
              <p>
                <span className='font-medium text-foreground'>Example: </span>
                {info.example}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
