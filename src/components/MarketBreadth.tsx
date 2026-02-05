'use client';

import { useState, useEffect, useMemo } from 'react';

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  price_change_24h: number | null;
  price_change_percentage_24h: number | null;
  price_change_percentage_7d: number | null;
  current_price: number;
  market_cap: number;
}

interface BreadthData {
  advancing: number;
  declining: number;
  unchanged: number;
  total: number;
  adRatio: number;
  newHighs: number;
  newLows: number;
  avgChange: number;
  medianChange: number;
  strongBulls: number; // >5% gain
  strongBears: number; // >5% loss
}

async function fetchMarketBreadth(): Promise<CoinData[]> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&sparkline=false&price_change_percentage=7d'
    );
    if (!res.ok) return [];
    const data = await res.json();
    
    return data.map((coin: any) => ({
      id: coin.id,
      symbol: (coin.symbol || '').toUpperCase(),
      name: coin.name || '',
      price_change_24h: coin.price_change_24h ?? null,
      price_change_percentage_24h: coin.price_change_percentage_24h ?? null,
      price_change_percentage_7d: coin.price_change_percentage_7d_in_currency ?? null,
      current_price: coin.current_price || 0,
      market_cap: coin.market_cap || 0,
    }));
  } catch {
    return [];
  }
}

function calculateBreadth(coins: CoinData[]): BreadthData {
  const withChanges = coins.filter(c => c.price_change_percentage_24h !== null);
  const changes = withChanges.map(c => c.price_change_percentage_24h!);
  
  const advancing = changes.filter(c => c > 0.1).length;
  const declining = changes.filter(c => c < -0.1).length;
  const unchanged = changes.length - advancing - declining;
  const adRatio = declining > 0 ? advancing / declining : advancing > 0 ? 10 : 1;
  
  const sorted = [...changes].sort((a, b) => a - b);
  const medianChange = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
  const avgChange = changes.length > 0 ? changes.reduce((s, c) => s + c, 0) / changes.length : 0;
  
  return {
    advancing,
    declining,
    unchanged,
    total: changes.length,
    adRatio,
    newHighs: 0,
    newLows: 0,
    avgChange,
    medianChange,
    strongBulls: changes.filter(c => c > 5).length,
    strongBears: changes.filter(c => c < -5).length,
  };
}

export default function MarketBreadth({ className = '' }: { className?: string }) {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const data = await fetchMarketBreadth();
      if (!cancelled) {
        setCoins(data);
        setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 300000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isOpen]);

  const breadth = useMemo(() => calculateBreadth(coins), [coins]);
  const advPct = breadth.total > 0 ? (breadth.advancing / breadth.total) * 100 : 50;

  // Sector breakdown (by market cap tier)
  const tiers = useMemo(() => {
    if (coins.length === 0) return [];
    const top10 = coins.slice(0, 10);
    const mid = coins.slice(10, 50);
    const small = coins.slice(50);

    function tierStats(list: CoinData[]) {
      const changes = list.filter(c => c.price_change_percentage_24h !== null).map(c => c.price_change_percentage_24h!);
      const up = changes.filter(c => c > 0).length;
      const down = changes.filter(c => c < 0).length;
      const avg = changes.length > 0 ? changes.reduce((s, c) => s + c, 0) / changes.length : 0;
      return { up, down, total: changes.length, avg };
    }

    return [
      { name: 'Large Cap (Top 10)', ...tierStats(top10) },
      { name: 'Mid Cap (#11-50)', ...tierStats(mid) },
      { name: 'Small Cap (#51-100)', ...tierStats(small) },
    ];
  }, [coins]);

  // Market breadth interpretation
  const interpretation = useMemo(() => {
    if (breadth.total === 0) return '';
    if (breadth.adRatio > 3) return '🟢 Extremely bullish breadth — broad rally across crypto market';
    if (breadth.adRatio > 2) return '🟢 Strong bullish breadth — majority of market advancing';
    if (breadth.adRatio > 1.2) return '🔵 Mildly bullish — more advancing than declining';
    if (breadth.adRatio > 0.8) return '🟡 Mixed market — roughly equal advances and declines';
    if (breadth.adRatio > 0.5) return '🟠 Mildly bearish — more declining than advancing';
    return '🔴 Strong bearish breadth — widespread selling across market';
  }, [breadth]);

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="font-semibold text-[var(--text-primary)]">Market Breadth</h3>
          <span className="text-xs text-[var(--text-secondary)]">Top 100 Crypto</span>
        </div>
        <div className="flex items-center gap-2">
          {breadth.total > 0 && (
            <span className={`text-sm font-medium ${breadth.adRatio > 1 ? 'text-green-400' : 'text-red-400'}`}>
              A/D: {breadth.adRatio.toFixed(2)}
            </span>
          )}
          <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {loading && coins.length === 0 ? (
            <div className="text-center text-[var(--text-secondary)] py-6">Loading market breadth data...</div>
          ) : (
            <>
              {/* A/D Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-green-400">↑ {breadth.advancing} advancing ({advPct.toFixed(0)}%)</span>
                  <span className="text-gray-400">{breadth.unchanged} flat</span>
                  <span className="text-red-400">↓ {breadth.declining} declining ({(100 - advPct).toFixed(0)}%)</span>
                </div>
                <div className="h-4 bg-red-500/30 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-green-500/70 transition-all"
                    style={{ width: `${advPct}%` }}
                  />
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[var(--bg-hover)] rounded-lg p-2 text-center">
                  <div className="text-xs text-[var(--text-secondary)]">A/D Ratio</div>
                  <div className={`text-lg font-bold ${breadth.adRatio > 1 ? 'text-green-400' : 'text-red-400'}`}>
                    {breadth.adRatio.toFixed(2)}
                  </div>
                </div>
                <div className="bg-[var(--bg-hover)] rounded-lg p-2 text-center">
                  <div className="text-xs text-[var(--text-secondary)]">Avg Change</div>
                  <div className={`text-lg font-bold ${breadth.avgChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {breadth.avgChange >= 0 ? '+' : ''}{breadth.avgChange.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-[var(--bg-hover)] rounded-lg p-2 text-center">
                  <div className="text-xs text-[var(--text-secondary)]">Strong Bulls ({'>'}5%)</div>
                  <div className="text-lg font-bold text-green-400">{breadth.strongBulls}</div>
                </div>
                <div className="bg-[var(--bg-hover)] rounded-lg p-2 text-center">
                  <div className="text-xs text-[var(--text-secondary)]">Strong Bears ({'<'}-5%)</div>
                  <div className="text-lg font-bold text-red-400">{breadth.strongBears}</div>
                </div>
              </div>

              {/* Tier Breakdown */}
              <div>
                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">By Market Cap Tier</h4>
                <div className="space-y-2">
                  {tiers.map(tier => {
                    const upPct = tier.total > 0 ? (tier.up / tier.total) * 100 : 50;
                    return (
                      <div key={tier.name}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-[var(--text-primary)]">{tier.name}</span>
                          <span className={tier.avg >= 0 ? 'text-green-400' : 'text-red-400'}>
                            Avg: {tier.avg >= 0 ? '+' : ''}{tier.avg.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 bg-red-500/20 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500/60 rounded-full" style={{ width: `${upPct}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                          <span>↑{tier.up}</span>
                          <span>↓{tier.down}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Interpretation */}
              <div className="bg-[var(--bg-hover)] rounded-lg p-3 text-sm">
                {interpretation}
              </div>

              <div className="text-xs text-[var(--text-secondary)]">
                Market breadth measures how many assets participate in a move. Strong A/D ratio confirms trend health.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
