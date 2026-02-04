'use client';

import { useState, useEffect } from 'react';
import { getSupportedAssets, fetchAssetInfo, fetchStockInfo, AssetInfo } from '@/lib/api';

interface WatchlistProps {
  watchlist: string[];
  selectedAsset: string;
  onSelectAsset: (symbol: string) => void;
  onRemove: (symbol: string) => void;
}

interface WatchlistItem {
  symbol: string;
  price: number;
  change24h: number;
  type: 'crypto' | 'stock';
}

export default function Watchlist({ watchlist, selectedAsset, onSelectAsset, onRemove }: WatchlistProps) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  const assets = getSupportedAssets();

  useEffect(() => {
    if (watchlist.length === 0) {
      setItems([]);
      return;
    }

    async function fetchPrices() {
      setLoading(true);
      const results: WatchlistItem[] = [];
      
      for (const symbol of watchlist) {
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
              price: info.price,
              change24h: info.change24h,
              type: asset.type
            });
          }
        } catch {
          // Skip failed fetches
        }
      }
      
      setItems(results);
      setLoading(false);
    }

    fetchPrices();
    
    // Refresh prices every 30 seconds
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [watchlist]);

  if (watchlist.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] rounded-lg p-4 mb-6 border border-[var(--border)]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">⭐</span>
          <h3 className="font-semibold text-[var(--text-primary)]">Watchlist</h3>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Click the ⭐ next to any asset to add it to your watchlist
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-4 mb-6 border border-[var(--border)]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">⭐</span>
        <h3 className="font-semibold text-[var(--text-primary)]">Watchlist</h3>
        {loading && <span className="text-xs text-[var(--text-secondary)]">updating...</span>}
      </div>
      
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.symbol}
            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
              selectedAsset === item.symbol
                ? 'bg-[var(--accent)]/20 border border-[var(--accent)]'
                : 'bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)]/80'
            }`}
            onClick={() => onSelectAsset(item.symbol)}
          >
            <div className="flex items-center gap-2">
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                item.type === 'crypto' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
              }`}>
                {item.type === 'crypto' ? '₿' : '📈'}
              </span>
              <span className="font-medium text-[var(--text-primary)]">{item.symbol}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  ${item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <div className={`text-xs ${item.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(2)}%
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.symbol);
                }}
                className="text-[var(--text-secondary)] hover:text-red-400 transition-colors p-1"
                title="Remove from watchlist"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
