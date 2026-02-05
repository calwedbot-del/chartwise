'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Trade {
  id: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  time: number;
  isMaker: boolean;
}

interface TradeTapeProps {
  symbol: string;
  className?: string;
}

// Map symbols to Binance spot symbols
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

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatQuantity(qty: number, symbol: string): string {
  if (qty >= 1000) return `${(qty / 1000).toFixed(2)}K`;
  if (qty >= 1) return qty.toFixed(2);
  return qty.toFixed(4);
}

function formatPrice(price: number): string {
  if (price >= 10000) return price.toFixed(2);
  if (price >= 100) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

export default function TradeTape({ symbol, className = '' }: TradeTapeProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [filter, setFilter] = useState<'all' | 'buys' | 'sells' | 'large'>('all');
  const [totalBuyVol, setTotalBuyVol] = useState(0);
  const [totalSellVol, setTotalSellVol] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const tradesRef = useRef<Trade[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const binanceSymbol = BINANCE_SYMBOLS[symbol.toUpperCase()];

  const connect = useCallback(() => {
    if (!binanceSymbol || !isOpen) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@aggTrade`);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const trade: Trade = {
          id: data.a.toString(),
          price: parseFloat(data.p),
          quantity: parseFloat(data.q),
          side: data.m ? 'sell' : 'buy', // m = true means the buyer is the maker (i.e., sell aggressor)
          time: data.T,
          isMaker: data.m,
        };

        tradesRef.current = [trade, ...tradesRef.current.slice(0, 99)];
        setTrades([...tradesRef.current]);

        if (trade.side === 'buy') {
          setTotalBuyVol(prev => prev + trade.price * trade.quantity);
        } else {
          setTotalSellVol(prev => prev + trade.price * trade.quantity);
        }
      } catch (err) {
        console.error('Trade tape parse error:', err);
      }
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [binanceSymbol, isOpen]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Reset on symbol change
  useEffect(() => {
    setTrades([]);
    tradesRef.current = [];
    setTotalBuyVol(0);
    setTotalSellVol(0);
  }, [symbol]);

  if (!binanceSymbol) return null;

  const filteredTrades = trades.filter(t => {
    if (filter === 'buys') return t.side === 'buy';
    if (filter === 'sells') return t.side === 'sell';
    if (filter === 'large') return t.price * t.quantity > 10000; // > $10k trades
    return true;
  });

  const totalVol = totalBuyVol + totalSellVol;
  const buyPct = totalVol > 0 ? (totalBuyVol / totalVol) * 100 : 50;

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className="font-semibold text-[var(--text-primary)]">Trade Tape</h3>
          {isOpen && (
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          )}
        </div>
        <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-2">
          {/* Buy/Sell Volume Bar */}
          {totalVol > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-green-400">Buy: ${(totalBuyVol / 1e3).toFixed(0)}K ({buyPct.toFixed(0)}%)</span>
                <span className="text-red-400">Sell: ${(totalSellVol / 1e3).toFixed(0)}K ({(100 - buyPct).toFixed(0)}%)</span>
              </div>
              <div className="h-2 bg-red-500/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500/70 rounded-full transition-all"
                  style={{ width: `${buyPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-1">
            {(['all', 'buys', 'sells', 'large'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  filter === f
                    ? 'bg-blue-500 text-white'
                    : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-gray-600'
                }`}
              >
                {f === 'all' ? 'All' : f === 'buys' ? '🟢 Buys' : f === 'sells' ? '🔴 Sells' : '🐋 Large'}
              </button>
            ))}
          </div>

          {/* Trade List */}
          <div ref={containerRef} className="max-h-[300px] overflow-y-auto space-y-0.5 font-mono text-xs">
            {filteredTrades.length === 0 ? (
              <div className="text-center text-[var(--text-secondary)] py-4">
                {isConnected ? 'Waiting for trades...' : 'Connecting...'}
              </div>
            ) : (
              filteredTrades.map(trade => {
                const usdValue = trade.price * trade.quantity;
                const isLarge = usdValue > 10000;
                return (
                  <div
                    key={trade.id}
                    className={`flex items-center justify-between px-2 py-1 rounded ${
                      isLarge ? 'bg-yellow-500/10' : ''
                    } ${trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}
                  >
                    <span className="w-20">{formatPrice(trade.price)}</span>
                    <span className="w-16 text-right">{formatQuantity(trade.quantity, symbol)}</span>
                    <span className="w-16 text-right text-[var(--text-secondary)]">
                      ${usdValue >= 1000 ? `${(usdValue / 1e3).toFixed(1)}K` : usdValue.toFixed(0)}
                    </span>
                    <span className="w-16 text-right text-[var(--text-secondary)]">{formatTime(trade.time)}</span>
                    {isLarge && <span title="Large trade">🐋</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
