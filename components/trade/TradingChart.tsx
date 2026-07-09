'use client';

import { memo, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  createChart,
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type HistogramData,
  type LineData,
  type Time,
  CrosshairMode,
  LineStyle,
  ColorType,
  type IPriceLine,
} from 'lightweight-charts';
import { useTheme } from 'next-themes';
import { useSelectedAsset } from './AssetProvider';
import { loadTradeSettings, saveTradeSettings, CANDLE_LIMITS, getDefaultCandleLimit } from '@/lib/trade-settings';
import { computeIndicators, type IndicatorId } from '@/lib/indicators';
import {
  ChartType,
  Interval,
  Candle,
  getCssVar,
  getChartTheme,
  INDICATOR_COLORS,
  FULL_INTERVALS,
  SIMPLIFIED_INTERVALS,
} from '@/lib/chart-theme';
import { ChartToolbar } from './trading-chart/ChartToolbar';

type MainSeriesApi = ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'>;

interface TradingChartProps {
  simplified?: boolean;
}

export const TradingChart = memo(function TradingChart({ simplified = false }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<MainSeriesApi | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const compareSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const indicatorSeriesRef = useRef<
    Map<string, ISeriesApi<'Line'> | ISeriesApi<'Histogram'>>
  >(new Map());
  const candleCacheRef = useRef<Candle[]>([]);
  const liqPriceLineRef = useRef<IPriceLine | null>(null);

  const { selectedAsset } = useSelectedAsset();
  const { theme } = useTheme();
  const intervals = simplified ? SIMPLIFIED_INTERVALS : FULL_INTERVALS;
  const saved = loadTradeSettings(selectedAsset);
  const [interval, setInterval] = useState<Interval>(saved.chartInterval as Interval || '1h');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [compareAsset, setCompareAsset] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<IndicatorId[]>([]);
  const [candleLimit, setCandleLimit] = useState<number>(
    loadTradeSettings(selectedAsset).candleLimit,
  );

  // Persist chart interval on change (not on asset switch — avoids race condition)
  useEffect(() => {
    saveTradeSettings(selectedAsset, { chartInterval: interval });
  }, [interval]);

  // Persist candle limit on change
  useEffect(() => {
    saveTradeSettings(selectedAsset, { candleLimit });
  }, [candleLimit]);

  // Reload persisted interval when asset changes
  useEffect(() => {
    const saved = loadTradeSettings(selectedAsset);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInterval((saved.chartInterval as Interval) || '1h');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCandleLimit(
      CANDLE_LIMITS.includes(saved.candleLimit as typeof CANDLE_LIMITS[number])
        ? saved.candleLimit
        : 200,
    );
  }, [selectedAsset]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const toggleIndicator = useCallback((id: IndicatorId) => {
    setActiveIndicators(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  }, []);

  // ── Indicator pane layout ────────────────────────────
  // When both RSI and MACD are shown they get separate non-overlapping zones.
  // Volume sits in the very bottom strip; when MACD is active, volume is hidden
  // to avoid overlapping the MACD pane.
  const indicatorMargins = useMemo(() => {
    const hasRsi = activeIndicators.includes('rsi');
    const hasMacd = activeIndicators.includes('macd');
    if (hasRsi && hasMacd) {
      return {
        mainBottom: 0.55,            // main chart shrinks to top 45%
        volumeTop: 0.85,
        hideVolume: true,
        rsi: { top: 0.50, bottom: 0.27 },   // middle zone ~23%
        macd: { top: 0.77, bottom: 0 },      // bottom zone ~23%
      };
    }
    if (hasRsi) {
      return {
        mainBottom: 0.35,
        volumeTop: 0.85,
        hideVolume: false,
        rsi: { top: 0.67, bottom: 0 },
      };
    }
    if (hasMacd) {
      return {
        mainBottom: 0.35,
        volumeTop: 0.85,
        hideVolume: false,
        macd: { top: 0.67, bottom: 0 },
      };
    }
    return {
      mainBottom: 0.25,
      volumeTop: 0.85,
      hideVolume: false,
    };
  }, [activeIndicators]);

  // ── Update indicator series ──
  const updateIndicators = useCallback(() => {
    const candles = candleCacheRef.current;
    const chart = chartRef.current;
    if (!candles.length || !chart) return;

    const closes = candles.map(c => c.close);
    const timestamps = candles.map(c => c.timestamp);
    const data = computeIndicators(closes, timestamps, activeIndicators);

    const wantedKeys = new Set<string>();

    // Adjust main chart and volume price scales
    chart.priceScale('right').applyOptions({
      scaleMargins: { top: 0.1, bottom: indicatorMargins.mainBottom },
    });
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({
        visible: !indicatorMargins.hideVolume,
      });
    }

    // SMA overlay
    if (data.sma?.lineData?.length) {
      const key = 'sma';
      wantedKeys.add(key);
      let series = indicatorSeriesRef.current.get(key) as ISeriesApi<'Line'> | undefined;
      if (!series) {
        series = chart.addSeries(LineSeries, {
          color: INDICATOR_COLORS.sma,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        indicatorSeriesRef.current.set(key, series);
      }
      series.setData(data.sma.lineData as LineData[]);
    }

    // EMA overlay
    if (data.ema?.lineData?.length) {
      const key = 'ema';
      wantedKeys.add(key);
      let series = indicatorSeriesRef.current.get(key) as ISeriesApi<'Line'> | undefined;
      if (!series) {
        series = chart.addSeries(LineSeries, {
          color: INDICATOR_COLORS.ema,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        indicatorSeriesRef.current.set(key, series);
      }
      series.setData(data.ema.lineData as LineData[]);
    }

    // Bollinger Bands
    const bb = data.bollinger as
      | { upper?: { time: number; value: number }[]; middle?: { time: number; value: number }[]; lower?: { time: number; value: number }[] }
      | undefined;
    if (bb) {
      ['middle', 'upper', 'lower'].forEach(band => {
        const bandData = bb[band as keyof typeof bb];
        if (bandData?.length) {
          const key = `bb_${band}`;
          wantedKeys.add(key);
          let series = indicatorSeriesRef.current.get(key) as ISeriesApi<'Line'> | undefined;
          if (!series) {
            series = chart.addSeries(LineSeries, {
              color: INDICATOR_COLORS.bollinger,
              lineWidth: 1,
              lineStyle: band === 'middle' ? LineStyle.Solid : LineStyle.Dashed,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            indicatorSeriesRef.current.set(key, series);
          }
          series.setData(bandData as LineData[]);
        }
      });
    }

    // RSI (separate price scale, middle zone when MACD is also active)
    if (data.rsi?.lineData?.length) {
      const key = 'rsi';
      wantedKeys.add(key);
      let series = indicatorSeriesRef.current.get(key) as ISeriesApi<'Line'> | undefined;
      if (!series) {
        series = chart.addSeries(LineSeries, {
          color: INDICATOR_COLORS.rsi,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          priceScaleId: 'rsi',
        });
        indicatorSeriesRef.current.set(key, series);
      }
      series.applyOptions({ priceScaleId: 'rsi' });
      chart.priceScale('rsi').applyOptions({
        scaleMargins: indicatorMargins.rsi ?? { top: 0.67, bottom: 0 },
        visible: true,
        borderVisible: true,
      });
      series.setData(data.rsi.lineData as LineData[]);
    }

    // MACD (separate price scale, bottom zone when RSI is also active)
    const macdResult = data.macd as
      | { macdLine?: { time: number; value: number }[]; signalLine?: { time: number; value: number }[]; histogram?: { time: number; value: number; color?: string }[] }
      | undefined;
    if (macdResult) {
      if (macdResult.macdLine?.length) {
        const key = 'macd_line';
        wantedKeys.add(key);
        let series = indicatorSeriesRef.current.get(key) as ISeriesApi<'Line'> | undefined;
        if (!series) {
          series = chart.addSeries(LineSeries, {
            color: INDICATOR_COLORS.macd,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            priceScaleId: 'macd',
          });
          indicatorSeriesRef.current.set(key, series);
        }
        series.applyOptions({ priceScaleId: 'macd' });
        chart.priceScale('macd').applyOptions({
          scaleMargins: indicatorMargins.macd ?? { top: 0.67, bottom: 0 },
          visible: true,
          borderVisible: true,
        });
        series.setData(macdResult.macdLine as LineData[]);
      }
      if (macdResult.signalLine?.length) {
        const key = 'macd_signal';
        wantedKeys.add(key);
        let series = indicatorSeriesRef.current.get(key) as ISeriesApi<'Line'> | undefined;
        if (!series) {
          series = chart.addSeries(LineSeries, {
            color: '#f59e0b',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            priceScaleId: 'macd',
          });
          indicatorSeriesRef.current.set(key, series);
        }
        series.applyOptions({ priceScaleId: 'macd' });
        series.setData(macdResult.signalLine as LineData[]);
      }
      if (macdResult.histogram?.length) {
        const key = 'macd_histogram';
        wantedKeys.add(key);
        let series = indicatorSeriesRef.current.get(key) as ISeriesApi<'Histogram'> | undefined;
        if (!series) {
          series = chart.addSeries(HistogramSeries, {
            priceFormat: { type: 'volume' },
            priceScaleId: 'macd',
          });
          indicatorSeriesRef.current.set(key, series);
        }
        series.applyOptions({ priceScaleId: 'macd' });
        series.setData(macdResult.histogram as HistogramData[]);
      }
    }

    // Remove unwanted indicator series
    indicatorSeriesRef.current.forEach((series, key) => {
      if (!wantedKeys.has(key)) {
        chart.removeSeries(series);
        indicatorSeriesRef.current.delete(key);
      }
    });
  }, [activeIndicators, indicatorMargins]);

  const setMainSeriesData = useCallback((
    series: MainSeriesApi,
    candles: Candle[],
  ) => {
    if (chartType === 'candlestick') {
      (series as ISeriesApi<'Candlestick'>).setData(
        candles.map(c => ({
          time: (c.timestamp / 1000) as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })),
      );
    } else {
      const lineData: LineData[] = candles.map(c => ({
        time: (c.timestamp / 1000) as Time,
        value: c.close,
      }));
      if (chartType === 'area') {
        (series as ISeriesApi<'Area'>).setData(lineData);
      } else {
        (series as ISeriesApi<'Line'>).setData(lineData);
      }
    }
  }, [chartType]);

  const fetchCandles = useCallback(
    async (symbol: string, iv: Interval, limit?: number) => {
      setLoading(true);
      const useLimit = limit ?? candleLimit;
      try {
        const res = await fetch(
          `/api/market/candles?symbol=${symbol}&interval=${iv}&limit=${useLimit}`,
          { cache: 'no-store' },
        );
        const data = await res.json();
        if (data.candles && mainSeriesRef.current) {
          candleCacheRef.current = data.candles;

          setMainSeriesData(mainSeriesRef.current, data.candles);

          const volumeData: HistogramData[] = data.candles.map((c: Candle) => ({
            time: (c.timestamp / 1000) as Time,
            value: c.volume,
            color: c.close >= c.open
              ? getCssVar('lc-volume-up', 'rgba(34,197,94,0.3)')
              : getCssVar('lc-volume-down', 'rgba(239,68,68,0.3)'),
          }));
          if (volumeSeriesRef.current) {
            volumeSeriesRef.current.setData(volumeData);
          }

          chartRef.current?.timeScale().fitContent();
          updateIndicators();
        }
      } catch (err) {
        console.warn('Failed to fetch candles:', err);
      } finally {
        setLoading(false);
      }
    },
    [updateIndicators, setMainSeriesData, candleLimit],
  );

  // Create appropriate main series based on chartType
  const createMainSeries = useCallback((chart: IChartApi, ct: ChartType) => {
    const t = getChartTheme();
    if (ct === 'candlestick') {
      return chart.addSeries(CandlestickSeries, {
        upColor: t.candleUp,
        downColor: t.candleDown,
        borderDownColor: t.candleDown,
        borderUpColor: t.candleUp,
        wickDownColor: t.candleDown,
        wickUpColor: t.candleUp,
        priceFormat: { type: 'price', minMove: 0.01 },
      });
    }
    const lineColor = t.candleUp;
    if (ct === 'area') {
      return chart.addSeries(AreaSeries, {
        lineColor: lineColor,
        topColor: `${lineColor}40`,
        bottomColor: `${lineColor}05`,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: '#ffffff',
        crosshairMarkerBackgroundColor: lineColor,
        priceFormat: { type: 'price', minMove: 0.01 },
        lastValueVisible: true,
        priceLineVisible: false,
      });
    }
    return chart.addSeries(LineSeries, {
      color: lineColor,
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '#ffffff',
      crosshairMarkerBackgroundColor: lineColor,
      priceFormat: { type: 'price', minMove: 0.01 },
      lastValueVisible: true,
      priceLineVisible: false,
    });
  }, []);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const t = getChartTheme();

    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: t.textColor,
        fontSize: 11,
        fontFamily: "'IBM Plex Mono', monospace",
      },
      grid: {
        vertLines: { color: t.gridColor },
        horzLines: { color: t.gridColor },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: t.crosshairColor,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: t.crosshairColor,
        },
        horzLine: {
          color: t.crosshairColor,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: t.crosshairColor,
        },
      },
      timeScale: {
        borderColor: t.borderColor,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: t.borderColor,
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      handleScroll: { horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { pinch: true },
    });

    chartRef.current = chart;
    mainSeriesRef.current = createMainSeries(chart, chartType);

    if (!simplified) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      });
      volumeSeriesRef.current = volumeSeries;
    }

    const indicatorSeriesMap = indicatorSeriesRef.current;
    return () => {
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
      compareSeriesRef.current = null;
      indicatorSeriesMap.clear();
    }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When chartType changes, recreate the main series
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const old = mainSeriesRef.current;
    if (old) {
      chart.removeSeries(old);
      mainSeriesRef.current = null;
    }

    mainSeriesRef.current = createMainSeries(chart, chartType);

    if (candleCacheRef.current.length > 0) {
      setMainSeriesData(mainSeriesRef.current, candleCacheRef.current);
    }

    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({
        visible: chartType === 'candlestick',
      });
    }
  }, [chartType, createMainSeries, setMainSeriesData]);

  // When compareAsset changes, fetch its data and create/update overlay series
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (compareSeriesRef.current) {
      chart.removeSeries(compareSeriesRef.current);
      compareSeriesRef.current = null;
    }

    if (!compareAsset || compareAsset === selectedAsset) return;

    let cancelled = false;
    fetch(`/api/market/candles?symbol=${compareAsset}&interval=${interval}&limit=${candleLimit}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (cancelled || !chart || !data.candles) return;
        const lineData: LineData[] = data.candles.map((c: Candle) => ({
          time: (c.timestamp / 1000) as Time,
          value: c.close,
        }));
        const series = chart.addSeries(LineSeries, {
          color: '#818cf8',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: true,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 3,
          crosshairMarkerBorderColor: '#ffffff',
          crosshairMarkerBackgroundColor: '#818cf8',
        });
        series.setData(lineData);
        compareSeriesRef.current = series;
      })
      .catch((err) => { console.warn('Failed to fetch compare asset candles:', err); });

    return () => { cancelled = true; };
  }, [compareAsset, selectedAsset, interval, candleLimit]);

  // Update chart colors on theme change
  useEffect(() => {
    if (!mounted || !chartRef.current) return;

    const t = getChartTheme();
    chartRef.current.applyOptions({
      layout: { textColor: t.textColor },
      grid: {
        vertLines: { color: t.gridColor },
        horzLines: { color: t.gridColor },
      },
      crosshair: {
        vertLine: { color: t.crosshairColor, width: 1, style: LineStyle.Dashed, labelBackgroundColor: t.crosshairColor },
        horzLine: { color: t.crosshairColor, width: 1, style: LineStyle.Dashed, labelBackgroundColor: t.crosshairColor },
      },
      timeScale: { borderColor: t.borderColor },
      rightPriceScale: { borderColor: t.borderColor },
    });
    if (chartType === 'candlestick' && mainSeriesRef.current) {
      (mainSeriesRef.current as ISeriesApi<'Candlestick'>).applyOptions({
        upColor: t.candleUp,
        downColor: t.candleDown,
        borderDownColor: t.candleDown,
        borderUpColor: t.candleUp,
        wickDownColor: t.candleDown,
        wickUpColor: t.candleUp,
      });
    } else if (chartType === 'area' && mainSeriesRef.current) {
      (mainSeriesRef.current as ISeriesApi<'Area'>).applyOptions({
        lineColor: t.candleUp,
        topColor: `${t.candleUp}40`,
        bottomColor: `${t.candleUp}05`,
        crosshairMarkerBackgroundColor: t.candleUp,
      });
    } else if (mainSeriesRef.current) {
      (mainSeriesRef.current as ISeriesApi<'Line'>).applyOptions({
        color: t.candleUp,
        crosshairMarkerBackgroundColor: t.candleUp,
      });
    }
  }, [theme, mounted, chartType]);

  // Fetch candles on asset, interval, or candle limit change
  useEffect(() => {
    if (selectedAsset) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchCandles(selectedAsset, interval, candleLimit);
    }
  }, [selectedAsset, interval, candleLimit, fetchCandles]);

  // Update indicators when active set changes
  useEffect(() => {
    if (candleCacheRef.current.length > 0) {
      updateIndicators();
    }
  }, [activeIndicators, updateIndicators]);

  // Fetch open positions and draw liquidation price line
  useEffect(() => {
    const series = mainSeriesRef.current;
    if (!series) return;

    if (liqPriceLineRef.current) {
      series.removePriceLine(liqPriceLineRef.current);
      liqPriceLineRef.current = null;
    }

    let cancelled = false;

    fetch('/api/positions', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (cancelled || !series) return;
        const positions = data.positions as Array<{ assetSymbol: string; liquidationPrice: number; side: string }>;
        const pos = positions.find(p => p.assetSymbol === selectedAsset);
        if (pos && pos.liquidationPrice > 0) {
          liqPriceLineRef.current = series.createPriceLine({
            price: pos.liquidationPrice,
            color: '#ef4444',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `Liq (${pos.side})`,
          });
        }
      })
      .catch((err) => { console.warn('Failed to fetch positions for liquidation line:', err); });

    return () => { cancelled = true; };
  }, [selectedAsset]);

  const isDesktop = !simplified;

  return (
    <>
      <ChartToolbar
        intervals={intervals}
        interval={interval}
        chartType={chartType}
        compareAsset={compareAsset}
        selectedAsset={selectedAsset}
        activeIndicators={activeIndicators}
        loading={loading}
        isDesktop={isDesktop}
        candleLimit={candleLimit}
        onIntervalChange={(iv) => {
          setInterval(iv as Interval);
          setCandleLimit(getDefaultCandleLimit(iv));
        }}
        onChartTypeChange={setChartType}
        onCompareAssetChange={setCompareAsset}
        onIndicatorToggle={toggleIndicator}
        onRemoveCompare={() => setCompareAsset('')}
        onCandleLimitChange={(limit) => setCandleLimit(limit)}
      />

      {/* Chart */}
      <div ref={chartContainerRef} className='min-h-0 flex-1' />
    </>
  );
});
