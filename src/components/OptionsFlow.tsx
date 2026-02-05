'use client';

import { useState, useEffect, useMemo } from 'react';

interface OptionSummary {
  instrument_name: string;
  open_interest: number;
  volume: number;
  mark_iv: number;
  underlying_price: number;
  mark_price: number;
  strike: number;
  expiry: string;
  type: 'call' | 'put';
}

interface OptionsFlowProps {
  symbol: string;
  className?: string;
}

const SUPPORTED_OPTIONS: Record<string, string> = {
  'BTC': 'BTC',
  'ETH': 'ETH',
  'SOL': 'SOL',
};

function parseInstrumentName(name: string): { expiry: string; strike: number; type: 'call' | 'put' } | null {
  // Format: BTC-6FEB26-88000-P
  const parts = name.split('-');
  if (parts.length < 4) return null;
  const expiry = parts[1];
  const strike = parseInt(parts[2]);
  const type = parts[3] === 'C' ? 'call' : 'put';
  if (isNaN(strike)) return null;
  return { expiry, strike, type };
}

async function fetchOptionsData(currency: string): Promise<OptionSummary[]> {
  try {
    const res = await fetch(
      `https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=${currency}&kind=option`
    );
    if (!res.ok) return [];
    const data = await res.json();
    
    return (data.result || [])
      .map((opt: any) => {
        const parsed = parseInstrumentName(opt.instrument_name);
        if (!parsed) return null;
        return {
          instrument_name: opt.instrument_name,
          open_interest: opt.open_interest || 0,
          volume: opt.volume || 0,
          mark_iv: opt.mark_iv || 0,
          underlying_price: opt.underlying_price || 0,
          mark_price: opt.mark_price || 0,
          strike: parsed.strike,
          expiry: parsed.expiry,
          type: parsed.type,
        };
      })
      .filter(Boolean) as OptionSummary[];
  } catch {
    return [];
  }
}

function formatNumber(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

export default function OptionsFlow({ symbol, className = '' }: OptionsFlowProps) {
  const [options, setOptions] = useState<OptionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const currency = SUPPORTED_OPTIONS[symbol.toUpperCase()];

  useEffect(() => {
    if (!isOpen || !currency) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const data = await fetchOptionsData(currency);
      if (!cancelled) {
        setOptions(data);
        setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 60000); // refresh every minute
    return () => { cancelled = true; clearInterval(interval); };
  }, [isOpen, currency]);

  // Compute Put/Call ratio
  const stats = useMemo(() => {
    if (options.length === 0) return null;

    const calls = options.filter(o => o.type === 'call');
    const puts = options.filter(o => o.type === 'put');

    const callOI = calls.reduce((s, o) => s + o.open_interest, 0);
    const putOI = puts.reduce((s, o) => s + o.open_interest, 0);
    const callVol = calls.reduce((s, o) => s + o.volume, 0);
    const putVol = puts.reduce((s, o) => s + o.volume, 0);

    const pcRatioOI = callOI > 0 ? putOI / callOI : 0;
    const pcRatioVol = callVol > 0 ? putVol / callVol : 0;

    // Max Pain: strike with highest combined OI loss for option writers
    const strikes = [...new Set(options.map(o => o.strike))].sort((a, b) => a - b);
    let maxPainStrike = 0;
    let minPain = Infinity;

    for (const testStrike of strikes) {
      let pain = 0;
      for (const opt of options) {
        if (opt.type === 'call' && testStrike > opt.strike) {
          pain += (testStrike - opt.strike) * opt.open_interest;
        } else if (opt.type === 'put' && testStrike < opt.strike) {
          pain += (opt.strike - testStrike) * opt.open_interest;
        }
      }
      if (pain < minPain) {
        minPain = pain;
        maxPainStrike = testStrike;
      }
    }

    // Average IV
    const allIV = options.filter(o => o.mark_iv > 0).map(o => o.mark_iv);
    const avgIV = allIV.length > 0 ? allIV.reduce((s, v) => s + v, 0) / allIV.length : 0;

    const underlyingPrice = options[0]?.underlying_price || 0;

    return {
      callOI, putOI, callVol, putVol,
      pcRatioOI, pcRatioVol,
      maxPainStrike, avgIV, underlyingPrice,
      totalOI: callOI + putOI,
    };
  }, [options]);

  // OI by strike for visualization (top 15 strikes near current price)
  const oiByStrike = useMemo(() => {
    if (!stats || options.length === 0) return [];

    const price = stats.underlyingPrice;
    const strikeMap = new Map<number, { callOI: number; putOI: number }>();

    for (const opt of options) {
      const existing = strikeMap.get(opt.strike) || { callOI: 0, putOI: 0 };
      if (opt.type === 'call') existing.callOI += opt.open_interest;
      else existing.putOI += opt.open_interest;
      strikeMap.set(opt.strike, existing);
    }

    return Array.from(strikeMap.entries())
      .map(([strike, data]) => ({ strike, ...data }))
      .filter(s => Math.abs(s.strike - price) / price < 0.5) // within 50% of price
      .sort((a, b) => a.strike - b.strike)
      .slice(-20); // top 20 strikes
  }, [options, stats]);

  const maxOI = useMemo(() => {
    return Math.max(...oiByStrike.map(s => Math.max(s.callOI, s.putOI)), 1);
  }, [oiByStrike]);

  if (!currency) return null;

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="font-semibold text-[var(--text-primary)]">Options Flow</h3>
          <span className="text-xs text-[var(--text-secondary)]">{currency} Options via Deribit</span>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <span className={`text-sm font-medium ${stats.pcRatioOI > 1 ? 'text-red-400' : 'text-green-400'}`}>
              P/C: {stats.pcRatioOI.toFixed(2)}
            </span>
          )}
          <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {loading && options.length === 0 ? (
            <div className="text-center text-[var(--text-secondary)] py-6">Loading options data from Deribit...</div>
          ) : stats ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[var(--bg-hover)] rounded-lg p-3 text-center">
                  <div className="text-xs text-[var(--text-secondary)] mb-1">Put/Call Ratio (OI)</div>
                  <div className={`text-xl font-bold ${stats.pcRatioOI > 1 ? 'text-red-400' : stats.pcRatioOI < 0.7 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {stats.pcRatioOI.toFixed(3)}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {stats.pcRatioOI > 1.2 ? 'Bearish Sentiment' : stats.pcRatioOI < 0.7 ? 'Bullish Sentiment' : 'Neutral'}
                  </div>
                </div>
                <div className="bg-[var(--bg-hover)] rounded-lg p-3 text-center">
                  <div className="text-xs text-[var(--text-secondary)] mb-1">Max Pain</div>
                  <div className="text-xl font-bold text-purple-400">
                    ${stats.maxPainStrike.toLocaleString()}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Price: ${stats.underlyingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="bg-[var(--bg-hover)] rounded-lg p-3 text-center">
                  <div className="text-xs text-[var(--text-secondary)] mb-1">Total Open Interest</div>
                  <div className="text-xl font-bold text-blue-400">
                    {formatNumber(stats.totalOI)}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    contracts
                  </div>
                </div>
                <div className="bg-[var(--bg-hover)] rounded-lg p-3 text-center">
                  <div className="text-xs text-[var(--text-secondary)] mb-1">Avg Implied Vol</div>
                  <div className="text-xl font-bold text-orange-400">
                    {stats.avgIV.toFixed(1)}%
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {stats.avgIV > 80 ? 'High volatility' : stats.avgIV > 50 ? 'Moderate' : 'Low volatility'}
                  </div>
                </div>
              </div>

              {/* OI Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-green-400">Calls OI: {formatNumber(stats.callOI)}</span>
                  <span className="text-red-400">Puts OI: {formatNumber(stats.putOI)}</span>
                </div>
                <div className="h-3 bg-red-500/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500/70 rounded-full transition-all"
                    style={{ width: `${stats.totalOI > 0 ? (stats.callOI / stats.totalOI) * 100 : 50}%` }}
                  />
                </div>
              </div>

              {/* OI by Strike Chart */}
              {oiByStrike.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Open Interest by Strike</h4>
                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {oiByStrike.map(s => {
                      const isNearPrice = stats && Math.abs(s.strike - stats.underlyingPrice) / stats.underlyingPrice < 0.02;
                      return (
                        <div key={s.strike} className={`flex items-center gap-2 text-xs ${isNearPrice ? 'bg-yellow-500/10 rounded px-1' : ''}`}>
                          <div className="w-12 text-right flex-shrink-0">
                            <div className="text-green-400" style={{ width: `${(s.callOI / maxOI) * 48}px`, height: '8px', backgroundColor: 'rgba(34,197,94,0.5)', marginLeft: 'auto', borderRadius: '2px' }} />
                          </div>
                          <span className={`w-16 text-center font-mono flex-shrink-0 ${isNearPrice ? 'font-bold text-yellow-400' : 'text-[var(--text-secondary)]'}`}>
                            {s.strike >= 1000 ? `${(s.strike / 1000).toFixed(0)}K` : s.strike}
                          </span>
                          <div className="w-12 flex-shrink-0">
                            <div className="text-red-400" style={{ width: `${(s.putOI / maxOI) * 48}px`, height: '8px', backgroundColor: 'rgba(239,68,68,0.5)', borderRadius: '2px' }} />
                          </div>
                          <span className="text-[var(--text-secondary)] w-20 text-right">
                            C:{formatNumber(s.callOI)} / P:{formatNumber(s.putOI)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-center gap-4 mt-2 text-xs text-[var(--text-secondary)]">
                    <span>🟢 Call OI</span>
                    <span>🔴 Put OI</span>
                    <span>🟡 Current Price</span>
                  </div>
                </div>
              )}

              <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded p-2">
                <strong>Options Flow</strong> shows derivatives market sentiment. Put/Call ratio {'>'}1 = bearish bias,
                &lt;0.7 = bullish. Max Pain is the strike where option writers have least payout — price often gravitates there at expiry.
                Data from Deribit (largest crypto options exchange).
              </div>
            </>
          ) : (
            <div className="text-center text-[var(--text-secondary)] py-4">No options data available</div>
          )}
        </div>
      )}
    </div>
  );
}
