'use client';

import { useState, useEffect } from 'react';
import { getSupportedAssets, fetchAssetInfo, fetchStockInfo, AssetInfo } from '@/lib/api';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryAsset: string;
}

interface ComparisonData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  type: 'crypto' | 'stock';
}

export default function CompareModal({ isOpen, onClose, primaryAsset }: CompareModalProps) {
  const [compareWith, setCompareWith] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(false);
  
  const assets = getSupportedAssets();
  const availableAssets = assets.filter(a => a.symbol !== primaryAsset && !compareWith.includes(a.symbol));

  const addToCompare = (symbol: string) => {
    if (compareWith.length < 4) {
      setCompareWith([...compareWith, symbol]);
    }
  };

  const removeFromCompare = (symbol: string) => {
    setCompareWith(compareWith.filter(s => s !== symbol));
  };

  useEffect(() => {
    if (!isOpen) return;

    async function fetchComparison() {
      setLoading(true);
      const allSymbols = [primaryAsset, ...compareWith];
      const results: ComparisonData[] = [];

      for (const symbol of allSymbols) {
        const asset = assets.find(a => a.symbol === symbol);
        if (!asset) continue;

        try {
          let info: AssetInfo | null;
          if (asset.type === 'stock') {
            info = await fetchStockInfo(symbol);
          } else {
            info = await fetchAssetInfo(symbol);
          }

          if (info) {
            results.push({
              symbol,
              name: asset.name,
              price: info.price,
              change24h: info.change24h,
              volume24h: info.volume24h,
              marketCap: info.marketCap,
              type: asset.type
            });
          }
        } catch {
          // Skip failed fetches
        }
      }

      setComparisonData(results);
      setLoading(false);
    }

    fetchComparison();
  }, [isOpen, primaryAsset, compareWith]);

  if (!isOpen) return null;

  const formatNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-card)] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto border border-[var(--border)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Compare Assets</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
          >
            ✕
          </button>
        </div>

        {/* Add to compare */}
        <div className="p-4 border-b border-[var(--border)]">
          <label className="text-sm text-[var(--text-secondary)] mb-2 block">
            Add assets to compare (max 4 + primary):
          </label>
          <div className="flex flex-wrap gap-2">
            {availableAssets.map(asset => (
              <button
                key={asset.symbol}
                onClick={() => addToCompare(asset.symbol)}
                disabled={compareWith.length >= 4}
                className={`px-3 py-1 text-sm rounded-lg transition-all ${
                  compareWith.length >= 4
                    ? 'bg-[var(--bg-hover)] text-[var(--text-secondary)] opacity-50'
                    : 'bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--accent)] hover:text-white'
                }`}
              >
                + {asset.symbol}
              </button>
            ))}
          </div>
          {compareWith.length > 0 && (
            <div className="flex gap-2 mt-2">
              <span className="text-sm text-[var(--text-secondary)]">Comparing:</span>
              {compareWith.map(symbol => (
                <span
                  key={symbol}
                  className="px-2 py-0.5 text-xs bg-[var(--accent)]/20 text-[var(--accent)] rounded-full flex items-center gap-1"
                >
                  {symbol}
                  <button onClick={() => removeFromCompare(symbol)} className="hover:text-red-400">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Comparison Table */}
        <div className="p-4">
          {loading ? (
            <div className="text-center py-8 text-[var(--text-secondary)]">Loading comparison...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-2 px-3 text-[var(--text-secondary)]">Asset</th>
                    <th className="text-right py-2 px-3 text-[var(--text-secondary)]">Price</th>
                    <th className="text-right py-2 px-3 text-[var(--text-secondary)]">24h Change</th>
                    <th className="text-right py-2 px-3 text-[var(--text-secondary)]">Volume</th>
                    <th className="text-right py-2 px-3 text-[var(--text-secondary)]">Market Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((data, i) => (
                    <tr
                      key={data.symbol}
                      className={`border-b border-[var(--border)] ${i === 0 ? 'bg-[var(--accent)]/10' : ''}`}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            data.type === 'crypto' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                          }`}>
                            {data.type === 'crypto' ? '₿' : '📈'}
                          </span>
                          <div>
                            <div className="font-medium text-[var(--text-primary)]">{data.symbol}</div>
                            <div className="text-xs text-[var(--text-secondary)]">{data.name}</div>
                          </div>
                          {i === 0 && <span className="text-xs text-[var(--accent)]">(primary)</span>}
                        </div>
                      </td>
                      <td className="text-right py-3 px-3 font-medium text-[var(--text-primary)]">
                        ${data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className={`text-right py-3 px-3 font-medium ${
                        data.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%
                      </td>
                      <td className="text-right py-3 px-3 text-[var(--text-primary)]">
                        {formatNumber(data.volume24h)}
                      </td>
                      <td className="text-right py-3 px-3 text-[var(--text-primary)]">
                        {formatNumber(data.marketCap)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
