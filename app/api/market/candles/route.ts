import { NextRequest, NextResponse } from 'next/server';
import { getPriceFeed } from '@/lib/engine/priceFeed/PriceFeedFactory';
import type { CandleInterval } from '@/lib/engine/priceFeed/PriceFeedProvider';

const VALID_INTERVALS: CandleInterval[] = ['1m', '5m', '15m', '1h', '4h', '1D', '1W', '1M'];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const interval = (searchParams.get('interval') ?? '1h') as CandleInterval;
  const limit = Number(searchParams.get('limit') ?? 200);

  if (!symbol) {
    return NextResponse.json(
      { error: "Missing 'symbol' parameter" },
      { status: 400 },
    );
  }
  if (!VALID_INTERVALS.includes(interval)) {
    return NextResponse.json(
      { error: 'Invalid interval' },
      { status: 400 },
    );
  }

  try {
    const priceFeed = getPriceFeed();
    const candles = await priceFeed.getCandles(symbol, interval, limit);
    return NextResponse.json({ symbol, interval, candles });
  } catch {
    return NextResponse.json({ error: 'Unknown asset' }, { status: 404 });
  }
}
