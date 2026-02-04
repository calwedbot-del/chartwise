'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi } from 'lightweight-charts';
import { getSupportedAssets, fetchCryptoOHLCV, fetchStockOHLCV } from '@/lib/api';
import { OHLCV } from '@/utils/indicators';

interface OverlayComparisonProps {
  primaryAsset: string;
  isOpen: boolean;
  onClose: () => void;
}

const COLORS = [
  '#2962ff', // Blue
  '#ff6d00', // Orange
  '#00c853', // Green
  '#d500f9', // Purple
  '#ff1744', // Red
  '#00e5ff', // Cyan
  '#ffea00', // Yellow
  '#ff4081', // Pink
];

const assets = getSupportedAssets();

export default function OverlayComparison({ primaryAsset, isOpen, onClose }: OverlayComparisonProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([primaryAsset]);
  const [assetData, setAssetData] = useState<Record<string, OHLCV[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [timeframe, setTimeframe] = useState(90);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedAssets([primaryAsset]);
    }
  }, [isOpen, primaryAsset]);

  // Fetch data for all selected assets
  useEffect(() => {
    if (!isOpen) return;

    selectedAssets.forEach(async (symbol) => {
      if (assetData[symbol]?.length) return;

      setLoading(prev => ({ ...prev, [symbol]: true }));
      try {
        const asset = assets.find(a => a.symbol === symbol);
        let data: OHLCV[];
        if (asset?.type === 'stock') {
          data = await fetchStockOHLCV(symbol, timeframe);
        } else {
          data = await fetchCryptoOHLCV(symbol, '1d', timeframe);
        }
        setAssetData(prev => ({ ...prev, [symbol]: data }));
      } catch (err) {
        console.error(`Failed to load ${symbol}`, err);
      }
      setLoading(prev => ({ ...prev, [symbol]: false }));
    });
  }, [isOpen, selectedAssets, timeframe]);

  // Normalize price data to percentage change from first data point
  const normalizedData = useMemo(() => {
    const result: Record<string, { time: number; value: number }[]> = {};
    
    selectedAssets.forEach(symbol => {
      const data = assetData[symbol];
      if (!data || data.length === 0) return;
      
      const basePrice = data[0].close;
      if (basePrice === 0) return;
      
      result[symbol] = data.map(d => ({
        time: d.time,
        value: ((d.close - basePrice) / basePrice) * 100,
      }));
    });
    
    return result;
  }, [selectedAssets, assetData]);

  // Render chart
  useEffect(() => {
    if (!chartContainerRef.current || !isOpen) return;
    
    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const hasData = Object.keys(normalizedData).length > 0;
    if (!hasData) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#1e222d' },
        horzLines: { color: '#1e222d' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 450,
    });

    chartRef.current = chart;

    // Add a line series for each asset
    selectedAssets.forEach((symbol, i) => {
      const data = normalizedData[symbol];
      if (!data) return;

      const color = COLORS[i % COLORS.length];
      const series = chart.addLineSeries({
        color,
        lineWidth: 2,
        title: symbol,
      });
      series.setData(data as any);
    });

    // Add zero line
    if (selectedAssets.length > 0) {
      const allTimes = Object.values(normalizedData).flatMap(d => d.map(p => p.time));
      if (allTimes.length >= 2) {
        const minTime = Math.min(...allTimes);
        const maxTime = Math.max(...allTimes);
        const zeroLine = chart.addLineSeries({
          color: 'rgba(255,255,255,0.2)',
          lineWidth: 1,
          lineStyle: 2,
          crosshairMarkerVisible: false,
        });
        zeroLine.setData([
          { time: minTime, value: 0 },
          { time: maxTime, value: 0 },
        ] as any);
      }
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current = null;
      chart.remove();
    };
  }, [isOpen, normalizedData, selectedAssets]);

  const toggleAsset = (symbol: string) => {
    if (selectedAssets.includes(symbol)) {
      if (selectedAssets.length > 1) {
        setSelectedAssets(prev => prev.filter(s => s !== symbol));
        setAssetData(prev => {
          const next = { ...prev };
          delete next[symbol];
          return next;
        });
      }
    } else if (selectedAssets.length < 8) {
      setSelectedAssets(prev => [...prev, symbol]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-primary)] rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">📊 Overlay Comparison</h2>
            <span className="text-sm text-gray-400">Normalized % change</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Timeframe selector */}
            <div className="flex gap-1">
              {[
                { days: 30, label: '1M' },
                { days: 90, label: '3M' },
                { days: 180, label: '6M' },
                { days: 365, label: '1Y' },
              ].map(tf => (
                <button
                  key={tf.days}
                  onClick={() => {
                    setTimeframe(tf.days);
                    setAssetData({}); // Clear to re-fetch
                  }}
                  className={`px-2 py-1 text-xs rounded ${
                    timeframe === tf.days
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
          </div>
        </div>

        {/* Asset selector */}
        <div className="p-3 border-b border-gray-700 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-400">Assets:</span>
          {assets.map((asset, i) => {
            const isSelected = selectedAssets.includes(asset.symbol);
            const colorIndex = selectedAssets.indexOf(asset.symbol);
            const color = isSelected ? COLORS[colorIndex % COLORS.length] : undefined;
            
            return (
              <button
                key={asset.symbol}
                onClick={() => toggleAsset(asset.symbol)}
                className={`px-3 py-1 text-xs rounded-full transition-all ${
                  isSelected
                    ? 'text-white font-medium'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
                style={isSelected ? { backgroundColor: color, opacity: 0.9 } : undefined}
              >
                {isSelected && '✓ '}{asset.symbol}
              </button>
            );
          })}
          {selectedAssets.length >= 8 && (
            <span className="text-xs text-yellow-500">Max 8 assets</span>
          )}
        </div>

        {/* Legend */}
        <div className="px-4 py-2 border-b border-gray-700 flex items-center gap-4 flex-wrap">
          {selectedAssets.map((symbol, i) => {
            const data = normalizedData[symbol];
            const lastValue = data?.[data.length - 1]?.value;
            const isLoading = loading[symbol];
            
            return (
              <div key={symbol} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="font-medium text-white">{symbol}</span>
                {isLoading ? (
                  <span className="text-gray-500 text-xs animate-pulse">loading...</span>
                ) : lastValue !== undefined ? (
                  <span className={`font-medium ${lastValue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {lastValue >= 0 ? '+' : ''}{lastValue.toFixed(2)}%
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Chart */}
        <div className="flex-1 p-4 min-h-[450px]">
          {Object.values(loading).some(l => l) && Object.keys(normalizedData).length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 animate-pulse">
              Loading comparison data...
            </div>
          ) : (
            <div ref={chartContainerRef} className="w-full" />
          )}
        </div>
      </div>
    </div>
  );
}
