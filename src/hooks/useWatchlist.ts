'use client';

import { useState, useEffect } from 'react';
import { safeGetJSON, safeSetJSON } from '@/utils/storage';

const STORAGE_KEY = 'chartwise-watchlist';

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setWatchlist(safeGetJSON<string[]>(STORAGE_KEY, []));
  }, []);

  const save = (updated: string[]) => {
    setWatchlist(updated);
    safeSetJSON(STORAGE_KEY, updated);
  };

  const addToWatchlist = (symbol: string) => {
    if (!watchlist.includes(symbol)) {
      save([...watchlist, symbol]);
    }
  };

  const removeFromWatchlist = (symbol: string) => {
    save(watchlist.filter(s => s !== symbol));
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
