'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { OHLCV, RSI, MACD, SMA, BollingerBands } from '@/utils/indicators';
import { safeGetJSON, safeSetJSON } from '@/utils/storage';

type ConditionType = 'rsi_above' | 'rsi_below' | 'macd_cross_up' | 'macd_cross_down' | 
                     'price_above_sma' | 'price_below_sma' | 'bb_upper_touch' | 'bb_lower_touch' |
                     'volume_spike' | 'price_change_pct';

interface AlertCondition {
  id: string;
  type: ConditionType;
  value: number;
  symbol: string;
  name: string;
  description: string;
  active: boolean;
  triggered: boolean;
  triggeredAt?: number;
  createdAt: number;
}

interface AlertConditionsBuilderProps {
  symbol: string;
  data: OHLCV[];
  currentPrice: number;
  className?: string;
}

const CONDITION_TEMPLATES: { type: ConditionType; name: string; description: string; defaultValue: number; unit: string }[] = [
  { type: 'rsi_above', name: 'RSI Overbought', description: 'RSI crosses above threshold', defaultValue: 70, unit: '' },
  { type: 'rsi_below', name: 'RSI Oversold', description: 'RSI crosses below threshold', defaultValue: 30, unit: '' },
  { type: 'macd_cross_up', name: 'MACD Bullish Cross', description: 'MACD line crosses above signal', defaultValue: 0, unit: '' },
  { type: 'macd_cross_down', name: 'MACD Bearish Cross', description: 'MACD line crosses below signal', defaultValue: 0, unit: '' },
  { type: 'price_above_sma', name: 'Price Above SMA', description: 'Price crosses above SMA period', defaultValue: 20, unit: 'period' },
  { type: 'price_below_sma', name: 'Price Below SMA', description: 'Price crosses below SMA period', defaultValue: 20, unit: 'period' },
  { type: 'bb_upper_touch', name: 'BB Upper Band Touch', description: 'Price touches Bollinger upper band', defaultValue: 20, unit: 'period' },
  { type: 'bb_lower_touch', name: 'BB Lower Band Touch', description: 'Price touches Bollinger lower band', defaultValue: 20, unit: 'period' },
  { type: 'volume_spike', name: 'Volume Spike', description: 'Volume exceeds average by multiplier', defaultValue: 2, unit: 'x avg' },
  { type: 'price_change_pct', name: 'Price Change %', description: 'Price changes by more than %', defaultValue: 5, unit: '%' },
];

const STORAGE_KEY = 'chartwise-alert-conditions';

function checkCondition(condition: AlertCondition, data: OHLCV[], currentPrice: number): boolean {
  if (data.length < 30) return false;
  const closes = data.map(d => d.close);
  
  switch (condition.type) {
    case 'rsi_above': {
      const rsiValues = RSI(closes);
      const currentRsi = rsiValues[rsiValues.length - 1];
      return !isNaN(currentRsi) && currentRsi > condition.value;
    }
    case 'rsi_below': {
      const rsiValues = RSI(closes);
      const currentRsi = rsiValues[rsiValues.length - 1];
      return !isNaN(currentRsi) && currentRsi < condition.value;
    }
    case 'macd_cross_up': {
      const macd = MACD(closes);
      const len = macd.histogram.length;
      if (len < 2) return false;
      const prev = macd.histogram[len - 2];
      const curr = macd.histogram[len - 1];
      return !isNaN(prev) && !isNaN(curr) && prev <= 0 && curr > 0;
    }
    case 'macd_cross_down': {
      const macd = MACD(closes);
      const len = macd.histogram.length;
      if (len < 2) return false;
      const prev = macd.histogram[len - 2];
      const curr = macd.histogram[len - 1];
      return !isNaN(prev) && !isNaN(curr) && prev >= 0 && curr < 0;
    }
    case 'price_above_sma': {
      const period = Math.max(5, Math.min(200, condition.value));
      const sma = SMA(closes, period);
      const lastSma = sma[sma.length - 1];
      return !isNaN(lastSma) && currentPrice > lastSma;
    }
    case 'price_below_sma': {
      const period = Math.max(5, Math.min(200, condition.value));
      const sma = SMA(closes, period);
      const lastSma = sma[sma.length - 1];
      return !isNaN(lastSma) && currentPrice < lastSma;
    }
    case 'bb_upper_touch': {
      const period = Math.max(5, Math.min(200, condition.value));
      const bb = BollingerBands(closes, period);
      const lastUpper = bb.upper[bb.upper.length - 1];
      return !isNaN(lastUpper) && currentPrice >= lastUpper;
    }
    case 'bb_lower_touch': {
      const period = Math.max(5, Math.min(200, condition.value));
      const bb = BollingerBands(closes, period);
      const lastLower = bb.lower[bb.lower.length - 1];
      return !isNaN(lastLower) && currentPrice <= lastLower;
    }
    case 'volume_spike': {
      const volumes = data.map(d => d.volume || 0);
      if (volumes.length < 20) return false;
      const avgVol = volumes.slice(-20).reduce((s, v) => s + v, 0) / 20;
      const currentVol = volumes[volumes.length - 1];
      return avgVol > 0 && currentVol > avgVol * condition.value;
    }
    case 'price_change_pct': {
      if (data.length < 2) return false;
      const prevClose = data[data.length - 2].close;
      const changePct = Math.abs((currentPrice - prevClose) / prevClose) * 100;
      return changePct >= condition.value;
    }
    default:
      return false;
  }
}

export default function AlertConditionsBuilder({
  symbol,
  data,
  currentPrice,
  className = '',
}: AlertConditionsBuilderProps) {
  const [conditions, setConditions] = useState<AlertCondition[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage
  useEffect(() => {
    setMounted(true);
    setConditions(safeGetJSON<AlertCondition[]>(STORAGE_KEY, []));
  }, []);

  const save = useCallback((newConditions: AlertCondition[]) => {
    setConditions(newConditions);
    safeSetJSON(STORAGE_KEY, newConditions);
  }, []);

  // Check conditions when data updates
  const checkedConditions = useMemo(() => {
    if (!mounted || data.length < 20) return conditions;
    
    return conditions.map(condition => {
      if (!condition.active || condition.symbol !== symbol) return condition;
      
      const isTriggered = checkCondition(condition, data, currentPrice);
      if (isTriggered && !condition.triggered) {
        // Notify
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`ChartWise: ${condition.name}`, {
            body: `${symbol}: ${condition.description} (value: ${condition.value})`,
            icon: '/favicon.ico',
          });
        }
        return { ...condition, triggered: true, triggeredAt: Date.now() };
      }
      // Reset trigger if condition no longer met
      if (!isTriggered && condition.triggered) {
        return { ...condition, triggered: false, triggeredAt: undefined };
      }
      return condition;
    });
  }, [conditions, data, currentPrice, symbol, mounted]);

  // Save when conditions change
  useEffect(() => {
    if (mounted && checkedConditions !== conditions) {
      save(checkedConditions);
    }
  }, [checkedConditions, conditions, mounted, save]);

  const addCondition = useCallback((type: ConditionType, value: number) => {
    const template = CONDITION_TEMPLATES.find(t => t.type === type);
    if (!template) return;

    const newCondition: AlertCondition = {
      id: `cond-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type,
      value,
      symbol,
      name: template.name,
      description: template.description,
      active: true,
      triggered: false,
      createdAt: Date.now(),
    };

    save([...conditions, newCondition]);
    setShowAdd(false);
  }, [conditions, save, symbol]);

  const removeCondition = useCallback((id: string) => {
    save(conditions.filter(c => c.id !== id));
  }, [conditions, save]);

  const toggleCondition = useCallback((id: string) => {
    save(conditions.map(c => c.id === id ? { ...c, active: !c.active, triggered: false } : c));
  }, [conditions, save]);

  const symbolConditions = checkedConditions.filter(c => c.symbol === symbol);
  const activeTriggered = symbolConditions.filter(c => c.active && c.triggered);

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🔔</span>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Alert Conditions</h3>
          {symbolConditions.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
              {symbolConditions.filter(c => c.active).length} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeTriggered.length > 0 && (
            <span className="px-2 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-400 animate-pulse">
              {activeTriggered.length} triggered!
            </span>
          )}
          <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3">
          {/* Triggered alerts */}
          {activeTriggered.length > 0 && (
            <div className="space-y-1.5">
              {activeTriggered.map(cond => (
                <div key={cond.id} className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2">
                  <span className="text-sm">🔔</span>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-yellow-400">{cond.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{cond.description}</p>
                  </div>
                  <button
                    onClick={() => toggleCondition(cond.id)}
                    className="text-xs text-gray-500 hover:text-yellow-400"
                  >
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Active conditions list */}
          {symbolConditions.length > 0 ? (
            <div className="space-y-1.5">
              {symbolConditions.map(cond => {
                const template = CONDITION_TEMPLATES.find(t => t.type === cond.type);
                return (
                  <div key={cond.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-hover)] group">
                    <button
                      onClick={() => toggleCondition(cond.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                        cond.active
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-gray-500'
                      }`}
                    >
                      {cond.active && '✓'}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-medium ${cond.active ? 'text-[var(--text-primary)]' : 'text-gray-500 line-through'}`}>
                        {cond.name}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)] ml-2">
                        {cond.value}{template?.unit || ''}
                      </span>
                    </div>
                    {cond.triggered && (
                      <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">MET</span>
                    )}
                    <button
                      onClick={() => removeCondition(cond.id)}
                      className="text-xs text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-xs text-[var(--text-secondary)] py-2">
              No alert conditions for {symbol}
            </div>
          )}

          {/* Add new condition */}
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="w-full px-3 py-1.5 text-xs rounded bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-blue-500/10 hover:text-blue-400 transition-colors"
          >
            + Add Condition
          </button>

          {showAdd && (
            <div className="space-y-2 bg-[var(--bg-hover)] rounded-lg p-3">
              {CONDITION_TEMPLATES.map(template => (
                <button
                  key={template.type}
                  onClick={() => addCondition(template.type, template.defaultValue)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-card)] transition-colors text-left"
                >
                  <div>
                    <p className="text-xs font-medium text-[var(--text-primary)]">{template.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{template.description}</p>
                  </div>
                  <span className="text-xs text-[var(--text-secondary)] shrink-0 ml-2">
                    {template.defaultValue}{template.unit}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
