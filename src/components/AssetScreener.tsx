'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { RSI, SMA } from '@/utils/indicators';

interface ScreenerAsset {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency: number;
  market_cap: number;
  total_volume: number;
  image: string;
  sparkline_in_7d?: { price: number[] };
}

interface ScreenerFilter {
  rsiMin: number;
  rsiMax: number;
  changeMin: number;
  changeMax: number;
  volumeMin: number;
  marketCapMin: number;
  sortField: 'market_cap' | 'volume' | 'change_24h' | 'change_7d' | 'rsi';
  sortDir: 'asc' | 'desc';
}

interface AssetScreenerProps {
  onSelectAsset?: (symbol: string) => void;
}

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

function formatNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
}

function calculateRSIFromSparkline(prices: number[]): number {
  if (!prices || prices.length < 15) return NaN;
  const rsiValues = RSI(prices, 14);
  const lastValid = rsiValues.filter(v => !isNaN(v));
  return lastValid.length > 0 ? lastValid[lastValid.length - 1] : NaN;
}

const DEFAULT_FILTERS: ScreenerFilter = {
  rsiMin: 0,
  rsiMax: 100,
  changeMin: -100,
  changeMax: 100,
  volumeMin: 0,
  marketCapMin: 0,
  sortField: 'market_cap',
  sortDir: 'desc',
};

export default function AssetScreener({ onSelectAsset }: AssetScreenerProps) {
  const [assets, setAssets] = useState<ScreenerAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<ScreenerFilter>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchScreenerData() {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${COINGECKO_BASE}/coins/markets`, {
          params: {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: 100,
            page,
            sparkline: true,
            price_change_percentage: '7d',
          },
        });
        setAssets(response.data);
      } catch (err) {
        setError('Failed to load screener data');
        console.error(err);
      }
      setLoading(false);
    }

    fetchScreenerData();
  }, [isOpen, page]);

  // Calculate RSI for each asset from sparkline data
  const enrichedAssets = useMemo(() => {
    return assets.map(asset => ({
      ...asset,
      rsi: asset.sparkline_in_7d?.price
        ? calculateRSIFromSparkline(asset.sparkline_in_7d.price)
        : NaN,
    }));
  }, [assets]);

  // Apply filters and sort
  const filteredAssets = useMemo(() => {
    let result = enrichedAssets.filter(asset => {
      if (!isNaN(asset.rsi) && (asset.rsi < filters.rsiMin || asset.rsi > filters.rsiMax)) return false;
      if (asset.price_change_percentage_24h < filters.changeMin || asset.price_change_percentage_24h > filters.changeMax) return false;
      if (asset.total_volume < filters.volumeMin) return false;
      if (asset.market_cap < filters.marketCapMin) return false;
      return true;
    });

    // Sort
    result.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (filters.sortField) {
        case 'volume': aVal = a.total_volume; bVal = b.total_volume; break;
        case 'change_24h': aVal = a.price_change_percentage_24h; bVal = b.price_change_percentage_24h; break;
        case 'change_7d': aVal = a.price_change_percentage_7d_in_currency || 0; bVal = b.price_change_percentage_7d_in_currency || 0; break;
        case 'rsi': aVal = isNaN(a.rsi) ? -1 : a.rsi; bVal = isNaN(b.rsi) ? -1 : b.rsi; break;
        default: aVal = a.market_cap; bVal = b.market_cap;
      }
      return filters.sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return result;
  }, [enrichedAssets, filters]);

  // Preset filters
  const presetFilters = [
    { label: '🔥 Oversold (RSI < 30)', filter: { ...DEFAULT_FILTERS, rsiMin: 0, rsiMax: 30, sortField: 'rsi' as const, sortDir: 'asc' as const } },
    { label: '⚡ Overbought (RSI > 70)', filter: { ...DEFAULT_FILTERS, rsiMin: 70, rsiMax: 100, sortField: 'rsi' as const, sortDir: 'desc' as const } },
    { label: '📈 Top Gainers', filter: { ...DEFAULT_FILTERS, changeMin: 0, sortField: 'change_24h' as const, sortDir: 'desc' as const } },
    { label: '📉 Top Losers', filter: { ...DEFAULT_FILTERS, changeMax: 0, sortField: 'change_24h' as const, sortDir: 'asc' as const } },
    { label: '💎 High Volume', filter: { ...DEFAULT_FILTERS, sortField: 'volume' as const, sortDir: 'desc' as const } },
  ];

  const handleSort = (field: ScreenerFilter['sortField']) => {
    setFilters(prev => ({
      ...prev,
      sortField: field,
      sortDir: prev.sortField === field && prev.sortDir === 'desc' ? 'asc' : 'desc',
    }));
  };

  const SortIcon = ({ field }: { field: ScreenerFilter['sortField'] }) => {
    if (filters.sortField !== field) return <span className="text-gray-600">↕</span>;
    return <span className="text-blue-400">{filters.sortDir === 'desc' ? '↓' : '↑'}</span>;
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] rounded-lg text-sm font-medium text-[var(--text-primary)] transition-colors border border-[var(--border)]"
      >
        <span>🔍</span>
        <span>Asset Screener</span>
        <span className="text-[var(--text-secondary)]">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="mt-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              🔍 Asset Screener
              <span className="text-sm text-[var(--text-secondary)] font-normal ml-2">
                {filteredAssets.length} / {assets.length} assets
              </span>
            </h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-1 text-sm rounded bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              ⚙️ Filters {showFilters ? '▲' : '▼'}
            </button>
          </div>

          {/* Preset Filters */}
          <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-[var(--border)]">
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="px-3 py-1 text-xs rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-blue-500/20 hover:text-blue-400"
            >
              Reset All
            </button>
            {presetFilters.map((preset, i) => (
              <button
                key={i}
                onClick={() => setFilters(preset.filter)}
                className="px-3 py-1 text-xs rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-blue-500/20 hover:text-blue-400"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Filters */}
          {showFilters && (
            <div className="px-4 py-3 border-b border-[var(--border)] grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-[var(--text-secondary)] block mb-1">RSI Range</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={filters.rsiMin}
                    onChange={e => setFilters(f => ({ ...f, rsiMin: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-[var(--bg-hover)] text-[var(--text-primary)] rounded px-2 py-1 text-sm border border-[var(--border)]"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={filters.rsiMax}
                    onChange={e => setFilters(f => ({ ...f, rsiMax: parseFloat(e.target.value) || 100 }))}
                    className="w-full bg-[var(--bg-hover)] text-[var(--text-primary)] rounded px-2 py-1 text-sm border border-[var(--border)]"
                    placeholder="Max"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] block mb-1">24h Change %</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={filters.changeMin}
                    onChange={e => setFilters(f => ({ ...f, changeMin: parseFloat(e.target.value) || -100 }))}
                    className="w-full bg-[var(--bg-hover)] text-[var(--text-primary)] rounded px-2 py-1 text-sm border border-[var(--border)]"
                    placeholder="Min %"
                  />
                  <input
                    type="number"
                    value={filters.changeMax}
                    onChange={e => setFilters(f => ({ ...f, changeMax: parseFloat(e.target.value) || 100 }))}
                    className="w-full bg-[var(--bg-hover)] text-[var(--text-primary)] rounded px-2 py-1 text-sm border border-[var(--border)]"
                    placeholder="Max %"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] block mb-1">Min Volume ($)</label>
                <select
                  value={filters.volumeMin}
                  onChange={e => setFilters(f => ({ ...f, volumeMin: parseFloat(e.target.value) }))}
                  className="w-full bg-[var(--bg-hover)] text-[var(--text-primary)] rounded px-2 py-1 text-sm border border-[var(--border)]"
                >
                  <option value={0}>Any</option>
                  <option value={1e6}>$1M+</option>
                  <option value={1e7}>$10M+</option>
                  <option value={1e8}>$100M+</option>
                  <option value={1e9}>$1B+</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] block mb-1">Min Market Cap ($)</label>
                <select
                  value={filters.marketCapMin}
                  onChange={e => setFilters(f => ({ ...f, marketCapMin: parseFloat(e.target.value) }))}
                  className="w-full bg-[var(--bg-hover)] text-[var(--text-primary)] rounded px-2 py-1 text-sm border border-[var(--border)]"
                >
                  <option value={0}>Any</option>
                  <option value={1e7}>$10M+</option>
                  <option value={1e8}>$100M+</option>
                  <option value={1e9}>$1B+</option>
                  <option value={1e10}>$10B+</option>
                </select>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-[var(--text-secondary)]">
                <div className="animate-pulse">Loading screener data...</div>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-400">{error}</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-hover)]">
                    <th className="text-left py-3 px-4 text-[var(--text-secondary)]">#</th>
                    <th className="text-left py-3 px-4 text-[var(--text-secondary)]">Asset</th>
                    <th className="text-right py-3 px-4 text-[var(--text-secondary)]">Price</th>
                    <th
                      className="text-right py-3 px-4 text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                      onClick={() => handleSort('change_24h')}
                    >
                      24h % <SortIcon field="change_24h" />
                    </th>
                    <th
                      className="text-right py-3 px-4 text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                      onClick={() => handleSort('change_7d')}
                    >
                      7d % <SortIcon field="change_7d" />
                    </th>
                    <th
                      className="text-right py-3 px-4 text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                      onClick={() => handleSort('volume')}
                    >
                      Volume <SortIcon field="volume" />
                    </th>
                    <th
                      className="text-right py-3 px-4 text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                      onClick={() => handleSort('market_cap')}
                    >
                      Market Cap <SortIcon field="market_cap" />
                    </th>
                    <th
                      className="text-right py-3 px-4 text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                      onClick={() => handleSort('rsi')}
                    >
                      RSI <SortIcon field="rsi" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((asset, i) => (
                    <tr
                      key={asset.id}
                      onClick={() => onSelectAsset?.(asset.symbol.toUpperCase())}
                      className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-[var(--text-secondary)]">{i + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <img src={asset.image} alt={asset.name} className="w-5 h-5 rounded-full" />
                          <div>
                            <span className="font-medium text-[var(--text-primary)]">{asset.symbol.toUpperCase()}</span>
                            <span className="text-xs text-[var(--text-secondary)] ml-1 hidden md:inline">{asset.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-medium text-[var(--text-primary)]">
                        ${asset.current_price < 1 ? asset.current_price.toFixed(6) : asset.current_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className={`text-right py-3 px-4 font-medium ${
                        asset.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {asset.price_change_percentage_24h >= 0 ? '+' : ''}{asset.price_change_percentage_24h?.toFixed(2) || '0.00'}%
                      </td>
                      <td className={`text-right py-3 px-4 font-medium ${
                        (asset.price_change_percentage_7d_in_currency || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {(asset.price_change_percentage_7d_in_currency || 0) >= 0 ? '+' : ''}{(asset.price_change_percentage_7d_in_currency || 0).toFixed(2)}%
                      </td>
                      <td className="text-right py-3 px-4 text-[var(--text-primary)]">
                        {formatNumber(asset.total_volume)}
                      </td>
                      <td className="text-right py-3 px-4 text-[var(--text-primary)]">
                        {formatNumber(asset.market_cap)}
                      </td>
                      <td className={`text-right py-3 px-4 font-medium ${
                        isNaN(asset.rsi) ? 'text-gray-500' :
                        asset.rsi > 70 ? 'text-red-400' :
                        asset.rsi < 30 ? 'text-green-400' :
                        'text-[var(--text-primary)]'
                      }`}>
                        {isNaN(asset.rsi) ? '—' : asset.rsi.toFixed(1)}
                        {!isNaN(asset.rsi) && (
                          <span className="text-xs ml-1">
                            {asset.rsi > 70 ? '🔴' : asset.rsi < 30 ? '🟢' : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="p-3 border-t border-[var(--border)] flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 text-sm rounded bg-[var(--bg-hover)] text-[var(--text-secondary)] disabled:opacity-50"
            >
              ← Prev
            </button>
            <span className="text-sm text-[var(--text-secondary)]">Page {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={assets.length < 100}
              className="px-3 py-1 text-sm rounded bg-[var(--bg-hover)] text-[var(--text-secondary)] disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
