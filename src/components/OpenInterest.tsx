'use client';

import { useState, useEffect, useMemo } from 'react';

interface OIData {
  symbol: string;
  sumOpenInterest: number;
  sumOpenInterestValue: number;
  timestamp: number;
}

interface OpenInterestProps {
  symbol: string;
  className?: string;
}

const BINANCE_SYMBOLS: Record<string, string> = {
  'BTC': 'BTCUSDT',
  'ETH': 'ETHUSDT',
  'SOL': 'SOLUSDT',
  'XRP': 'XRPUSDT',
  'SUI': 'SUIUSDT',
  'DOGE': 'DOGEUSDT',
  'ADA': 'ADAUSDT',
  'AVAX': 'AVAXUSDT',
  'LINK': 'LINKUSDT',
  'DOT': 'DOTUSDT',
};

async function fetchOpenInterest(symbol: string): Promise<OIData | null> {
  const binanceSymbol = BINANCE_SYMBOLS[symbol.toUpperCase()];
  if (!binanceSymbol) return null;

  try {
    const res = await fetch(
      `https://fapi.binance.com/fapi/v1/openInterest?symbol=${binanceSymbol}`
    );
    if (!res.ok) return null;
    const data = await res.json();

    return {
      symbol: binanceSymbol,
      sumOpenInterest: parseFloat(data.openInterest),
      sumOpenInterestValue: 0, // Will calculate from price
      timestamp: data.time,
    };
  } catch {
    return null;
  }
}

async function fetchOIHistory(symbol: string): Promise<{ oi: number; time: number }[]> {
  const binanceSymbol = BINANCE_SYMBOLS[symbol.toUpperCase()];
  if (!binanceSymbol) return [];

  try {
    const res = await fetch(
      `https://fapi.binance.com/futures/data/openInterestHist?symbol=${binanceSymbol}&period=1h&limit=48`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((d: { sumOpenInterest: string; timestamp: number }) => ({
      oi: parseFloat(d.sumOpenInterest),
      time: d.timestamp,
    }));
  } catch {
    return [];
  }
}

function formatValue(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatOI(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(2);
}

export default function OpenInterest({ symbol, className = '' }: OpenInterestProps) {
  const [currentOI, setCurrentOI] = useState<OIData | null>(null);
  const [history, setHistory] = useState<{ oi: number; time: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const isSupported = BINANCE_SYMBOLS[symbol.toUpperCase()] !== undefined;

  useEffect(() => {
    if (!isSupported || !isOpen) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      const [oi, hist] = await Promise.all([
        fetchOpenInterest(symbol),
        fetchOIHistory(symbol),
      ]);
      setCurrentOI(oi);
      setHistory(hist);
      setLoading(false);
    };

    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [symbol, isSupported, isOpen]);

  const oiChange = useMemo(() => {
    if (history.length < 2) return 0;
    const latest = history[history.length - 1].oi;
    const earlier = history[0].oi;
    return ((latest - earlier) / earlier) * 100;
  }, [history]);

  if (!isSupported) return null;

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📈</span>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Open Interest</h3>
        </div>
        <div className="flex items-center gap-2">
          {currentOI && !loading && (
            <span className="text-xs text-[var(--text-secondary)]">
              {formatOI(currentOI.sumOpenInterest)} {symbol}
            </span>
          )}
          <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="spinner" />
            </div>
          ) : currentOI ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[var(--bg-hover)] rounded-lg p-2">
                  <div className="text-xs text-[var(--text-secondary)]">Current OI</div>
                  <div className="text-sm font-bold text-[var(--text-primary)]">
                    {formatOI(currentOI.sumOpenInterest)}
                  </div>
                </div>
                <div className="bg-[var(--bg-hover)] rounded-lg p-2">
                  <div className="text-xs text-[var(--text-secondary)]">48h Change</div>
                  <div className={`text-sm font-bold ${oiChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {oiChange >= 0 ? '+' : ''}{oiChange.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* OI History bars */}
              {history.length > 0 && (
                <div>
                  <div className="text-xs text-[var(--text-secondary)] mb-1">48h History (1h intervals)</div>
                  <div className="flex items-end gap-[1px] h-12">
                    {history.map((h, i) => {
                      const maxOI = Math.max(...history.map(x => x.oi));
                      const minOI = Math.min(...history.map(x => x.oi));
                      const range = maxOI - minOI || 1;
                      const height = Math.max(4, ((h.oi - minOI) / range) * 48);
                      const isIncreasing = i > 0 && h.oi > history[i - 1].oi;
                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-t-sm ${isIncreasing ? 'bg-blue-500/70' : 'bg-gray-500/50'}`}
                          style={{ height: `${height}px` }}
                          title={`${formatOI(h.oi)} at ${new Date(h.time).toLocaleString()}`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded-lg p-2">
                <strong>Open Interest</strong> shows the total number of outstanding futures contracts.
                Rising OI with rising price = strong trend. Rising OI with falling price = bearish pressure.
              </div>
            </>
          ) : (
            <div className="text-center text-[var(--text-secondary)] text-sm py-4">
              Unable to fetch open interest data
            </div>
          )}
        </div>
      )}
    </div>
  );
}
