'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { OHLCV, SMA, EMA, RSI, ATR } from '@/utils/indicators';

interface CustomIndicator {
  id: string;
  name: string;
  formula: string;
  color: string;
  enabled: boolean;
  createdAt: number;
}

interface CustomIndicatorBuilderProps {
  data: OHLCV[];
  symbol: string;
  className?: string;
}

const STORAGE_KEY = 'chartwise-custom-indicators';

const PRESET_FORMULAS = [
  { name: 'Price vs SMA20', formula: 'close / sma(close, 20) * 100 - 100', description: 'Distance from 20-period SMA (%)' },
  { name: 'RSI Momentum', formula: 'rsi(close, 7) - rsi(close, 21)', description: 'Fast RSI minus slow RSI' },
  { name: 'ATR %', formula: 'atr(14) / close * 100', description: 'ATR as percentage of price' },
  { name: 'Volume Ratio', formula: 'volume / sma(volume, 20)', description: 'Current volume vs 20-period average' },
  { name: 'Price Range', formula: '(high - low) / close * 100', description: 'Daily range as percentage' },
  { name: 'Avg Close', formula: '(high + low + close) / 3', description: 'Typical price (HLC/3)' },
];

const INDICATOR_COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// Simple formula evaluator (safe, no eval)
function evaluateFormula(formula: string, data: OHLCV[]): { values: number[]; error: string | null } {
  try {
    if (data.length < 30) return { values: [], error: 'Need at least 30 data points' };
    
    const closes = data.map(d => d.close);
    const opens = data.map(d => d.open);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume || 0);
    
    // Parse and evaluate the formula for each data point
    // Supported functions: sma(series, period), ema(series, period), rsi(series, period), atr(period)
    // Supported series: close, open, high, low, volume
    // Supported operators: +, -, *, /
    
    // Pre-compute indicator functions referenced in formula
    const indicatorCache: Record<string, number[]> = {};
    
    // Find all function calls in formula
    const funcPattern = /(sma|ema|rsi|atr)\(([^)]+)\)/g;
    let match;
    const processedFormula = formula.replace(funcPattern, (fullMatch, func, args) => {
      const cacheKey = fullMatch;
      if (indicatorCache[cacheKey]) return `__cache__${cacheKey}__`;
      
      const argParts = args.split(',').map((s: string) => s.trim());
      let series: number[];
      let period: number;
      
      switch (func) {
        case 'sma': {
          series = argParts[0] === 'volume' ? volumes : 
                   argParts[0] === 'high' ? highs :
                   argParts[0] === 'low' ? lows :
                   argParts[0] === 'open' ? opens : closes;
          period = parseInt(argParts[1]) || 20;
          indicatorCache[cacheKey] = SMA(series, period);
          break;
        }
        case 'ema': {
          series = argParts[0] === 'volume' ? volumes :
                   argParts[0] === 'high' ? highs :
                   argParts[0] === 'low' ? lows :
                   argParts[0] === 'open' ? opens : closes;
          period = parseInt(argParts[1]) || 20;
          indicatorCache[cacheKey] = EMA(series, period);
          break;
        }
        case 'rsi': {
          series = argParts[0] === 'close' ? closes : closes;
          period = parseInt(argParts[1]) || 14;
          indicatorCache[cacheKey] = RSI(series, period);
          break;
        }
        case 'atr': {
          period = parseInt(argParts[0]) || 14;
          indicatorCache[cacheKey] = ATR(data, period);
          break;
        }
      }
      
      return `__cache__${cacheKey}__`;
    });
    
    // Evaluate formula for each data point
    const results: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      let expr = processedFormula;
      
      // Replace series references with values
      expr = expr.replace(/\bclose\b/g, closes[i].toString());
      expr = expr.replace(/\bopen\b/g, opens[i].toString());
      expr = expr.replace(/\bhigh\b/g, highs[i].toString());
      expr = expr.replace(/\blow\b/g, lows[i].toString());
      expr = expr.replace(/\bvolume\b/g, volumes[i].toString());
      
      // Replace cached indicator values
      for (const [key, values] of Object.entries(indicatorCache)) {
        const placeholder = `__cache__${key}__`;
        const val = values[i];
        expr = expr.replace(placeholder, isNaN(val) ? 'NaN' : val.toString());
      }
      
      // Simple arithmetic evaluation (safe, no eval)
      try {
        const value = safeEval(expr);
        results.push(value);
      } catch {
        results.push(NaN);
      }
    }
    
    return { values: results, error: null };
  } catch (err) {
    return { values: [], error: `Formula error: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}

// Safe arithmetic evaluation (no eval, only handles +, -, *, /, parentheses, and numbers)
function safeEval(expr: string): number {
  // Remove whitespace
  expr = expr.replace(/\s/g, '');
  
  // If it contains NaN, return NaN
  if (expr.includes('NaN')) return NaN;
  
  // Simple recursive descent parser
  let pos = 0;
  
  function parseExpression(): number {
    let result = parseTerm();
    while (pos < expr.length && (expr[pos] === '+' || expr[pos] === '-')) {
      const op = expr[pos++];
      const term = parseTerm();
      result = op === '+' ? result + term : result - term;
    }
    return result;
  }
  
  function parseTerm(): number {
    let result = parseFactor();
    while (pos < expr.length && (expr[pos] === '*' || expr[pos] === '/')) {
      const op = expr[pos++];
      const factor = parseFactor();
      result = op === '*' ? result * factor : result / factor;
    }
    return result;
  }
  
  function parseFactor(): number {
    // Unary minus
    if (expr[pos] === '-') {
      pos++;
      return -parseFactor();
    }
    
    // Parentheses
    if (expr[pos] === '(') {
      pos++; // skip (
      const result = parseExpression();
      pos++; // skip )
      return result;
    }
    
    // Number
    const start = pos;
    while (pos < expr.length && (expr[pos] >= '0' && expr[pos] <= '9' || expr[pos] === '.')) {
      pos++;
    }
    
    if (pos > start) {
      return parseFloat(expr.slice(start, pos));
    }
    
    return NaN;
  }
  
  const result = parseExpression();
  return result;
}

export default function CustomIndicatorBuilder({ data, symbol, className = '' }: CustomIndicatorBuilderProps) {
  const [indicators, setIndicators] = useState<CustomIndicator[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFormula, setNewFormula] = useState('');
  const [newColor, setNewColor] = useState(INDICATOR_COLORS[0]);
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setIndicators(JSON.parse(stored));
      } catch {
        setIndicators([]);
      }
    }
  }, []);

  const save = useCallback((newIndicators: CustomIndicator[]) => {
    setIndicators(newIndicators);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newIndicators));
    }
  }, []);

  // Compute all enabled indicators
  const computedIndicators = useMemo(() => {
    if (data.length < 30) return [];
    
    return indicators
      .filter(ind => ind.enabled)
      .map(ind => {
        const { values, error } = evaluateFormula(ind.formula, data);
        return { ...ind, values, error };
      });
  }, [indicators, data]);

  const testFormula = useCallback(() => {
    if (!newFormula.trim()) {
      setFormulaError('Formula is empty');
      return;
    }
    const { values, error } = evaluateFormula(newFormula, data);
    if (error) {
      setFormulaError(error);
    } else {
      const validValues = values.filter(v => !isNaN(v));
      if (validValues.length === 0) {
        setFormulaError('Formula returns no valid values');
      } else {
        setFormulaError(null);
      }
    }
  }, [newFormula, data]);

  const addIndicator = useCallback(() => {
    if (!newName.trim() || !newFormula.trim()) return;
    
    const newInd: CustomIndicator = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      formula: newFormula.trim(),
      color: newColor,
      enabled: true,
      createdAt: Date.now(),
    };
    
    save([...indicators, newInd]);
    setNewName('');
    setNewFormula('');
    setFormulaError(null);
    setShowCreate(false);
  }, [indicators, newName, newFormula, newColor, save]);

  const removeIndicator = useCallback((id: string) => {
    save(indicators.filter(i => i.id !== id));
  }, [indicators, save]);

  const toggleIndicator = useCallback((id: string) => {
    save(indicators.map(i => i.id === id ? { ...i, enabled: !i.enabled } : i));
  }, [indicators, save]);

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🔧</span>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Custom Indicators</h3>
          {indicators.filter(i => i.enabled).length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">
              {indicators.filter(i => i.enabled).length} active
            </span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3">
          {/* Existing Indicators */}
          {indicators.length > 0 && (
            <div className="space-y-1.5">
              {indicators.map(ind => {
                const computed = computedIndicators.find(c => c.id === ind.id);
                const lastValue = computed?.values[computed.values.length - 1];
                
                return (
                  <div key={ind.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-hover)] group">
                    <button
                      onClick={() => toggleIndicator(ind.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                        ind.enabled ? 'border-transparent text-white' : 'border-gray-500'
                      }`}
                      style={ind.enabled ? { backgroundColor: ind.color } : undefined}
                    >
                      {ind.enabled && '✓'}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-[var(--text-primary)]">{ind.name}</span>
                      <span className="text-xs text-[var(--text-secondary)] ml-2 font-mono">{ind.formula}</span>
                    </div>
                    {computed && !computed.error && lastValue !== undefined && !isNaN(lastValue) && (
                      <span className="text-xs font-mono text-[var(--text-primary)]">
                        {lastValue.toFixed(2)}
                      </span>
                    )}
                    {computed?.error && (
                      <span className="text-xs text-red-400">Error</span>
                    )}
                    <button
                      onClick={() => removeIndicator(ind.id)}
                      className="text-xs text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Computed Values Display */}
          {computedIndicators.length > 0 && (
            <div className="bg-[var(--bg-hover)] rounded-lg p-2">
              <span className="text-xs text-[var(--text-secondary)] block mb-1">Current Values</span>
              <div className="flex flex-wrap gap-3">
                {computedIndicators.map(ind => {
                  const lastValue = ind.values[ind.values.length - 1];
                  return (
                    <div key={ind.id} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ind.color }} />
                      <span className="text-xs text-[var(--text-secondary)]">{ind.name}:</span>
                      <span className="text-xs font-mono font-medium text-[var(--text-primary)]">
                        {ind.error ? 'Error' : isNaN(lastValue) ? '—' : lastValue.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create New */}
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="w-full px-3 py-1.5 text-xs rounded bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-purple-500/10 hover:text-purple-400 transition-colors"
          >
            {showCreate ? 'Cancel' : '+ Create Custom Indicator'}
          </button>

          {showCreate && (
            <div className="bg-[var(--bg-hover)] rounded-lg p-3 space-y-2">
              <div>
                <label className="text-xs text-[var(--text-secondary)] block mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="My Custom Indicator"
                  className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] rounded px-3 py-1.5 text-xs border border-[var(--border)] focus:border-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] block mb-1">
                  Formula <span className="text-gray-500">(uses: close, open, high, low, volume, sma(), ema(), rsi(), atr())</span>
                </label>
                <input
                  type="text"
                  value={newFormula}
                  onChange={(e) => { setNewFormula(e.target.value); setFormulaError(null); }}
                  placeholder="close / sma(close, 20) * 100 - 100"
                  className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] rounded px-3 py-1.5 text-xs font-mono border border-[var(--border)] focus:border-purple-500 outline-none"
                />
                {formulaError && (
                  <p className="text-xs text-red-400 mt-1">{formulaError}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--text-secondary)]">Color:</label>
                {INDICATOR_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${
                      newColor === c ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Presets */}
              <div>
                <label className="text-xs text-[var(--text-secondary)] block mb-1">Quick Presets:</label>
                <div className="space-y-1">
                  {PRESET_FORMULAS.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setNewName(preset.name);
                        setNewFormula(preset.formula);
                        setFormulaError(null);
                      }}
                      className="w-full flex items-center justify-between p-1.5 rounded text-xs hover:bg-[var(--bg-card)] transition-colors text-left"
                    >
                      <span className="text-[var(--text-primary)]">{preset.name}</span>
                      <span className="text-[var(--text-secondary)] font-mono text-xs truncate ml-2">{preset.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={testFormula}
                  className="px-3 py-1 text-xs rounded bg-gray-600 text-white hover:bg-gray-500 transition-colors"
                >
                  Test
                </button>
                <button
                  onClick={addIndicator}
                  disabled={!newName.trim() || !newFormula.trim()}
                  className="px-3 py-1 text-xs rounded bg-purple-500 text-white hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
