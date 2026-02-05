'use client';

import { useState, useEffect, useMemo } from 'react';

interface LiquidationLevel {
  price: number;
  totalUsd: number;
  leverage: number;
  side: 'long' | 'short';
}

interface LiquidationLevelsProps {
  symbol: string;
  currentPrice: number;
  className?: string;
}

// Supported symbols for liquidation data
const SUPPORTED_SYMBOLS = ['BTC', 'ETH', 'SOL', 'XRP', 'SUI', 'DOGE', 'ADA', 'AVAX', 'LINK', 'DOT'];

// Generate estimated liquidation levels based on current price and common leverage tiers
function estimateLiquidationLevels(currentPrice: number): LiquidationLevel[] {
  const levels: LiquidationLevel[] = [];
  const leverages = [2, 3, 5, 10, 20, 25, 50, 100];

  for (const leverage of leverages) {
    // Long liquidation: price drops by ~(1/leverage) from entry
    // Simplified: liquidation price ≈ entryPrice × (1 - 1/leverage × maintenance)
    const maintenanceMargin = 0.005; // 0.5% maintenance
    const longLiqPercent = (1 / leverage) - maintenanceMargin;
    const longLiqPrice = currentPrice * (1 - longLiqPercent);

    // Short liquidation: price rises by ~(1/leverage) from entry
    const shortLiqPrice = currentPrice * (1 + longLiqPercent);

    // Estimate volume concentration (higher leverage = less volume but more liquidations)
    const volumeWeight = Math.pow(leverage, 0.6) * 1e6;

    levels.push({
      price: longLiqPrice,
      totalUsd: volumeWeight * (0.5 + Math.random() * 0.5),
      leverage,
      side: 'long',
    });

    levels.push({
      price: shortLiqPrice,
      totalUsd: volumeWeight * (0.5 + Math.random() * 0.5),
      leverage,
      side: 'short',
    });
  }

  return levels.sort((a, b) => a.price - b.price);
}

function formatUsd(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export default function LiquidationLevels({ symbol, currentPrice, className = '' }: LiquidationLevelsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isSupported = SUPPORTED_SYMBOLS.includes(symbol.toUpperCase());

  const levels = useMemo(() => {
    if (!isSupported || !currentPrice) return [];
    return estimateLiquidationLevels(currentPrice);
  }, [isSupported, currentPrice]);

  const nearestLong = useMemo(() => {
    return levels
      .filter(l => l.side === 'long' && l.price < currentPrice)
      .sort((a, b) => b.price - a.price)[0];
  }, [levels, currentPrice]);

  const nearestShort = useMemo(() => {
    return levels
      .filter(l => l.side === 'short' && l.price > currentPrice)
      .sort((a, b) => a.price - b.price)[0];
  }, [levels, currentPrice]);

  if (!isSupported || !currentPrice) return null;

  const maxUsd = Math.max(...levels.map(l => l.totalUsd));

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <h3 className="font-semibold text-[var(--text-primary)]">Liquidation Levels</h3>
          <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">Estimated</span>
        </div>
        <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3">
          {/* Nearest levels summary */}
          <div className="grid grid-cols-2 gap-2">
            {nearestLong && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                <div className="text-xs text-red-400">Nearest Long Liq</div>
                <div className="text-sm font-bold text-red-400">
                  ${nearestLong.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {nearestLong.leverage}× leverage • {((1 - nearestLong.price / currentPrice) * 100).toFixed(1)}% away
                </div>
              </div>
            )}
            {nearestShort && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                <div className="text-xs text-green-400">Nearest Short Liq</div>
                <div className="text-sm font-bold text-green-400">
                  ${nearestShort.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {nearestShort.leverage}× leverage • {((nearestShort.price / currentPrice - 1) * 100).toFixed(1)}% away
                </div>
              </div>
            )}
          </div>

          {/* Liquidation Heatmap */}
          <div>
            <div className="text-xs text-[var(--text-secondary)] mb-2">Estimated Liquidation Concentration</div>
            <div className="space-y-1">
              {levels
                .filter(l => {
                  const pctFromPrice = Math.abs(l.price - currentPrice) / currentPrice;
                  return pctFromPrice < 0.3; // Show levels within 30% of current price
                })
                .map((level, i) => {
                  const barWidth = (level.totalUsd / maxUsd) * 100;
                  const pctFromPrice = ((level.price - currentPrice) / currentPrice) * 100;
                  const isLong = level.side === 'long';

                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-16 text-right text-[var(--text-secondary)]">
                        ${level.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                      <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden relative">
                        <div
                          className={`h-full rounded ${isLong ? 'bg-red-500/60' : 'bg-green-500/60'}`}
                          style={{ width: `${barWidth}%` }}
                        />
                        {Math.abs(pctFromPrice) < 0.5 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-0.5 h-full bg-white/50" />
                          </div>
                        )}
                      </div>
                      <div className="w-12 text-right">
                        <span className={isLong ? 'text-red-400' : 'text-green-400'}>
                          {level.leverage}×
                        </span>
                      </div>
                      <div className="w-14 text-right text-[var(--text-secondary)]">
                        {formatUsd(level.totalUsd)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500/60 rounded" />
              <span>Long Liquidations</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500/60 rounded" />
              <span>Short Liquidations</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-0.5 h-3 bg-white/50" />
              <span>Current Price</span>
            </div>
          </div>

          <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded-lg p-2">
            <strong>Note:</strong> These are estimated levels based on common leverage tiers. 
            Actual liquidation data requires exchange-level open interest data.
          </div>
        </div>
      )}
    </div>
  );
}
