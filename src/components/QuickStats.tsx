'use client';

import { useMemo } from 'react';
import { OHLCV, RSI, ATR, SMA } from '@/utils/indicators';

interface QuickStatsProps {
  data: OHLCV[];
  symbol: string;
  className?: string;
}

export default function QuickStats({ data, symbol, className = '' }: QuickStatsProps) {
  const stats = useMemo(() => {
    if (data.length < 2) return null;

    const closes = data.map(d => d.close);
    const latest = data[data.length - 1];
    const first = data[0];

    // Period return
    const periodReturn = ((latest.close - first.close) / first.close) * 100;

    // Period High/Low
    const periodHigh = Math.max(...data.map(d => d.high));
    const periodLow = Math.min(...data.map(d => d.low));

    // Current RSI
    const rsiValues = RSI(closes);
    const currentRSI = rsiValues[rsiValues.length - 1];

    // Average True Range
    const atrValues = ATR(data);
    const currentATR = atrValues[atrValues.length - 1];

    // Volatility (standard deviation of returns)
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
    const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
    const volatility = Math.sqrt(
      returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / returns.length
    ) * Math.sqrt(365) * 100; // Annualized

    // SMA trend signal
    const sma20 = SMA(closes, 20);
    const sma50 = SMA(closes, 50);
    const lastSma20 = sma20[sma20.length - 1];
    const lastSma50 = sma50[sma50.length - 1];
    const trendSignal = !isNaN(lastSma20) && !isNaN(lastSma50)
      ? lastSma20 > lastSma50 ? 'Bullish' : 'Bearish'
      : 'N/A';

    // Average volume
    const volumes = data.filter(d => d.volume).map(d => d.volume!);
    const avgVolume = volumes.length > 0
      ? volumes.reduce((s, v) => s + v, 0) / volumes.length
      : 0;
    const latestVolume = volumes[volumes.length - 1] || 0;
    const volumeVsAvg = avgVolume > 0 ? ((latestVolume - avgVolume) / avgVolume) * 100 : 0;

    return {
      periodReturn,
      periodHigh,
      periodLow,
      currentRSI,
      currentATR,
      volatility,
      trendSignal,
      volumeVsAvg,
      dataPoints: data.length,
    };
  }, [data]);

  if (!stats) return null;

  const items = [
    {
      label: 'Return',
      value: `${stats.periodReturn >= 0 ? '+' : ''}${stats.periodReturn.toFixed(2)}%`,
      color: stats.periodReturn >= 0 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'RSI',
      value: isNaN(stats.currentRSI) ? '—' : stats.currentRSI.toFixed(0),
      color: stats.currentRSI > 70 ? 'text-red-400' : stats.currentRSI < 30 ? 'text-green-400' : 'text-[var(--text-primary)]',
    },
    {
      label: 'Volatility',
      value: `${stats.volatility.toFixed(1)}%`,
      color: stats.volatility > 100 ? 'text-red-400' : stats.volatility > 50 ? 'text-yellow-400' : 'text-green-400',
    },
    {
      label: 'Trend',
      value: stats.trendSignal,
      color: stats.trendSignal === 'Bullish' ? 'text-green-400' : stats.trendSignal === 'Bearish' ? 'text-red-400' : 'text-gray-400',
    },
    {
      label: 'Vol vs Avg',
      value: `${stats.volumeVsAvg >= 0 ? '+' : ''}${stats.volumeVsAvg.toFixed(0)}%`,
      color: Math.abs(stats.volumeVsAvg) > 50 ? 'text-yellow-400' : 'text-[var(--text-primary)]',
    },
  ];

  return (
    <div className={`flex items-center gap-4 px-4 py-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border)] overflow-x-auto text-xs ${className}`}>
      <span className="text-[var(--text-secondary)] font-medium shrink-0">📊 Quick Stats</span>
      <div className="w-px h-4 bg-gray-600" />
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1.5 shrink-0">
          <span className="text-[var(--text-secondary)]">{item.label}:</span>
          <span className={`font-medium ${item.color}`}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
