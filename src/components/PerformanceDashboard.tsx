'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { PortfolioWithPrices } from '@/hooks/usePortfolio';

interface PerformanceSnapshot {
  timestamp: number;
  totalValue: number;
  totalCost: number;
  holdings: { symbol: string; value: number; pnl: number }[];
}

interface PerformanceDashboardProps {
  holdings: PortfolioWithPrices[];
  totalValue: number;
  totalCost: number;
  className?: string;
}

const STORAGE_KEY = 'chartwise-performance-history';

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function PerformanceDashboard({
  holdings,
  totalValue,
  totalCost,
  className = '',
}: PerformanceDashboardProps) {
  const [history, setHistory] = useState<PerformanceSnapshot[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');

  // Load history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  // Record daily snapshot (once per day)
  useEffect(() => {
    if (holdings.length === 0 || totalValue <= 0) return;

    const now = Date.now();
    const today = new Date().toDateString();
    const hasToday = history.some(s => new Date(s.timestamp).toDateString() === today);

    if (!hasToday) {
      const snapshot: PerformanceSnapshot = {
        timestamp: now,
        totalValue,
        totalCost,
        holdings: holdings.map(h => ({
          symbol: h.symbol,
          value: h.value,
          pnl: h.pnl,
        })),
      };

      const newHistory = [...history, snapshot].slice(-365); // Keep up to 365 days
      setHistory(newHistory);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    }
  }, [holdings, totalValue, totalCost, history]);

  const filteredHistory = useMemo(() => {
    if (timeRange === 'all') return history;
    const cutoff = Date.now() - (timeRange === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000;
    return history.filter(s => s.timestamp >= cutoff);
  }, [history, timeRange]);

  const stats = useMemo(() => {
    if (filteredHistory.length === 0) return null;

    const first = filteredHistory[0];
    const last = filteredHistory[filteredHistory.length - 1];
    const valueChange = last.totalValue - first.totalValue;
    const valueChangePct = first.totalValue > 0
      ? ((last.totalValue - first.totalValue) / first.totalValue) * 100
      : 0;

    const maxValue = Math.max(...filteredHistory.map(s => s.totalValue));
    const minValue = Math.min(...filteredHistory.map(s => s.totalValue));
    const drawdown = maxValue > 0 ? ((maxValue - minValue) / maxValue) * 100 : 0;

    // Daily returns for volatility
    const dailyReturns: number[] = [];
    for (let i = 1; i < filteredHistory.length; i++) {
      if (filteredHistory[i - 1].totalValue > 0) {
        dailyReturns.push(
          (filteredHistory[i].totalValue - filteredHistory[i - 1].totalValue) / filteredHistory[i - 1].totalValue
        );
      }
    }

    const avgReturn = dailyReturns.length > 0
      ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length
      : 0;

    const variance = dailyReturns.length > 0
      ? dailyReturns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length
      : 0;
    const volatility = Math.sqrt(variance) * 100;

    // Best and worst days
    const bestDay = dailyReturns.length > 0 ? Math.max(...dailyReturns) * 100 : 0;
    const worstDay = dailyReturns.length > 0 ? Math.min(...dailyReturns) * 100 : 0;

    return {
      valueChange,
      valueChangePct,
      maxValue,
      minValue,
      drawdown,
      volatility,
      bestDay,
      worstDay,
      dataPoints: filteredHistory.length,
    };
  }, [filteredHistory]);

  // Asset allocation
  const allocation = useMemo(() => {
    if (holdings.length === 0 || totalValue <= 0) return [];
    return holdings
      .map(h => ({
        symbol: h.symbol,
        value: h.value,
        pct: (h.value / totalValue) * 100,
        pnl: h.pnl,
        pnlPct: h.pnlPercent,
      }))
      .sort((a, b) => b.value - a.value);
  }, [holdings, totalValue]);

  if (holdings.length === 0) return null;

  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Performance Dashboard</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)} ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)
          </span>
          <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-[var(--bg-hover)] rounded-lg p-2">
              <div className="text-xs text-[var(--text-secondary)]">Total Value</div>
              <div className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(totalValue)}</div>
            </div>
            <div className="bg-[var(--bg-hover)] rounded-lg p-2">
              <div className="text-xs text-[var(--text-secondary)]">Total Cost</div>
              <div className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(totalCost)}</div>
            </div>
            <div className="bg-[var(--bg-hover)] rounded-lg p-2">
              <div className="text-xs text-[var(--text-secondary)]">P&L</div>
              <div className={`text-sm font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
              </div>
            </div>
            <div className="bg-[var(--bg-hover)] rounded-lg p-2">
              <div className="text-xs text-[var(--text-secondary)]">Return</div>
              <div className={`text-sm font-bold ${totalPnlPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Equity Curve */}
          {filteredHistory.length > 1 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--text-secondary)]">Portfolio Value Over Time</span>
                <div className="flex gap-1">
                  {(['7d', '30d', 'all'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-2 py-0.5 text-xs rounded transition-colors ${
                        timeRange === range
                          ? 'bg-blue-500 text-white'
                          : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {range === 'all' ? 'All' : range.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--bg-hover)] rounded-lg p-2">
                <svg width="100%" height="80" viewBox="0 0 300 80" preserveAspectRatio="none">
                  {(() => {
                    const values = filteredHistory.map(s => s.totalValue);
                    const min = Math.min(...values);
                    const max = Math.max(...values);
                    const range = max - min || 1;
                    const isUp = values[values.length - 1] >= values[0];

                    const points = values.map((v, i) => {
                      const x = (i / (values.length - 1)) * 300;
                      const y = 75 - ((v - min) / range) * 70;
                      return `${x},${y}`;
                    }).join(' ');

                    const areaPoints = `0,75 ${points} 300,75`;

                    return (
                      <>
                        <polygon
                          fill={isUp ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
                          points={areaPoints}
                        />
                        <polyline
                          fill="none"
                          stroke={isUp ? '#22c55e' : '#ef4444'}
                          strokeWidth="2"
                          points={points}
                        />
                        {/* Cost basis line */}
                        {totalCost > 0 && (
                          <line
                            x1="0"
                            y1={75 - ((totalCost - min) / range) * 70}
                            x2="300"
                            y2={75 - ((totalCost - min) / range) * 70}
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="1"
                            strokeDasharray="4,4"
                          />
                        )}
                      </>
                    );
                  })()}
                </svg>
                <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-1">
                  <span>{formatDate(filteredHistory[0].timestamp)}</span>
                  <span>{formatDate(filteredHistory[filteredHistory.length - 1].timestamp)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          {stats && stats.dataPoints > 1 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-[var(--bg-hover)] rounded-lg p-2">
                <div className="text-xs text-[var(--text-secondary)]">Max Drawdown</div>
                <div className="text-xs font-bold text-red-400">-{stats.drawdown.toFixed(2)}%</div>
              </div>
              <div className="bg-[var(--bg-hover)] rounded-lg p-2">
                <div className="text-xs text-[var(--text-secondary)]">Volatility</div>
                <div className="text-xs font-bold text-[var(--text-primary)]">{stats.volatility.toFixed(2)}%</div>
              </div>
              <div className="bg-[var(--bg-hover)] rounded-lg p-2">
                <div className="text-xs text-[var(--text-secondary)]">Best Day</div>
                <div className="text-xs font-bold text-green-400">+{stats.bestDay.toFixed(2)}%</div>
              </div>
              <div className="bg-[var(--bg-hover)] rounded-lg p-2">
                <div className="text-xs text-[var(--text-secondary)]">Worst Day</div>
                <div className="text-xs font-bold text-red-400">{stats.worstDay.toFixed(2)}%</div>
              </div>
            </div>
          )}

          {/* Asset Allocation */}
          {allocation.length > 0 && (
            <div>
              <span className="text-xs text-[var(--text-secondary)] block mb-2">Asset Allocation</span>
              
              {/* Allocation Bar */}
              <div className="h-4 flex rounded-full overflow-hidden mb-2">
                {allocation.map((asset, i) => {
                  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
                  return (
                    <div
                      key={asset.symbol}
                      style={{
                        width: `${asset.pct}%`,
                        backgroundColor: colors[i % colors.length],
                      }}
                      className="transition-all hover:opacity-80"
                      title={`${asset.symbol}: ${asset.pct.toFixed(1)}%`}
                    />
                  );
                })}
              </div>

              {/* Holdings Table */}
              <div className="space-y-1">
                {allocation.map((asset, i) => {
                  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
                  return (
                    <div key={asset.symbol} className="flex items-center gap-2 text-xs">
                      <div
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: colors[i % colors.length] }}
                      />
                      <span className="font-medium text-[var(--text-primary)] w-12">{asset.symbol}</span>
                      <span className="text-[var(--text-secondary)] w-16 text-right">{formatCurrency(asset.value)}</span>
                      <span className="text-[var(--text-secondary)] w-10 text-right">{asset.pct.toFixed(1)}%</span>
                      <span className={`ml-auto font-medium ${asset.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {asset.pnl >= 0 ? '+' : ''}{formatCurrency(asset.pnl)} ({asset.pnlPct >= 0 ? '+' : ''}{asset.pnlPct.toFixed(1)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
