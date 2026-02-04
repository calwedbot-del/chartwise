'use client';

import { useState } from 'react';
import { PriceAlert } from '@/hooks/usePriceAlerts';

interface PriceAlertsProps {
  symbol: string;
  currentPrice: number;
  alerts: PriceAlert[];
  onAddAlert: (symbol: string, targetPrice: number, condition: 'above' | 'below') => void;
  onRemoveAlert: (id: string) => void;
  onRequestPermission: () => void;
}

export default function PriceAlerts({
  symbol,
  currentPrice,
  alerts,
  onAddAlert,
  onRemoveAlert,
  onRequestPermission
}: PriceAlertsProps) {
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [showForm, setShowForm] = useState(false);

  const activeAlerts = alerts.filter(a => a.symbol === symbol && !a.triggered);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(targetPrice);
    if (!isNaN(price) && price > 0) {
      onAddAlert(symbol, price, condition);
      setTargetPrice('');
      setShowForm(false);
      onRequestPermission();
    }
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔔</span>
          <h3 className="font-semibold text-[var(--text-primary)]">Price Alerts</h3>
          {activeAlerts.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
              {activeAlerts.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm px-3 py-1 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
        >
          {showForm ? 'Cancel' : '+ Add Alert'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-3 bg-[var(--bg-hover)] rounded-lg">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Target Price</label>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder={`e.g., ${(currentPrice * 1.1).toFixed(2)}`}
                step="any"
                className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as 'above' | 'below')}
                className="px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm"
              >
                <option value="above">Price goes above</option>
                <option value="below">Price goes below</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm hover:bg-green-600 transition-colors"
              >
                Set Alert
              </button>
            </div>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            Current {symbol} price: ${currentPrice.toLocaleString()}
          </p>
        </form>
      )}

      {activeAlerts.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">
          No active alerts for {symbol}. Click "+ Add Alert" to create one.
        </p>
      ) : (
        <div className="space-y-2">
          {activeAlerts.map(alert => (
            <div
              key={alert.id}
              className="flex items-center justify-between p-2 bg-[var(--bg-hover)] rounded-lg"
            >
              <div className="flex items-center gap-2">
                <span className={`text-lg ${alert.condition === 'above' ? 'text-green-400' : 'text-red-400'}`}>
                  {alert.condition === 'above' ? '📈' : '📉'}
                </span>
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    {alert.condition === 'above' ? 'Above' : 'Below'} ${alert.targetPrice.toLocaleString()}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {((alert.targetPrice - currentPrice) / currentPrice * 100).toFixed(1)}% from current
                  </div>
                </div>
              </div>
              <button
                onClick={() => onRemoveAlert(alert.id)}
                className="text-[var(--text-secondary)] hover:text-red-400 transition-colors p-1"
                title="Remove alert"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
