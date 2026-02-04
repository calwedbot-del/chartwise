'use client';

import { useEffect, useState, useRef } from 'react';
import { useRealtimePrice } from '@/hooks/useRealtimePrice';

interface LivePriceIndicatorProps {
  symbol: string;
  fallbackPrice?: number;
  onPriceUpdate?: (price: number) => void;
}

export default function LivePriceIndicator({ symbol, fallbackPrice, onPriceUpdate }: LivePriceIndicatorProps) {
  const { prices, lastUpdate, connected } = useRealtimePrice({
    symbols: [symbol],
    enabled: true,
  });

  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef<number | null>(null);
  
  const livePrice = prices[symbol];
  const displayPrice = livePrice || fallbackPrice;
  const lastUpdateTime = lastUpdate[symbol];

  // Flash on price change
  useEffect(() => {
    if (livePrice && prevPriceRef.current !== null) {
      if (livePrice > prevPriceRef.current) {
        setFlash('up');
      } else if (livePrice < prevPriceRef.current) {
        setFlash('down');
      }
      const timer = setTimeout(() => setFlash(null), 500);
      prevPriceRef.current = livePrice;
      return () => clearTimeout(timer);
    }
    if (livePrice) {
      prevPriceRef.current = livePrice;
    }
  }, [livePrice]);

  // Notify parent of price updates
  useEffect(() => {
    if (livePrice && onPriceUpdate) {
      onPriceUpdate(livePrice);
    }
  }, [livePrice, onPriceUpdate]);

  const getTimeSince = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  if (!displayPrice) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Connection status */}
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${
          connected ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
        }`} />
        <span className="text-xs text-[var(--text-secondary)]">
          {connected ? 'LIVE' : 'REST'}
        </span>
      </div>

      {/* Price with flash animation */}
      <span className={`font-mono text-lg font-bold transition-colors duration-300 ${
        flash === 'up' ? 'text-green-400' :
        flash === 'down' ? 'text-red-400' :
        'text-[var(--text-primary)]'
      }`}>
        ${displayPrice.toLocaleString(undefined, { 
          minimumFractionDigits: displayPrice < 1 ? 4 : 2,
          maximumFractionDigits: displayPrice < 1 ? 6 : 2,
        })}
      </span>

      {/* Last update timestamp */}
      {lastUpdateTime && (
        <span className="text-xs text-[var(--text-secondary)]">
          {getTimeSince(lastUpdateTime)}
        </span>
      )}
    </div>
  );
}
