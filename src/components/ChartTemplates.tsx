'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ChartTemplate {
  id: string;
  name: string;
  createdAt: number;
  config: {
    asset: string;
    timeframe: string;
    chartType: 'candlestick' | 'line' | 'area' | 'heikinashi';
    indicators: string[];
  };
}

interface ChartTemplatesProps {
  currentConfig: {
    asset: string;
    timeframe: string;
    chartType: 'candlestick' | 'line' | 'area' | 'heikinashi';
    indicators: string[];
  };
  onLoadTemplate: (config: ChartTemplate['config']) => void;
  className?: string;
}

const STORAGE_KEY = 'chartwise-templates';

// Built-in presets
const PRESETS: ChartTemplate[] = [
  {
    id: 'preset-swing',
    name: '🔄 Swing Trading',
    createdAt: 0,
    config: {
      asset: 'ETH',
      timeframe: '30d',
      chartType: 'candlestick',
      indicators: ['sma20', 'sma50', 'bb', 'stochRsi'],
    },
  },
  {
    id: 'preset-scalp',
    name: '⚡ Scalping',
    createdAt: 0,
    config: {
      asset: 'BTC',
      timeframe: '7d',
      chartType: 'candlestick',
      indicators: ['ema', 'vwap', 'obv'],
    },
  },
  {
    id: 'preset-ichimoku',
    name: '☁️ Ichimoku Setup',
    createdAt: 0,
    config: {
      asset: 'BTC',
      timeframe: '90d',
      chartType: 'candlestick',
      indicators: ['ichimoku'],
    },
  },
  {
    id: 'preset-trend',
    name: '📈 Trend Following',
    createdAt: 0,
    config: {
      asset: 'SOL',
      timeframe: '90d',
      chartType: 'heikinashi',
      indicators: ['sma20', 'sma50', 'atr'],
    },
  },
  {
    id: 'preset-minimal',
    name: '✨ Minimal',
    createdAt: 0,
    config: {
      asset: 'ETH',
      timeframe: '90d',
      chartType: 'area',
      indicators: [],
    },
  },
];

export default function ChartTemplates({ currentConfig, onLoadTemplate, className = '' }: ChartTemplatesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<ChartTemplate[]>([]);
  const [newName, setNewName] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load templates from localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setTemplates(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const saveTemplates = useCallback((newTemplates: ChartTemplate[]) => {
    setTemplates(newTemplates);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTemplates));
  }, []);

  const handleSave = () => {
    if (!newName.trim()) return;

    const template: ChartTemplate = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      createdAt: Date.now(),
      config: { ...currentConfig },
    };

    saveTemplates([...templates, template]);
    setNewName('');
    setShowSave(false);
  };

  const handleDelete = (id: string) => {
    saveTemplates(templates.filter(t => t.id !== id));
  };

  const handleLoad = (config: ChartTemplate['config']) => {
    onLoadTemplate(config);
    setIsOpen(false);
  };

  if (!mounted) return null;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="theme-toggle"
        title="Chart templates"
      >
        📋
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--bg-card)] border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">Chart Templates</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Presets */}
          <div className="p-2">
            <div className="text-xs text-[var(--text-secondary)] px-2 mb-1 uppercase">Presets</div>
            {PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => handleLoad(preset.config)}
                className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-primary)]"
              >
                {preset.name}
                <div className="text-xs text-[var(--text-secondary)]">
                  {preset.config.indicators.length} indicators • {preset.config.chartType}
                </div>
              </button>
            ))}
          </div>

          {/* Custom Templates */}
          {templates.length > 0 && (
            <div className="p-2 border-t border-gray-700">
              <div className="text-xs text-[var(--text-secondary)] px-2 mb-1 uppercase">Saved</div>
              {templates.map(template => (
                <div
                  key={template.id}
                  className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-[var(--bg-hover)] transition-colors group"
                >
                  <button
                    onClick={() => handleLoad(template.config)}
                    className="flex-1 text-left text-sm text-[var(--text-primary)]"
                  >
                    {template.name}
                    <div className="text-xs text-[var(--text-secondary)]">
                      {template.config.asset} • {template.config.indicators.length} indicators
                    </div>
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-sm p-1"
                    title="Delete template"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Save Current */}
          <div className="p-2 border-t border-gray-700">
            {showSave ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="Template name..."
                  className="flex-1 px-3 py-1.5 rounded-md bg-[var(--bg-hover)] border border-gray-600 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  disabled={!newName.trim()}
                  className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => { setShowSave(false); setNewName(''); }}
                  className="px-2 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSave(true)}
                className="w-full px-3 py-2 rounded-md text-sm text-blue-400 hover:bg-[var(--bg-hover)] transition-colors text-center"
              >
                + Save Current Layout
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
