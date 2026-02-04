'use client';

import { useState, useEffect } from 'react';
import { PortfolioWithPrices } from '@/hooks/usePortfolio';

interface PortfolioProps {
  holdings: PortfolioWithPrices[];
  totalValue: number;
  totalCost: number;
  onAdd: (symbol: string, quantity: number, avgCost: number) => void;
  onRemove: (symbol: string) => void;
  onSelectAsset: (symbol: string) => void;
  availableSymbols: string[];
}

export default function Portfolio({
  holdings,
  totalValue,
  totalCost,
  onAdd,
  onRemove,
  onSelectAsset,
  availableSymbols,
}: PortfolioProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newCost, setNewCost] = useState('');

  const totalPnL = totalValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

  const handleAdd = () => {
    if (newSymbol && newQuantity && newCost) {
      onAdd(newSymbol, parseFloat(newQuantity), parseFloat(newCost));
      setNewSymbol('');
      setNewQuantity('');
      setNewCost('');
      setShowAddForm(false);
    }
  };

  if (holdings.length === 0 && !showAddForm) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💼</span>
            <h3 className="font-semibold text-[var(--text-primary)]">Portfolio</h3>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-sm px-3 py-1 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80"
          >
            + Add Holding
          </button>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-2">Track your investments. Add your first holding.</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] mb-6 overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💼</span>
            <h3 className="font-semibold text-[var(--text-primary)]">Portfolio</h3>
            <span className="text-sm text-[var(--text-secondary)]">({holdings.length} assets)</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-bold text-[var(--text-primary)]">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`text-sm ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%)
              </div>
            </div>
            <span className="text-[var(--text-secondary)]">{isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[var(--border)]">
          {/* Holdings Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-hover)]">
                  <th className="text-left py-2 px-4 text-[var(--text-secondary)]">Asset</th>
                  <th className="text-right py-2 px-4 text-[var(--text-secondary)]">Qty</th>
                  <th className="text-right py-2 px-4 text-[var(--text-secondary)]">Avg Cost</th>
                  <th className="text-right py-2 px-4 text-[var(--text-secondary)]">Price</th>
                  <th className="text-right py-2 px-4 text-[var(--text-secondary)]">Value</th>
                  <th className="text-right py-2 px-4 text-[var(--text-secondary)]">P&L</th>
                  <th className="text-center py-2 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <tr 
                    key={h.symbol} 
                    className="border-t border-[var(--border)] hover:bg-[var(--bg-hover)] cursor-pointer"
                    onClick={() => onSelectAsset(h.symbol)}
                  >
                    <td className="py-3 px-4 font-medium text-[var(--text-primary)]">{h.symbol}</td>
                    <td className="text-right py-3 px-4 text-[var(--text-primary)]">{h.quantity.toFixed(4)}</td>
                    <td className="text-right py-3 px-4 text-[var(--text-secondary)]">${h.avgCost.toFixed(2)}</td>
                    <td className="text-right py-3 px-4 text-[var(--text-primary)]">${h.currentPrice.toFixed(2)}</td>
                    <td className="text-right py-3 px-4 text-[var(--text-primary)]">${h.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className={`text-right py-3 px-4 ${h.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {h.pnl >= 0 ? '+' : ''}{h.pnl.toFixed(2)} ({h.pnlPercent >= 0 ? '+' : ''}{h.pnlPercent.toFixed(1)}%)
                    </td>
                    <td className="text-center py-3 px-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemove(h.symbol); }}
                        className="text-red-400 hover:text-red-300 text-lg"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Form */}
          {showAddForm ? (
            <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-hover)]">
              <div className="flex flex-wrap gap-2 items-end">
                <div>
                  <label className="text-xs text-[var(--text-secondary)] block mb-1">Asset</label>
                  <select
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    className="bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)]"
                  >
                    <option value="">Select...</option>
                    {availableSymbols
                      .filter(s => !holdings.find(h => h.symbol === s))
                      .map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))
                    }
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--text-secondary)] block mb-1">Quantity</label>
                  <input
                    type="number"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    placeholder="0.00"
                    step="any"
                    className="bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1.5 text-sm w-24 text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-secondary)] block mb-1">Avg Cost</label>
                  <input
                    type="number"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    placeholder="0.00"
                    step="any"
                    className="bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1.5 text-sm w-24 text-[var(--text-primary)]"
                  />
                </div>
                <button
                  onClick={handleAdd}
                  disabled={!newSymbol || !newQuantity || !newCost}
                  className="px-3 py-1.5 text-sm rounded bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-sm rounded bg-gray-600 text-white hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 border-t border-[var(--border)]">
              <button
                onClick={() => setShowAddForm(true)}
                className="text-sm text-[var(--accent)] hover:underline"
              >
                + Add Holding
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
