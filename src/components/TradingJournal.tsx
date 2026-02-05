'use client';

import { useState, useEffect } from 'react';
import { safeGetJSON, safeSetJSON } from '@/utils/storage';

interface Trade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
  date: string;
  notes: string;
  pnl?: number;
}

interface TradingJournalProps {
  symbol: string;
  currentPrice: number;
  className?: string;
}

export default function TradingJournal({ symbol, currentPrice, className = '' }: TradingJournalProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'buy' as 'buy' | 'sell',
    price: currentPrice,
    quantity: 1,
    notes: ''
  });

  // Load trades from localStorage
  useEffect(() => {
    setTrades(safeGetJSON<Trade[]>('chartwise-trades', []));
  }, []);

  // Save trades to localStorage
  useEffect(() => {
    safeSetJSON('chartwise-trades', trades);
  }, [trades]);

  const addTrade = () => {
    const newTrade: Trade = {
      id: Date.now().toString(),
      symbol,
      type: formData.type,
      price: formData.price,
      quantity: formData.quantity,
      date: new Date().toISOString(),
      notes: formData.notes,
    };
    setTrades([newTrade, ...trades]);
    setShowForm(false);
    setFormData({ type: 'buy', price: currentPrice, quantity: 1, notes: '' });
  };

  const deleteTrade = (id: string) => {
    setTrades(trades.filter(t => t.id !== id));
  };

  const symbolTrades = trades.filter(t => t.symbol.toLowerCase() === symbol.toLowerCase());
  
  // Calculate P&L for each trade
  const tradesWithPnL = symbolTrades.map(trade => {
    const pnl = trade.type === 'buy' 
      ? (currentPrice - trade.price) * trade.quantity
      : (trade.price - currentPrice) * trade.quantity;
    return { ...trade, pnl };
  });

  const totalPnL = tradesWithPnL.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalInvested = symbolTrades
    .filter(t => t.type === 'buy')
    .reduce((sum, t) => sum + (t.price * t.quantity), 0);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatMoney = (value: number) => {
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}$${value.toFixed(2)}`;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          📝 Trading Journal
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Trade'}
        </button>
      </div>

      {/* Summary */}
      {symbolTrades.length > 0 && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {symbolTrades.length} trade{symbolTrades.length !== 1 ? 's' : ''} for {symbol}
            </span>
            <span className={`font-semibold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              Unrealized P&L: {formatMoney(totalPnL)}
            </span>
          </div>
        </div>
      )}

      {/* Add Trade Form */}
      {showForm && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setFormData({ ...formData, type: 'buy' })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                formData.type === 'buy'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              📈 Buy
            </button>
            <button
              onClick={() => setFormData({ ...formData, type: 'sell' })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                formData.type === 'sell'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              📉 Sell
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Price</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Quantity</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                step="0.001"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              rows={2}
              placeholder="Why did you make this trade?"
            />
          </div>

          <button
            onClick={addTrade}
            className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Log Trade
          </button>
        </div>
      )}

      {/* Trade List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[300px] overflow-y-auto">
        {tradesWithPnL.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            No trades logged for {symbol}
          </div>
        ) : (
          tradesWithPnL.map((trade) => (
            <div key={trade.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-lg ${trade.type === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                    {trade.type === 'buy' ? '📈' : '📉'}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {trade.type.toUpperCase()} {trade.quantity} @ ${trade.price.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(trade.date)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${(trade.pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatMoney(trade.pnl || 0)}
                  </span>
                  <button
                    onClick={() => deleteTrade(trade.id)}
                    className="text-gray-400 hover:text-red-500 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {trade.notes && (
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 ml-7">
                  {trade.notes}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
