'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { formatUsd } from '@/lib/utils';
import { format } from 'date-fns';

import type { EquityPoint } from '@/server/actions/portfolio';

interface EquityChartProps {
  data: EquityPoint[];
}

function getCssVar(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
}

export function EquityChart({ data }: EquityChartProps) {
  useTheme(); // subscribe to theme changes to re-read CSS variables
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isReady = mounted;

  if (data.length === 0) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <p className='text-sm text-muted-foreground'>
          No equity history available
        </p>
      </div>
    );
  }

  const equityValues = data.map(d => d.equity);
  const minEquity = Math.min(...equityValues);
  const maxEquity = Math.max(...equityValues);
  const padding =
    (maxEquity - minEquity) * 0.15 || Math.abs(minEquity) * 0.1 || 100;
  const startEquity = data[0]?.equity ?? 0;
  const endEquity = data[data.length - 1]?.equity ?? 0;
  const isPositive = endEquity >= startEquity;

  // Read CSS variables for chart colors — re-evaluated on each render
  const positive = isReady ? getCssVar('positive') || '#22c55e' : '#22c55e';
  const negative = isReady ? getCssVar('negative') || '#ef4444' : '#ef4444';
  const mutedFg = isReady ? getCssVar('muted-foreground') || '#888' : '#888';
  const border = isReady ? getCssVar('border') || 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.1)';
  const cardBg = isReady ? getCssVar('card') || '#fff' : '#fff';

  return (
    <div className='h-72 w-full md:h-80'>
      <ResponsiveContainer width='100%' height='100%'>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id='equityGradient' x1='0' y1='0' x2='0' y2='1'>
              <stop
                offset='0%'
                stopColor={isPositive ? positive : negative}
                stopOpacity={0.25}
              />
              <stop
                offset='100%'
                stopColor={isPositive ? positive : negative}
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray='3 3'
            stroke={border}
            vertical={false}
          />
          <XAxis
            dataKey='timestamp'
            tickFormatter={(ts: string) => format(new Date(ts), 'HH:mm')}
            tick={{ fontSize: 10, fill: mutedFg }}
            axisLine={false}
            tickLine={false}
            dy={6}
            interval='preserveStartEnd'
            minTickGap={40}
          />
          <YAxis
            domain={[minEquity - padding, maxEquity + padding]}
            tickFormatter={(v: number) => formatUsd(v)}
            tick={{ fontSize: 10, fill: mutedFg }}
            axisLine={false}
            tickLine={false}
            dx={-4}
            width={70}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const point = payload[0].payload as EquityPoint;
              return (
                <div className='rounded-lg border border-border bg-popover px-3 py-2 shadow-md'>
                  <p className='text-xs text-muted-foreground'>
                    {format(new Date(point.timestamp), 'MMM dd HH:mm')}
                  </p>
                  <p className='font-mono text-sm font-semibold tabular-nums text-foreground'>
                    {formatUsd(point.equity)}
                  </p>
                </div>
              );
            }}
          />
          <Area
            type='monotone'
            dataKey='equity'
            stroke={isPositive ? positive : negative}
            strokeWidth={2}
            fill='url(#equityGradient)'
            dot={false}
            activeDot={{
              r: 4,
              stroke: cardBg,
              strokeWidth: 2,
              fill: isPositive ? positive : negative,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
