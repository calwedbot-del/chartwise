'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PortfolioHolding {
  symbol: string;
  quantity: number;
  avgCost: number;
  addedAt: number;
}

export interface PortfolioWithPrices extends PortfolioHolding {
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercent: number;
}

const STORAGE_KEY = 'chartwise_portfolio';

export function usePortfolio() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setHoldings(JSON.parse(stored));
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
    }
  }, [holdings, mounted]);

  const addHolding = useCallback((symbol: string, quantity: number, avgCost: number) => {
    setHoldings(prev => {
      const existing = prev.find(h => h.symbol === symbol);
      if (existing) {
        // Update existing holding (average cost calculation)
        const totalQty = existing.quantity + quantity;
        const newAvgCost = ((existing.quantity * existing.avgCost) + (quantity * avgCost)) / totalQty;
        return prev.map(h => 
          h.symbol === symbol 
            ? { ...h, quantity: totalQty, avgCost: newAvgCost }
            : h
        );
      }
      // Add new holding
      return [...prev, { symbol, quantity, avgCost, addedAt: Date.now() }];
    });
  }, []);

  const removeHolding = useCallback((symbol: string) => {
    setHoldings(prev => prev.filter(h => h.symbol !== symbol));
  }, []);

  const updateHolding = useCallback((symbol: string, quantity: number, avgCost: number) => {
    setHoldings(prev => prev.map(h => 
      h.symbol === symbol 
        ? { ...h, quantity, avgCost }
        : h
    ));
  }, []);

  const clearPortfolio = useCallback(() => {
    setHoldings([]);
  }, []);

  const getTotalValue = useCallback((prices: Record<string, number>) => {
    return holdings.reduce((total, h) => {
      const price = prices[h.symbol] || h.avgCost;
      return total + (h.quantity * price);
    }, 0);
  }, [holdings]);

  const getTotalCost = useCallback(() => {
    return holdings.reduce((total, h) => total + (h.quantity * h.avgCost), 0);
  }, [holdings]);

  const getHoldingsWithPrices = useCallback((prices: Record<string, number>): PortfolioWithPrices[] => {
    return holdings.map(h => {
      const currentPrice = prices[h.symbol] || h.avgCost;
      const value = h.quantity * currentPrice;
      const cost = h.quantity * h.avgCost;
      const pnl = value - cost;
      const pnlPercent = cost > 0 ? ((value - cost) / cost) * 100 : 0;
      
      return {
        ...h,
        currentPrice,
        value,
        pnl,
        pnlPercent,
      };
    });
  }, [holdings]);

  return {
    holdings,
    mounted,
    addHolding,
    removeHolding,
    updateHolding,
    clearPortfolio,
    getTotalValue,
    getTotalCost,
    getHoldingsWithPrices,
  };
}
