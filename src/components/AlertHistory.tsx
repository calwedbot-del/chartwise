'use client';

import { AlertHistoryItem } from '@/hooks/usePriceAlerts';

interface AlertHistoryProps {
  history: AlertHistoryItem[];
  onClearHistory: () => void;
  onSelectSymbol?: (symbol: string) => void;
}

export default function AlertHistory({ history, onClearHistory, onSelectSymbol }: AlertHistoryProps) {
  if (history.length === 0) {
    return null;
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
          📜 Alert History
          <span className="text-xs bg-gray-500/20 px-2 py-0.5 rounded-full text-[var(--text-secondary)]">
            {history.length}
          </span>
        </h3>
        <button
          onClick={onClearHistory}
          className="text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          Clear All
        </button>
      </div>
      
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {history.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2 rounded bg-[var(--bg-hover)] text-sm"
          >
            <div className="flex items-center gap-2">
              <span className={item.condition === 'above' ? 'text-green-400' : 'text-red-400'}>
                {item.condition === 'above' ? '📈' : '📉'}
              </span>
              <button
                onClick={() => onSelectSymbol?.(item.symbol)}
                className="font-medium hover:text-blue-400 transition-colors"
              >
                {item.symbol}
              </button>
              <span className="text-[var(--text-secondary)]">
                {item.condition === 'above' ? '↑' : '↓'} ${item.targetPrice.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
              <span>@ ${item.priceAtTrigger.toLocaleString()}</span>
              <span>{formatTime(item.triggeredAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
