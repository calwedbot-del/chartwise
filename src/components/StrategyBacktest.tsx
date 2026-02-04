'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi } from 'lightweight-charts';
import { OHLCV } from '@/utils/indicators';
import { runBacktest, BacktestResult, StrategyType, StrategyConfig } from '@/utils/backtesting';

interface StrategyBacktestProps {
  data: OHLCV[];
  symbol: string;
}

const STRATEGIES: { id: StrategyType; name: string; description: string; icon: string }[] = [
  { id: 'sma_crossover', name: 'SMA Crossover', description: 'Buy on golden cross, sell on death cross', icon: '📈' },
  { id: 'ema_crossover', name: 'EMA Crossover', description: 'Fast/slow EMA crossover signals', icon: '⚡' },
  { id: 'rsi_reversal', name: 'RSI Reversal', description: 'Buy oversold, sell overbought', icon: '🔄' },
  { id: 'bollinger_bounce', name: 'Bollinger Bounce', description: 'Buy at lower band, sell at upper', icon: '📊' },
];

export default function StrategyBacktest({ data, symbol }: StrategyBacktestProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('sma_crossover');
  const [config, setConfig] = useState<Partial<StrategyConfig>>({});
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [initialCapital, setInitialCapital] = useState(10000);
  const equityChartRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Run backtest when strategy or data changes
  useEffect(() => {
    if (!isOpen || data.length < 30) return;

    const fullConfig: StrategyConfig = {
      type: selectedStrategy,
      initialCapital,
      ...config,
    };

    const result = runBacktest(data, fullConfig);
    setResult(result);
  }, [isOpen, data, selectedStrategy, config, initialCapital]);

  // Render equity chart
  useEffect(() => {
    if (!equityChartRef.current || !result || result.equity.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(equityChartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#1e222d' },
        horzLines: { color: '#1e222d' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#2a2e39' },
      timeScale: { borderColor: '#2a2e39', timeVisible: true },
      width: equityChartRef.current.clientWidth,
      height: 250,
    });

    chartRef.current = chart;

    // Equity curve
    const equitySeries = chart.addAreaSeries({
      topColor: result.totalReturn >= 0 ? 'rgba(38, 166, 154, 0.4)' : 'rgba(239, 83, 80, 0.4)',
      bottomColor: result.totalReturn >= 0 ? 'rgba(38, 166, 154, 0.0)' : 'rgba(239, 83, 80, 0.0)',
      lineColor: result.totalReturn >= 0 ? '#26a69a' : '#ef5350',
      lineWidth: 2,
    });

    equitySeries.setData(result.equity as any);

    // Add buy/sell markers
    const markers = result.trades.map(trade => ({
      time: trade.date,
      position: trade.type === 'buy' ? 'belowBar' as const : 'aboveBar' as const,
      color: trade.type === 'buy' ? '#26a69a' : '#ef5350',
      shape: trade.type === 'buy' ? 'arrowUp' as const : 'arrowDown' as const,
      text: trade.type === 'buy' ? 'B' : 'S',
    }));

    equitySeries.setMarkers(markers as any);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (equityChartRef.current && chart) {
        chart.applyOptions({ width: equityChartRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current = null;
      chart.remove();
    };
  }, [result]);

  const strategyInfo = STRATEGIES.find(s => s.id === selectedStrategy);

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] rounded-lg text-sm font-medium text-[var(--text-primary)] transition-colors border border-[var(--border)]"
      >
        <span>🧪</span>
        <span>Strategy Backtester</span>
        <span className="text-[var(--text-secondary)]">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="mt-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-[var(--border)]">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
              🧪 Strategy Backtester — {symbol}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Test trading strategies against historical data. Results don&apos;t guarantee future performance.
            </p>
          </div>

          {/* Strategy Selector */}
          <div className="p-4 border-b border-[var(--border)]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {STRATEGIES.map(strategy => (
                <button
                  key={strategy.id}
                  onClick={() => {
                    setSelectedStrategy(strategy.id);
                    setConfig({});
                  }}
                  className={`p-3 rounded-lg text-left transition-all border ${
                    selectedStrategy === strategy.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-[var(--border)] bg-[var(--bg-hover)] hover:border-gray-500'
                  }`}
                >
                  <div className="text-lg mb-1">{strategy.icon}</div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{strategy.name}</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">{strategy.description}</div>
                </button>
              ))}
            </div>

            {/* Strategy Parameters */}
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="text-xs text-[var(--text-secondary)] block mb-1">Initial Capital ($)</label>
                <input
                  type="number"
                  value={initialCapital}
                  onChange={e => setInitialCapital(parseFloat(e.target.value) || 10000)}
                  className="bg-[var(--bg-hover)] text-[var(--text-primary)] rounded px-3 py-1 text-sm border border-[var(--border)] w-28"
                />
              </div>

              {(selectedStrategy === 'sma_crossover' || selectedStrategy === 'ema_crossover') && (
                <>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] block mb-1">Fast Period</label>
                    <input
                      type="number"
                      value={config.fastPeriod || (selectedStrategy === 'sma_crossover' ? 10 : 12)}
                      onChange={e => setConfig(c => ({ ...c, fastPeriod: parseInt(e.target.value) || 10 }))}
                      className="bg-[var(--bg-hover)] text-[var(--text-primary)] rounded px-3 py-1 text-sm border border-[var(--border)] w-20"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] block mb-1">Slow Period</label>
                    <input
                      type="number"
                      value={config.slowPeriod || (selectedStrategy === 'sma_crossover' ? 30 : 26)}
                      onChange={e => setConfig(c => ({ ...c, slowPeriod: parseInt(e.target.value) || 30 }))}
                      className="bg-[var(--bg-hover)] text-[var(--text-primary)] rounded px-3 py-1 text-sm border border-[var(--border)] w-20"
                    />
                  </div>
                </>
              )}

              {selectedStrategy === 'rsi_reversal' && (
                <>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] block mb-1">RSI Period</label>
                    <input
                      type="number"
                      value={config.rsiPeriod || 14}
                      onChange={e => setConfig(c => ({ ...c, rsiPeriod: parseInt(e.target.value) || 14 }))}
                      className="bg-[var(--bg-hover)] text-[var(--text-primary)] rounded px-3 py-1 text-sm border border-[var(--border)] w-20"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] block mb-1">Buy Below RSI</label>
                    <input
                      type="number"
                      value={config.rsiBuyThreshold || 30}
                      onChange={e => setConfig(c => ({ ...c, rsiBuyThreshold: parseInt(e.target.value) || 30 }))}
                      className="bg-[var(--bg-hover)] text-[var(--text-primary)] rounded px-3 py-1 text-sm border border-[var(--border)] w-20"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] block mb-1">Sell Above RSI</label>
                    <input
                      type="number"
                      value={config.rsiSellThreshold || 70}
                      onChange={e => setConfig(c => ({ ...c, rsiSellThreshold: parseInt(e.target.value) || 70 }))}
                      className="bg-[var(--bg-hover)] text-[var(--text-primary)] rounded px-3 py-1 text-sm border border-[var(--border)] w-20"
                    />
                  </div>
                </>
              )}

              {selectedStrategy === 'bollinger_bounce' && (
                <div>
                  <label className="text-xs text-[var(--text-secondary)] block mb-1">BB Period</label>
                  <input
                    type="number"
                    value={config.fastPeriod || 20}
                    onChange={e => setConfig(c => ({ ...c, fastPeriod: parseInt(e.target.value) || 20 }))}
                    className="bg-[var(--bg-hover)] text-[var(--text-primary)] rounded px-3 py-1 text-sm border border-[var(--border)] w-20"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          {result && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-[var(--border)]">
                <div className="bg-[var(--bg-hover)] rounded-lg p-3">
                  <div className="text-xs text-[var(--text-secondary)]">Total Return</div>
                  <div className={`text-xl font-bold ${result.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {result.totalReturn >= 0 ? '+' : ''}{result.totalReturn.toFixed(2)}%
                  </div>
                </div>
                <div className="bg-[var(--bg-hover)] rounded-lg p-3">
                  <div className="text-xs text-[var(--text-secondary)]">Win Rate</div>
                  <div className={`text-xl font-bold ${result.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                    {result.winRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {result.winningTrades}W / {result.losingTrades}L
                  </div>
                </div>
                <div className="bg-[var(--bg-hover)] rounded-lg p-3">
                  <div className="text-xs text-[var(--text-secondary)]">Max Drawdown</div>
                  <div className="text-xl font-bold text-red-400">
                    -{result.maxDrawdown.toFixed(2)}%
                  </div>
                </div>
                <div className="bg-[var(--bg-hover)] rounded-lg p-3">
                  <div className="text-xs text-[var(--text-secondary)]">Sharpe Ratio</div>
                  <div className={`text-xl font-bold ${result.sharpeRatio >= 1 ? 'text-green-400' : result.sharpeRatio >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {result.sharpeRatio.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Additional Metrics */}
              <div className="grid grid-cols-3 gap-3 px-4 py-3 border-b border-[var(--border)]">
                <div className="text-sm">
                  <span className="text-[var(--text-secondary)]">Total Trades: </span>
                  <span className="text-[var(--text-primary)] font-medium">{result.totalTrades}</span>
                </div>
                <div className="text-sm">
                  <span className="text-[var(--text-secondary)]">Profit Factor: </span>
                  <span className={`font-medium ${result.profitFactor >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                    {result.profitFactor === Infinity ? '∞' : result.profitFactor.toFixed(2)}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-[var(--text-secondary)]">Final Equity: </span>
                  <span className="text-[var(--text-primary)] font-medium">
                    ${result.equity.length > 0 ? result.equity[result.equity.length - 1].value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}
                  </span>
                </div>
              </div>

              {/* Equity Chart */}
              <div className="p-4 border-b border-[var(--border)]">
                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Equity Curve</h4>
                <div ref={equityChartRef} />
              </div>

              {/* Trade History */}
              <div className="p-4">
                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Trade History ({result.trades.length} entries)
                </h4>
                <div className="max-h-[200px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left py-2 px-2 text-[var(--text-secondary)]">#</th>
                        <th className="text-left py-2 px-2 text-[var(--text-secondary)]">Type</th>
                        <th className="text-left py-2 px-2 text-[var(--text-secondary)]">Date</th>
                        <th className="text-right py-2 px-2 text-[var(--text-secondary)]">Price</th>
                        <th className="text-left py-2 px-2 text-[var(--text-secondary)]">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.trades.map((trade, i) => (
                        <tr key={i} className="border-b border-[var(--border)]">
                          <td className="py-1.5 px-2 text-[var(--text-secondary)]">{i + 1}</td>
                          <td className="py-1.5 px-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              trade.type === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {trade.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-[var(--text-primary)]">
                            {new Date(trade.date * 1000).toLocaleDateString()}
                          </td>
                          <td className="py-1.5 px-2 text-right font-medium text-[var(--text-primary)]">
                            ${trade.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-1.5 px-2 text-[var(--text-secondary)]">{trade.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {data.length < 30 && (
            <div className="p-8 text-center text-[var(--text-secondary)]">
              Need at least 30 data points to run backtest. Try a longer timeframe.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
