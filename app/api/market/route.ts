import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPriceFeed } from '@/lib/engine/priceFeed/PriceFeedFactory';

export interface MarketTicker {
  symbol: string;
  name: string;
  price: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

/**
 * REST endpoint for market data ("GET /api/market").
 * Polled by the Watchlist and TickerTape client components
 * (currently ~ every 2 seconds) — this is the first version,
 * which can later be replaced by WebSocket/SSE push via
 * `SimulatedPriceFeed.subscribe()`.
 */
export async function GET() {
  const priceFeed = getPriceFeed();
  const assets = await prisma.asset.findMany({ where: { isActive: true } });

  const tickers: MarketTicker[] = await Promise.all(
    assets.map(async asset => {
      const price = await priceFeed.getCurrentPrice(asset.symbol);
      const dayCandles = await priceFeed.getCandles(asset.symbol, '1h', 24);
      const openPrice = dayCandles[0]?.open ?? price;
      const high24h = Math.max(...dayCandles.map(c => c.high), price);
      const low24h = Math.min(...dayCandles.map(c => c.low), price);
      const volume24h = dayCandles.reduce((sum, c) => sum + c.volume, 0);
      const changePercent24h =
        openPrice === 0 ? 0 : ((price - openPrice) / openPrice) * 100;

      return {
        symbol: asset.symbol,
        name: asset.name,
        price,
        changePercent24h,
        high24h,
        low24h,
        volume24h,
      };
    }),
  );

  return NextResponse.json({ tickers, timestamp: Date.now() });
}
