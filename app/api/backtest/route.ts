import { NextRequest, NextResponse } from 'next/server';
import { getPriceFeed } from '@/lib/engine/priceFeed/PriceFeedFactory';
import { runBacktest } from '@/lib/engine/backtesting';
import type { StrategyConfig } from '@/lib/engine/backtesting';
import type { CandleInterval } from '@/lib/engine/priceFeed/PriceFeedProvider';

const VALID_INTERVALS: CandleInterval[] = ['1m', '5m', '15m', '1h', '4h', '1D', '1W', '1M'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      symbol,
      interval,
      strategy,
      initialCapital,
      positionSize,
      feeBps,
      slippage,
      oco,
    } = body;

    // Validate required fields
    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json({ error: "Missing or invalid 'symbol'" }, { status: 400 });
    }
    if (!interval || !VALID_INTERVALS.includes(interval)) {
      return NextResponse.json({ error: "Missing or invalid 'interval'" }, { status: 400 });
    }
    if (!strategy || !strategy.type) {
      return NextResponse.json({ error: "Missing or invalid 'strategy'" }, { status: 400 });
    }

    // Validate strategy config
    const validStrategies = ['sma_crossover', 'rsi', 'macd'];
    if (!validStrategies.includes(strategy.type)) {
      return NextResponse.json({ error: `Unknown strategy type: ${strategy.type}` }, { status: 400 });
    }

    const cap = typeof initialCapital === 'number' ? initialCapital : 10000;
    const posSize = typeof positionSize === 'number' ? Math.min(Math.max(positionSize, 0), 1) : 0.5;
    const fee = typeof feeBps === 'number' ? feeBps : 26;
    const slip = typeof slippage === 'number' ? slippage : 0.001;

    // Fetch historical candles
    const priceFeed = getPriceFeed();
    // Use a higher limit for longer intervals to get meaningful backtests
    const limit =
      interval === '1M' ? 60 :
      interval === '1W' ? 156 :
      interval === '1D' ? 365 :
      interval === '4h' ? 365 * 6 :
      interval === '1h' ? 720 :
      1000;

    const candles = await priceFeed.getCandles(symbol, interval, limit);

    if (candles.length < 2) {
      return NextResponse.json(
        { error: `Not enough candle data for ${symbol} (got ${candles.length})` },
        { status: 400 },
      );
    }

    // Run backtest
    const report = runBacktest({
      symbol,
      interval,
      candles,
      strategy: strategy as StrategyConfig,
      initialCapital: cap,
      positionSize: posSize,
      feeBps: fee,
      slippage: slip,
      oco: oco || undefined,
    });

    return NextResponse.json({ success: true, report });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
