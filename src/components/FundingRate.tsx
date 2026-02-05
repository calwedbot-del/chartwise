'use client';

import { useState, useEffect, useMemo } from 'react';

interface FundingRateData {
  symbol: string;
  fundingRate: number;
  fundingTime: number;
  markPrice: number;
  indexPrice: number;
}

interface FundingRateProps {
  symbol: string;
  className?: string;
}

// Binance public API (no auth needed) for funding rates
const BINANCE_FUTURES_BASE = 'https://fapi.binance.com';

// Map our symbols to Binance futures symbols
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

async function fetchFundingRate(symbol: string): Promise<FundingRateData | null> {
  const binanceSymbol = BINANCE_SYMBOLS[symbol.toUpperCase()];
  if (!binanceSymbol) return null;

  try {
    const [fundingRes, premiumRes] = await Promise.all([
      fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/fundingRate?symbol=${binanceSymbol}&limit=1`),
      fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/premiumIndex?symbol=${binanceSymbol}`),
    ]);

    if (!fundingRes.ok || !premiumRes.ok) return null;

    const fundingData = await fundingRes.json();
    const premiumData = await premiumRes.json();

    if (!fundingData[0]) return null;

    return {
      symbol: symbol.toUpperCase(),
      fundingRate: parseFloat(fundingData[0].fundingRate),
      fundingTime: fundingData[0].fundingTime,
      markPrice: parseFloat(premiumData.markPrice),
      indexPrice: parseFloat(premiumData.indexPrice),
    };
  } catch (error) {
    console.error('Funding rate fetch error:', error);
    return null;
  }
}

async function fetchFundingHistory(symbol: string, limit: number = 24): Promise<{ rate: number; time: number }[]> {
  const binanceSymbol = BINANCE_SYMBOLS[symbol.toUpperCase()];
  if (!binanceSymbol) return [];

  try {
    const res = await fetch(
      `${BINANCE_FUTURES_BASE}/fapi/v1/fundingRate?symbol=${binanceSymbol}&limit=${limit}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((d: { fundingRate: string; fundingTime: number }) => ({
      rate: parseFloat(d.fundingRate),
      time: d.fundingTime,
    }));
  } catch {
    return [];
  }
}

export default function FundingRate({ symbol, className = '' }: FundingRateProps) {
  const [data, setData] = useState<FundingRateData | null>(null);
  const [history, setHistory] = useState<{ rate: number; time: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const isSupported = BINANCE_SYMBOLS[symbol.toUpperCase()] !== undefined;

  useEffect(() => {
    if (!isSupported) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      const [rateData, histData] = await Promise.all([
        fetchFundingRate(symbol),
        fetchFundingHistory(symbol),
      ]);
      setData(rateData);
      setHistory(histData);
      setLoading(false);
    };

    load();
    const interval = setInterval(load, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [symbol, isSupported]);

  const annualizedRate = useMemo(() => {
    if (!data) return 0;
    // 3 funding periods per day × 365 days
    return data.fundingRate * 3 * 365 * 100;
  }, [data]);

  const avgRate = useMemo(() => {
    if (history.length === 0) return 0;
    return (history.reduce((sum, h) => sum + h.rate, 0) / history.length) * 100;
  }, [history]);

  const nextFundingTime = useMemo(() => {
    if (!data) return null;
    // Binance funding happens every 8h (00:00, 08:00, 16:00 UTC)
    const now = Date.now();
    const hour8 = 8 * 60 * 60 * 1000;
    const nextTime = Math.ceil(now / hour8) * hour8;
    const diff = nextTime - now;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }, [data]);

  if (!isSupported) return null;

  const ratePercent = data ? data.fundingRate * 100 : 0;
  const isPositive = ratePercent >= 0;

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <h3 className="font-semibold text-[var(--text-primary)]">Funding Rate</h3>
        </div>
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="animate-pulse h-5 w-16 bg-gray-700 rounded" />
          ) : data ? (
            <span className={`font-bold text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{ratePercent.toFixed(4)}%
            </span>
          ) : (
            <span className="text-sm text-gray-500">N/A</span>
          )}
          <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && data && (
        <div className="px-3 pb-3 space-y-3">
          {/* Current Rates */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[var(--bg-hover)] rounded-lg p-2">
              <div className="text-xs text-[var(--text-secondary)]">Current Rate</div>
              <div className={`text-sm font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{ratePercent.toFixed(4)}%
              </div>
            </div>
            <div className="bg-[var(--bg-hover)] rounded-lg p-2">
              <div className="text-xs text-[var(--text-secondary)]">Annualized</div>
              <div className={`text-sm font-bold ${annualizedRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {annualizedRate >= 0 ? '+' : ''}{annualizedRate.toFixed(2)}%
              </div>
            </div>
            <div className="bg-[var(--bg-hover)] rounded-lg p-2">
              <div className="text-xs text-[var(--text-secondary)]">Avg (24h)</div>
              <div className={`text-sm font-bold ${avgRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {avgRate >= 0 ? '+' : ''}{avgRate.toFixed(4)}%
              </div>
            </div>
            <div className="bg-[var(--bg-hover)] rounded-lg p-2">
              <div className="text-xs text-[var(--text-secondary)]">Next Funding</div>
              <div className="text-sm font-bold text-blue-400">
                {nextFundingTime || '—'}
              </div>
            </div>
          </div>

          {/* Mark / Index price */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[var(--bg-hover)] rounded-lg p-2">
              <div className="text-xs text-[var(--text-secondary)]">Mark Price</div>
              <div className="text-sm font-medium">${data.markPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-[var(--bg-hover)] rounded-lg p-2">
              <div className="text-xs text-[var(--text-secondary)]">Index Price</div>
              <div className="text-sm font-medium">${data.indexPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            </div>
          </div>

          {/* Funding Rate History Mini Bars */}
          {history.length > 0 && (
            <div>
              <div className="text-xs text-[var(--text-secondary)] mb-1">Recent History (8h intervals)</div>
              <div className="flex items-end gap-[2px] h-12">
                {history.slice(-24).map((h, i) => {
                  const rate = h.rate * 100;
                  const maxRate = Math.max(...history.map(x => Math.abs(x.rate * 100)), 0.01);
                  const height = Math.max(4, (Math.abs(rate) / maxRate) * 48);
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-t-sm ${rate >= 0 ? 'bg-green-500/70' : 'bg-red-500/70'}`}
                      style={{ height: `${height}px` }}
                      title={`${rate >= 0 ? '+' : ''}${rate.toFixed(4)}% at ${new Date(h.time).toLocaleString()}`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Explanation */}
          <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded-lg p-2">
            <strong>Funding Rate:</strong>{' '}
            {isPositive
              ? 'Positive → Longs pay shorts. Market is bullish-biased.'
              : 'Negative → Shorts pay longs. Market is bearish-biased.'}
          </div>
        </div>
      )}
    </div>
  );
}
