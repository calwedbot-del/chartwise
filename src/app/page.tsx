'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { fetchCryptoOHLCV, fetchAssetInfo, getSupportedAssets, AssetInfo, fetchStockOHLCV, fetchStockInfo } from '@/lib/api';
import { OHLCV, SMA, EMA, RSI, MACD, BollingerBands } from '@/utils/indicators';
import { runAIAnalysis, AIAnalysis } from '@/utils/aiAnalysis';
import { useTheme } from '@/hooks/useTheme';

// Dynamic import for chart (needs client-side only)
const Chart = dynamic(() => import('@/components/Chart'), { ssr: false });

const TIMEFRAMES = ['1d', '7d', '14d', '30d', '90d', '180d', '365d'];

export default function Home() {
  const [selectedAsset, setSelectedAsset] = useState('ETH');
  const [timeframe, setTimeframe] = useState('90d');
  const [ohlcvData, setOhlcvData] = useState<OHLCV[]>([]);
  const [assetInfo, setAssetInfo] = useState<AssetInfo | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndicators, setActiveIndicators] = useState<string[]>(['sma20', 'bb']);
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area'>('candlestick');
  
  const { theme, toggleTheme, mounted } = useTheme();
  const assets = getSupportedAssets();
  
  // Fetch data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      const days = parseInt(timeframe.replace('d', ''));
      const asset = assets.find(a => a.symbol === selectedAsset);
      const isStock = asset?.type === 'stock';
      
      let ohlcv: OHLCV[];
      let info: AssetInfo | null;
      
      if (isStock) {
        [ohlcv, info] = await Promise.all([
          fetchStockOHLCV(selectedAsset, days),
          fetchStockInfo(selectedAsset),
        ]);
      } else {
        [ohlcv, info] = await Promise.all([
          fetchCryptoOHLCV(selectedAsset, '1d', days),
          fetchAssetInfo(selectedAsset),
        ]);
      }
      
      setOhlcvData(ohlcv);
      setAssetInfo(info);
      
      // Run AI analysis
      if (ohlcv.length > 20) {
        const analysis = runAIAnalysis(ohlcv);
        setAiAnalysis(analysis);
      }
      
      setLoading(false);
    }
    
    loadData();
  }, [selectedAsset, timeframe]);
  
  // Calculate indicators
  const indicators = {
    sma20: activeIndicators.includes('sma20') ? SMA(ohlcvData.map(d => d.close), 20) : undefined,
    sma50: activeIndicators.includes('sma50') ? SMA(ohlcvData.map(d => d.close), 50) : undefined,
    ema12: activeIndicators.includes('ema') ? EMA(ohlcvData.map(d => d.close), 12) : undefined,
    ema26: activeIndicators.includes('ema') ? EMA(ohlcvData.map(d => d.close), 26) : undefined,
    bb: activeIndicators.includes('bb') ? BollingerBands(ohlcvData.map(d => d.close)) : undefined,
  };
  
  // Calculate RSI for display
  const rsiData = RSI(ohlcvData.map(d => d.close));
  const currentRSI = rsiData[rsiData.length - 1];
  
  // Calculate MACD for display
  const macdData = MACD(ohlcvData.map(d => d.close));
  const currentMACD = macdData.histogram[macdData.histogram.length - 1];
  
  const toggleIndicator = (indicator: string) => {
    if (activeIndicators.includes(indicator)) {
      setActiveIndicators(activeIndicators.filter(i => i !== indicator));
    } else {
      setActiveIndicators([...activeIndicators, indicator]);
    }
  };
  
  return (
    <main className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
              ChartWise
            </h1>
            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">AI-Powered</span>
          </div>
          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          )}
        </div>
        
        {/* Asset Selector */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-2">CRYPTO</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {assets.filter(a => a.type === 'crypto').map(asset => (
              <button
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset.symbol)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedAsset === asset.symbol
                    ? 'bg-blue-500 text-white'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {asset.symbol}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 mb-2">STOCKS</div>
          <div className="flex flex-wrap gap-2">
            {assets.filter(a => a.type === 'stock').map(asset => (
              <button
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset.symbol)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedAsset === asset.symbol
                    ? 'bg-green-500 text-white'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {asset.symbol}
              </button>
            ))}
          </div>
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex gap-2">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded text-sm transition-all ${
                timeframe === tf
                  ? 'bg-[#2962ff] text-white'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </header>
      
      {/* Price Info */}
      {assetInfo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--bg-card)] rounded-lg p-4">
            <div className="text-sm text-[var(--text-secondary)] mb-1">Price</div>
            <div className="text-2xl font-bold">${assetInfo.price.toLocaleString()}</div>
          </div>
          <div className="bg-[var(--bg-card)] rounded-lg p-4">
            <div className="text-sm text-[var(--text-secondary)] mb-1">24h Change</div>
            <div className={`text-2xl font-bold ${assetInfo.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {assetInfo.change24h >= 0 ? '+' : ''}{assetInfo.change24h.toFixed(2)}%
            </div>
          </div>
          <div className="bg-[var(--bg-card)] rounded-lg p-4">
            <div className="text-sm text-[var(--text-secondary)] mb-1">24h High</div>
            <div className="text-xl font-medium">${assetInfo.high24h.toLocaleString()}</div>
          </div>
          <div className="bg-[var(--bg-card)] rounded-lg p-4">
            <div className="text-sm text-[var(--text-secondary)] mb-1">24h Low</div>
            <div className="text-xl font-medium">${assetInfo.low24h.toLocaleString()}</div>
          </div>
        </div>
      )}
      
      {/* AI Analysis Card */}
      {aiAnalysis && (
        <div className="ai-card p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🤖</span>
            <h3 className="font-semibold text-blue-400">AI Analysis</h3>
            <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${
              aiAnalysis.trend === 'bullish' ? 'bg-green-500/20 text-green-400' :
              aiAnalysis.trend === 'bearish' ? 'bg-red-500/20 text-red-400' :
              'bg-gray-500/20 text-[var(--text-secondary)]'
            }`}>
              {aiAnalysis.trend.toUpperCase()} ({aiAnalysis.trendStrength}%)
            </span>
          </div>
          <p className="text-gray-300 mb-4">{aiAnalysis.summary}</p>
          
          {/* Support/Resistance Levels */}
          {aiAnalysis.supportResistance.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              {aiAnalysis.supportResistance.map((sr, i) => (
                <div 
                  key={i}
                  className={`px-3 py-2 rounded text-sm ${
                    sr.type === 'support' ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                  }`}
                >
                  <div className="text-xs text-[var(--text-secondary)] uppercase">{sr.type}</div>
                  <div className="font-medium">${sr.price.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">{sr.touches} touches</div>
                </div>
              ))}
            </div>
          )}
          
          {/* Patterns */}
          {aiAnalysis.patterns.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {aiAnalysis.patterns.map((pattern, i) => (
                <span 
                  key={i}
                  className={`px-3 py-1 rounded-full text-sm ${
                    pattern.type === 'bullish' ? 'bg-green-500/20 text-green-400' :
                    pattern.type === 'bearish' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-[var(--text-secondary)]'
                  }`}
                >
                  {pattern.name} ({pattern.confidence}%)
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Chart Type & Indicators Toggle */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {/* Chart Type Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">Chart:</span>
          {[
            { id: 'candlestick', label: '🕯️', title: 'Candlestick' },
            { id: 'line', label: '📈', title: 'Line' },
            { id: 'area', label: '📊', title: 'Area' },
          ].map(type => (
            <button
              key={type.id}
              onClick={() => setChartType(type.id as any)}
              title={type.title}
              className={`px-3 py-1 rounded text-lg transition-all ${
                chartType === type.id
                  ? 'bg-[#2962ff] text-white'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
        
        <div className="w-px h-6 bg-gray-600" />
        
        {/* Indicators */}
        <span className="text-sm text-[var(--text-secondary)]">Indicators:</span>
        {[
          { id: 'sma20', label: 'SMA 20' },
          { id: 'sma50', label: 'SMA 50' },
          { id: 'ema', label: 'EMA 12/26' },
          { id: 'bb', label: 'Bollinger Bands' },
        ].map(ind => (
          <button
            key={ind.id}
            onClick={() => toggleIndicator(ind.id)}
            className={`indicator-pill ${activeIndicators.includes(ind.id) ? 'active' : ''}`}
          >
            {ind.label}
          </button>
        ))}
      </div>
      
      {/* Main Chart */}
      <div className="mb-6">
        {loading ? (
          <div className="chart-container h-[500px] flex items-center justify-center">
            <div className="text-[var(--text-secondary)]">Loading chart...</div>
          </div>
        ) : (
          <Chart 
            data={ohlcvData} 
            indicators={indicators}
            supportResistance={aiAnalysis?.supportResistance || []}
            height={500}
            chartType={chartType}
          />
        )}
      </div>
      
      {/* Technical Indicators Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] rounded-lg p-4">
          <div className="text-sm text-[var(--text-secondary)] mb-1">RSI (14)</div>
          <div className={`text-2xl font-bold ${
            currentRSI > 70 ? 'text-red-400' : currentRSI < 30 ? 'text-green-400' : 'text-gray-200'
          }`}>
            {isNaN(currentRSI) ? '—' : currentRSI.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {currentRSI > 70 ? 'Overbought' : currentRSI < 30 ? 'Oversold' : 'Neutral'}
          </div>
        </div>
        
        <div className="bg-[var(--bg-card)] rounded-lg p-4">
          <div className="text-sm text-[var(--text-secondary)] mb-1">MACD</div>
          <div className={`text-2xl font-bold ${
            currentMACD > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {isNaN(currentMACD) ? '—' : currentMACD.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {currentMACD > 0 ? 'Bullish' : 'Bearish'}
          </div>
        </div>
        
        <div className="bg-[var(--bg-card)] rounded-lg p-4">
          <div className="text-sm text-[var(--text-secondary)] mb-1">Volume (24h)</div>
          <div className="text-2xl font-bold">
            ${assetInfo?.volume24h ? (assetInfo.volume24h / 1e9).toFixed(2) + 'B' : '—'}
          </div>
        </div>
        
        <div className="bg-[var(--bg-card)] rounded-lg p-4">
          <div className="text-sm text-[var(--text-secondary)] mb-1">Market Cap</div>
          <div className="text-2xl font-bold">
            ${assetInfo?.marketCap ? (assetInfo.marketCap / 1e9).toFixed(0) + 'B' : '—'}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="mt-8 text-center text-sm text-gray-500">
        <p>ChartWise — AI-Powered Technical Analysis</p>
        <p className="mt-1">Data from CoinGecko • Built by 007 🕵️</p>
      </footer>
    </main>
  );
}
