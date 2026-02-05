'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface OrderLevel {
  price: number;
  quantity: number;
  total: number; // cumulative
}

interface OrderbookDepthProps {
  symbol: string;
  className?: string;
}

const BINANCE_SYMBOLS: Record<string, string> = {
  'BTC': 'BTCUSDT', 'ETH': 'ETHUSDT', 'SOL': 'SOLUSDT', 'XRP': 'XRPUSDT',
  'SUI': 'SUIUSDT', 'DOGE': 'DOGEUSDT', 'ADA': 'ADAUSDT', 'AVAX': 'AVAXUSDT',
  'LINK': 'LINKUSDT', 'DOT': 'DOTUSDT',
};

function formatPrice(p: number): string {
  if (p >= 10000) return p.toFixed(0);
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(6);
}

function formatQty(q: number): string {
  if (q >= 1000000) return `${(q / 1e6).toFixed(2)}M`;
  if (q >= 1000) return `${(q / 1e3).toFixed(1)}K`;
  return q.toFixed(2);
}

export default function OrderbookDepth({ symbol, className = '' }: OrderbookDepthProps) {
  const [bids, setBids] = useState<OrderLevel[]>([]);
  const [asks, setAsks] = useState<OrderLevel[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [midPrice, setMidPrice] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const intentionalClose = useRef(false);

  const binanceSymbol = BINANCE_SYMBOLS[symbol.toUpperCase()];

  const connect = useCallback(() => {
    if (!binanceSymbol || !isOpen) return;

    if (wsRef.current) {
      intentionalClose.current = true;
      wsRef.current.close();
    }
    intentionalClose.current = false;

    // Use partial book depth stream (20 levels, 100ms updates)
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@depth20@100ms`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Process bids (sorted high to low)
        let bidTotal = 0;
        const newBids: OrderLevel[] = (data.bids || []).map((b: string[]) => {
          const price = parseFloat(b[0]);
          const quantity = parseFloat(b[1]);
          bidTotal += quantity;
          return { price, quantity, total: bidTotal };
        });

        // Process asks (sorted low to high)
        let askTotal = 0;
        const newAsks: OrderLevel[] = (data.asks || []).map((a: string[]) => {
          const price = parseFloat(a[0]);
          const quantity = parseFloat(a[1]);
          askTotal += quantity;
          return { price, quantity, total: askTotal };
        });

        setBids(newBids);
        setAsks(newAsks);

        if (newBids.length > 0 && newAsks.length > 0) {
          setMidPrice((newBids[0].price + newAsks[0].price) / 2);
        }
      } catch (err) {
        console.error('Orderbook parse error:', err);
      }
    };

    ws.onerror = () => setIsConnected(false);

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      if (!intentionalClose.current && isOpen && reconnectAttempts.current < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    };
  }, [binanceSymbol, isOpen]);

  useEffect(() => {
    connect();
    return () => {
      intentionalClose.current = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  // Reset on symbol change
  useEffect(() => {
    setBids([]);
    setAsks([]);
    setMidPrice(0);
  }, [symbol]);

  const stats = useMemo(() => {
    if (bids.length === 0 || asks.length === 0) return null;
    const totalBidQty = bids[bids.length - 1]?.total || 0;
    const totalAskQty = asks[asks.length - 1]?.total || 0;
    const total = totalBidQty + totalAskQty;
    const bidPct = total > 0 ? (totalBidQty / total) * 100 : 50;
    const spread = asks[0].price - bids[0].price;
    const spreadPct = midPrice > 0 ? (spread / midPrice) * 100 : 0;

    // Find biggest walls
    const biggestBid = bids.reduce((max, b) => b.quantity > max.quantity ? b : max, bids[0]);
    const biggestAsk = asks.reduce((max, a) => a.quantity > max.quantity ? a : max, asks[0]);

    return { totalBidQty, totalAskQty, bidPct, spread, spreadPct, biggestBid, biggestAsk };
  }, [bids, asks, midPrice]);

  const maxTotal = useMemo(() => {
    const maxBid = bids[bids.length - 1]?.total || 0;
    const maxAsk = asks[asks.length - 1]?.total || 0;
    return Math.max(maxBid, maxAsk, 1);
  }, [bids, asks]);

  if (!binanceSymbol) return null;

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📖</span>
          <h3 className="font-semibold text-[var(--text-primary)]">Orderbook Depth</h3>
          {isOpen && (
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          )}
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <span className="text-xs text-[var(--text-secondary)]">
              Spread: {stats.spreadPct.toFixed(3)}%
            </span>
          )}
          <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {/* Buy/Sell Pressure */}
          {stats && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-green-400">Bids: {formatQty(stats.totalBidQty)} ({stats.bidPct.toFixed(0)}%)</span>
                <span className="text-[var(--text-secondary)]">Mid: ${formatPrice(midPrice)}</span>
                <span className="text-red-400">Asks: {formatQty(stats.totalAskQty)} ({(100 - stats.bidPct).toFixed(0)}%)</span>
              </div>
              <div className="h-3 bg-red-500/30 rounded-full overflow-hidden">
                <div className="h-full bg-green-500/60 rounded-full transition-all" style={{ width: `${stats.bidPct}%` }} />
              </div>
            </div>
          )}

          {/* Depth Visualization */}
          <div className="flex gap-0.5 max-h-[300px]">
            {/* Bids (buy side) */}
            <div className="flex-1 space-y-px font-mono text-xs">
              <div className="flex justify-between text-[var(--text-secondary)] pb-1 border-b border-gray-700">
                <span>Price</span>
                <span>Qty</span>
                <span>Total</span>
              </div>
              {bids.slice(0, 15).map((bid, i) => (
                <div key={i} className="relative flex justify-between items-center py-0.5 text-green-400">
                  <div
                    className="absolute inset-0 bg-green-500/10 rounded-sm"
                    style={{ width: `${(bid.total / maxTotal) * 100}%`, right: 0 }}
                  />
                  <span className="relative z-10">{formatPrice(bid.price)}</span>
                  <span className="relative z-10">{formatQty(bid.quantity)}</span>
                  <span className="relative z-10 text-[var(--text-secondary)]">{formatQty(bid.total)}</span>
                </div>
              ))}
            </div>

            {/* Asks (sell side) */}
            <div className="flex-1 space-y-px font-mono text-xs">
              <div className="flex justify-between text-[var(--text-secondary)] pb-1 border-b border-gray-700">
                <span>Price</span>
                <span>Qty</span>
                <span>Total</span>
              </div>
              {asks.slice(0, 15).map((ask, i) => (
                <div key={i} className="relative flex justify-between items-center py-0.5 text-red-400">
                  <div
                    className="absolute inset-0 bg-red-500/10 rounded-sm"
                    style={{ width: `${(ask.total / maxTotal) * 100}%` }}
                  />
                  <span className="relative z-10">{formatPrice(ask.price)}</span>
                  <span className="relative z-10">{formatQty(ask.quantity)}</span>
                  <span className="relative z-10 text-[var(--text-secondary)]">{formatQty(ask.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Wall Detection */}
          {stats && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-green-500/5 rounded p-2">
                <div className="text-[var(--text-secondary)]">Biggest Bid Wall</div>
                <div className="text-green-400 font-mono font-bold">
                  ${formatPrice(stats.biggestBid.price)} — {formatQty(stats.biggestBid.quantity)}
                </div>
              </div>
              <div className="bg-red-500/5 rounded p-2">
                <div className="text-[var(--text-secondary)]">Biggest Ask Wall</div>
                <div className="text-red-400 font-mono font-bold">
                  ${formatPrice(stats.biggestAsk.price)} — {formatQty(stats.biggestAsk.quantity)}
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded p-2">
            Real-time orderbook from Binance. Shows buy/sell pressure and support/resistance walls.
            Large bid walls act as support; large ask walls act as resistance.
          </div>
        </div>
      )}
    </div>
  );
}
