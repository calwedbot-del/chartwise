'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface WhaleAlert {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  usdValue: number;
  time: number;
  tier: 'whale' | 'shark' | 'dolphin';
}

interface WhaleTrackerProps {
  symbol: string;
  className?: string;
}

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

// Thresholds for whale classification (in USD)
const THRESHOLDS = {
  dolphin: 50000,   // $50K+
  shark: 250000,    // $250K+
  whale: 1000000,   // $1M+
};

function getTierEmoji(tier: WhaleAlert['tier']): string {
  switch (tier) {
    case 'whale': return '🐋';
    case 'shark': return '🦈';
    case 'dolphin': return '🐬';
  }
}

function getTierColor(tier: WhaleAlert['tier']): string {
  switch (tier) {
    case 'whale': return 'text-yellow-400';
    case 'shark': return 'text-blue-400';
    case 'dolphin': return 'text-cyan-400';
  }
}

function formatUsd(value: number): string {
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function WhaleTracker({ symbol, className = '' }: WhaleTrackerProps) {
  const [alerts, setAlerts] = useState<WhaleAlert[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState({ totalBuyUsd: 0, totalSellUsd: 0, alertCount: 0 });
  const wsRef = useRef<WebSocket | null>(null);
  const alertsRef = useRef<WhaleAlert[]>([]);
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

    // Use aggTrade stream for aggregated trades
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@aggTrade`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const price = parseFloat(data.p);
        const quantity = parseFloat(data.q);
        const usdValue = price * quantity;

        // Only track trades above dolphin threshold
        if (usdValue < THRESHOLDS.dolphin) return;

        const tier: WhaleAlert['tier'] = 
          usdValue >= THRESHOLDS.whale ? 'whale' :
          usdValue >= THRESHOLDS.shark ? 'shark' : 'dolphin';

        const alert: WhaleAlert = {
          id: data.a.toString(),
          symbol: symbol.toUpperCase(),
          side: data.m ? 'sell' : 'buy',
          price,
          quantity,
          usdValue,
          time: data.T,
          tier,
        };

        alertsRef.current = [alert, ...alertsRef.current.slice(0, 49)];
        setAlerts([...alertsRef.current]);

        setStats(prev => ({
          totalBuyUsd: prev.totalBuyUsd + (alert.side === 'buy' ? usdValue : 0),
          totalSellUsd: prev.totalSellUsd + (alert.side === 'sell' ? usdValue : 0),
          alertCount: prev.alertCount + 1,
        }));
      } catch (err) {
        console.error('Whale tracker parse error:', err);
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
  }, [binanceSymbol, isOpen, symbol]);

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
    setAlerts([]);
    alertsRef.current = [];
    setStats({ totalBuyUsd: 0, totalSellUsd: 0, alertCount: 0 });
  }, [symbol]);

  if (!binanceSymbol) return null;

  const totalVolume = stats.totalBuyUsd + stats.totalSellUsd;
  const buyPct = totalVolume > 0 ? (stats.totalBuyUsd / totalVolume) * 100 : 50;

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🐋</span>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Whale Tracker</h3>
          {isOpen && (
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          )}
        </div>
        <div className="flex items-center gap-2">
          {stats.alertCount > 0 && (
            <span className="text-xs text-[var(--text-secondary)]">
              {stats.alertCount} large trades
            </span>
          )}
          <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-2">
          {/* Buy/Sell Volume Summary */}
          {totalVolume > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-green-400">Buy: {formatUsd(stats.totalBuyUsd)} ({buyPct.toFixed(0)}%)</span>
                <span className="text-red-400">Sell: {formatUsd(stats.totalSellUsd)} ({(100 - buyPct).toFixed(0)}%)</span>
              </div>
              <div className="h-2 bg-red-500/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500/70 rounded-full transition-all"
                  style={{ width: `${buyPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Tier Legend */}
          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            <span>🐋 $1M+</span>
            <span>🦈 $250K+</span>
            <span>🐬 $50K+</span>
          </div>

          {/* Whale Alert List */}
          <div className="max-h-[300px] overflow-y-auto space-y-0.5 font-mono text-xs">
            {alerts.length === 0 ? (
              <div className="text-center text-[var(--text-secondary)] py-4">
                {isConnected ? 'Monitoring for large trades...' : 'Connecting...'}
              </div>
            ) : (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between px-2 py-1.5 rounded ${
                    alert.tier === 'whale' ? 'bg-yellow-500/10' :
                    alert.tier === 'shark' ? 'bg-blue-500/5' : ''
                  } ${alert.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={getTierColor(alert.tier)}>{getTierEmoji(alert.tier)}</span>
                    <span className="font-bold">{alert.side.toUpperCase()}</span>
                  </div>
                  <span className="w-20 text-right">${alert.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  <span className="w-20 text-right font-bold text-[var(--text-primary)]">
                    {formatUsd(alert.usdValue)}
                  </span>
                  <span className="w-16 text-right text-[var(--text-secondary)]">
                    {formatTime(alert.time)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded-lg p-2">
            <strong>Whale Tracker</strong> monitors real-time trades on Binance. Large buy/sell orders can signal
            institutional activity or upcoming price movements. Data via Binance WebSocket.
          </div>
        </div>
      )}
    </div>
  );
}
