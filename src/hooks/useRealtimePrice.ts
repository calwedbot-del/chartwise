'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface RealtimePrice {
  symbol: string;
  price: number;
  timestamp: number;
}

// CoinCap WebSocket for real-time crypto prices (free, no API key)
// Maps our symbol names to CoinCap asset IDs
const COINCAP_IDS: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'XRP': 'ripple',
  'SUI': 'sui',
  'DOGE': 'dogecoin',
  'ADA': 'cardano',
  'AVAX': 'avalanche',
  'LINK': 'chainlink',
  'DOT': 'polkadot',
};

interface UseRealtimePriceOptions {
  symbols: string[];
  enabled?: boolean;
}

interface RealtimeState {
  prices: Record<string, number>;
  lastUpdate: Record<string, number>;
  connected: boolean;
  error: string | null;
}

export function useRealtimePrice({ symbols, enabled = true }: UseRealtimePriceOptions): RealtimeState & {
  reconnect: () => void;
} {
  const [state, setState] = useState<RealtimeState>({
    prices: {},
    lastUpdate: {},
    connected: false,
    error: null,
  });
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    // Only connect for crypto symbols that have CoinCap mapping
    const cryptoSymbols = symbols.filter(s => COINCAP_IDS[s]);
    if (cryptoSymbols.length === 0 || !enabled) return;

    // Build CoinCap WebSocket URL with asset IDs
    const assetIds = cryptoSymbols.map(s => COINCAP_IDS[s]).join(',');
    const wsUrl = `wss://ws.coincap.io/prices?assets=${assetIds}`;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setState(prev => ({ ...prev, connected: true, error: null }));
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const now = Date.now();
          
          // CoinCap sends { assetId: price } format
          const newPrices: Record<string, number> = {};
          const newTimestamps: Record<string, number> = {};

          for (const [coinCapId, price] of Object.entries(data)) {
            // Reverse lookup: find our symbol for this CoinCap ID
            const symbol = Object.entries(COINCAP_IDS).find(
              ([_, id]) => id === coinCapId
            )?.[0];
            
            if (symbol && typeof price === 'string') {
              newPrices[symbol] = parseFloat(price);
              newTimestamps[symbol] = now;
            }
          }

          if (Object.keys(newPrices).length > 0) {
            setState(prev => ({
              ...prev,
              prices: { ...prev.prices, ...newPrices },
              lastUpdate: { ...prev.lastUpdate, ...newTimestamps },
            }));
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = () => {
        setState(prev => ({ ...prev, error: 'WebSocket connection error' }));
      };

      ws.onclose = () => {
        setState(prev => ({ ...prev, connected: false }));
        wsRef.current = null;

        // Auto-reconnect with exponential backoff
        if (enabled && reconnectAttempts.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };
    } catch (err) {
      setState(prev => ({ ...prev, error: 'Failed to create WebSocket connection' }));
    }
  }, [symbols, enabled]);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return { ...state, reconnect };
}
