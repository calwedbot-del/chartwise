'use client';

import { useState, useEffect } from 'react';

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('chartwise-watchlist');
    if (stored) {
      try {
        setWatchlist(JSON.parse(stored));
      } catch {
        setWatchlist([]);
      }
    }
  }, []);

  const addToWatchlist = (symbol: string) => {
    if (!watchlist.includes(symbol)) {
      const updated = [...watchlist, symbol];
      setWatchlist(updated);
      localStorage.setItem('chartwise-watchlist', JSON.stringify(updated));
    }
  };

  const removeFromWatchlist = (symbol: string) => {
    const updated = watchlist.filter(s => s !== symbol);
    setWatchlist(updated);
    localStorage.setItem('chartwise-watchlist', JSON.stringify(updated));
  };

  const isInWatchlist = (symbol: string) => watchlist.includes(symbol);

  const toggleWatchlist = (symbol: string) => {
    if (isInWatchlist(symbol)) {
      removeFromWatchlist(symbol);
    } else {
      addToWatchlist(symbol);
    }
  };

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    toggleWatchlist,
    mounted
  };
}
