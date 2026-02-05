'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { ChartRef } from '@/components/Chart';
import dynamic from 'next/dynamic';
import { fetchCryptoOHLCV, fetchAssetInfo, getSupportedAssets, AssetInfo, fetchStockOHLCV, fetchStockInfo } from '@/lib/api';
import { OHLCV, SMA, EMA, RSI, MACD, BollingerBands, FibonacciRetracement, FibonacciLevel, VWAP, StochasticRSI, ATR, OBV, IchimokuCloud } from '@/utils/indicators';
import { runAIAnalysis, AIAnalysis } from '@/utils/aiAnalysis';
import { useTheme } from '@/hooks/useTheme';
import { useWatchlist } from '@/hooks/useWatchlist';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePortfolio } from '@/hooks/usePortfolio';
// Static imports — lightweight, always visible, or needed for hooks
import Watchlist from '@/components/Watchlist';
import PriceAlerts from '@/components/PriceAlerts';
import Portfolio from '@/components/Portfolio';
import AssetSearch from '@/components/AssetSearch';
import AlertHistory from '@/components/AlertHistory';
import DrawingTools, { useDrawings } from '@/components/DrawingTools';
import LivePriceIndicator from '@/components/LivePriceIndicator';
import ErrorBoundary from '@/components/ErrorBoundary';
import ChartTemplates from '@/components/ChartTemplates';
import ShareButton from '@/components/ShareButton';
import QuickStats from '@/components/QuickStats';
import { useAnnotations } from '@/components/ChartAnnotations';

// Dynamic imports — heavy, conditional, WebSocket-based, or below the fold
const Chart = dynamic(() => import('@/components/Chart'), { ssr: false });
const IndicatorChart = dynamic(() => import('@/components/IndicatorChart'), { ssr: false });
const StrategyBacktest = dynamic(() => import('@/components/StrategyBacktest'), { ssr: false });
const CompareModal = dynamic(() => import('@/components/CompareModal'), { ssr: false });
const MultiChartView = dynamic(() => import('@/components/MultiChartView'), { ssr: false });
const OverlayComparison = dynamic(() => import('@/components/OverlayComparison'), { ssr: false });
const TradeTape = dynamic(() => import('@/components/TradeTape'), { ssr: false });
const WhaleTracker = dynamic(() => import('@/components/WhaleTracker'), { ssr: false });
const MarketTicker = dynamic(() => import('@/components/MarketTicker'), { ssr: false });
const FundingRate = dynamic(() => import('@/components/FundingRate'), { ssr: false });
const LiquidationLevels = dynamic(() => import('@/components/LiquidationLevels'), { ssr: false });
const OpenInterest = dynamic(() => import('@/components/OpenInterest'), { ssr: false });
const LongShortRatio = dynamic(() => import('@/components/LongShortRatio'), { ssr: false });
const FearGreedIndex = dynamic(() => import('@/components/FearGreedIndex'), { ssr: false });
const MarketHeatmap = dynamic(() => import('@/components/MarketHeatmap'), { ssr: false });
const AssetScreener = dynamic(() => import('@/components/AssetScreener'), { ssr: false });
const EconomicCalendar = dynamic(() => import('@/components/EconomicCalendar'), { ssr: false });
const CryptoDominance = dynamic(() => import('@/components/CryptoDominance'), { ssr: false });
const PricePerformance = dynamic(() => import('@/components/PricePerformance'), { ssr: false });
const CorrelationMatrix = dynamic(() => import('@/components/CorrelationMatrix'), { ssr: false });
const NewsFeed = dynamic(() => import('@/components/NewsFeed'), { ssr: false });
const NewsSentiment = dynamic(() => import('@/components/NewsSentiment'), { ssr: false });
const TradingJournal = dynamic(() => import('@/components/TradingJournal'), { ssr: false });
const PatternDetector = dynamic(() => import('@/components/PatternDetector'), { ssr: false });
const VolumeProfile = dynamic(() => import('@/components/VolumeProfile'), { ssr: false });
const DivergenceDetector = dynamic(() => import('@/components/DivergenceDetector'), { ssr: false });
const MultiTimeframe = dynamic(() => import('@/components/MultiTimeframe'), { ssr: false });
const ChartAnnotations = dynamic(() => import('@/components/ChartAnnotations'), { ssr: false });
const AlertConditionsBuilder = dynamic(() => import('@/components/AlertConditionsBuilder'), { ssr: false });
const PerformanceDashboard = dynamic(() => import('@/components/PerformanceDashboard'), { ssr: false });
const CustomIndicatorBuilder = dynamic(() => import('@/components/CustomIndicatorBuilder'), { ssr: false });

const TIMEFRAMES = ['1d', '7d', '14d', '30d', '90d', '180d', '365d'];
const TIMEFRAME_LABELS: Record<string, string> = {
  '1d': '24h',
  '7d': '1W',
  '14d': '2W',
  '30d': '1M',
  '90d': '3M',
  '180d': '6M',
  '365d': '1Y',
};

export default function Home() {
  const [selectedAsset, setSelectedAsset] = useState('ETH');
  const [timeframe, setTimeframe] = useState('90d');
  const [ohlcvData, setOhlcvData] = useState<OHLCV[]>([]);
  const [assetInfo, setAssetInfo] = useState<AssetInfo | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndicators, setActiveIndicators] = useState<string[]>(['sma20', 'bb']);
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area' | 'heikinashi'>('candlestick');
  const [showCompare, setShowCompare] = useState(false);
  const [showMultiChart, setShowMultiChart] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const chartRef = useRef<ChartRef>(null);
  
  const { theme, toggleTheme, mounted } = useTheme();
  const { watchlist, isInWatchlist, toggleWatchlist, removeFromWatchlist, mounted: watchlistMounted } = useWatchlist();
  const { alerts, alertHistory, addAlert, removeAlert, checkAlerts, clearAlertHistory, requestNotificationPermission, mounted: alertsMounted } = usePriceAlerts();
  const { holdings, addHolding, removeHolding, getTotalValue, getTotalCost, getHoldingsWithPrices, mounted: portfolioMounted } = usePortfolio();
  const { drawings, activeTool, currentDrawing, setActiveTool, undoDrawing, clearDrawings, startDrawing, updateDrawing, finishDrawing } = useDrawings();
  const { annotations, addAnnotation, removeAnnotation, clearAnnotations } = useAnnotations();
  const [drawingColor, setDrawingColor] = useState('#3b82f6');
  const drawingColorRef = useRef(drawingColor);
  drawingColorRef.current = drawingColor;

  // Stable drawing callbacks (avoid re-creating Chart on every render)
  const handleDrawingStart = useCallback((point: { time: number; price: number }) => {
    startDrawing(point, drawingColorRef.current);
  }, [startDrawing]);
  const handleDrawingMove = useCallback((point: { time: number; price: number }) => {
    updateDrawing(point);
  }, [updateDrawing]);
  const handleDrawingEnd = useCallback((point: { time: number; price: number }) => {
    finishDrawing(point);
  }, [finishDrawing]);
  const [isMobile, setIsMobile] = useState(false);
  const [assetPrices, setAssetPrices] = useState<Record<string, number>>({});
  const assets = getSupportedAssets();
  
  // Detect mobile for responsive chart height
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Parse URL parameters on mount (for shareable links)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    const assetParam = params.get('asset');
    const tfParam = params.get('tf');
    const indParam = params.get('ind');
    const typeParam = params.get('type');
    
    if (assetParam) setSelectedAsset(assetParam);
    if (tfParam && TIMEFRAMES.includes(tfParam)) setTimeframe(tfParam);
    if (indParam) setActiveIndicators(indParam.split(',').filter(Boolean));
    if (typeParam && ['candlestick', 'line', 'area', 'heikinashi'].includes(typeParam)) {
      setChartType(typeParam as 'candlestick' | 'line' | 'area' | 'heikinashi');
    }
  }, []);
  
  // Fetch data (with race condition protection)
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      
      try {
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
        
        if (cancelled) return;

        if (ohlcv.length === 0) {
          setError(`No data available for ${selectedAsset}`);
        }
        
        setOhlcvData(ohlcv);
        setAssetInfo(info);
        
        // Run AI analysis
        if (ohlcv.length > 20) {
          const analysis = runAIAnalysis(ohlcv);
          setAiAnalysis(analysis);
        } else {
          setAiAnalysis(null);
        }
      } catch (err) {
        if (cancelled) return;
        setError(`Failed to load data for ${selectedAsset}. Please try again.`);
        console.error(err);
      }
      
      if (!cancelled) setLoading(false);
    }
    
    loadData();
    return () => { cancelled = true; };
  }, [selectedAsset, timeframe]);
  
  // Check price alerts when price updates
  useEffect(() => {
    if (assetInfo && alertsMounted) {
      checkAlerts(selectedAsset, assetInfo.price);
    }
  }, [assetInfo, selectedAsset, alertsMounted, checkAlerts]);

  // Update asset prices for portfolio tracking
  useEffect(() => {
    if (assetInfo) {
      setAssetPrices(prev => ({
        ...prev,
        [selectedAsset]: assetInfo.price
      }));
    }
  }, [assetInfo, selectedAsset]);

  // Fetch prices for all portfolio holdings
  useEffect(() => {
    if (!portfolioMounted || holdings.length === 0) return;
    
    async function fetchPortfolioPrices() {
      const prices: Record<string, number> = {};
      for (const holding of holdings) {
        try {
          const asset = assets.find(a => a.symbol === holding.symbol);
          if (asset?.type === 'stock') {
            const info = await fetchStockInfo(holding.symbol);
            if (info) prices[holding.symbol] = info.price;
          } else {
            const info = await fetchAssetInfo(holding.symbol);
            if (info) prices[holding.symbol] = info.price;
          }
        } catch {
          // Use avgCost as fallback
          prices[holding.symbol] = holding.avgCost;
        }
      }
      setAssetPrices(prev => ({ ...prev, ...prices }));
    }
    
    fetchPortfolioPrices();
    // Refresh every 60 seconds
    const interval = setInterval(fetchPortfolioPrices, 60000);
    return () => clearInterval(interval);
  }, [holdings, portfolioMounted]);
  
  // Calculate indicators (memoized)
  const indicators = useMemo(() => ({
    sma20: activeIndicators.includes('sma20') ? SMA(ohlcvData.map(d => d.close), 20) : undefined,
    sma50: activeIndicators.includes('sma50') ? SMA(ohlcvData.map(d => d.close), 50) : undefined,
    ema12: activeIndicators.includes('ema') ? EMA(ohlcvData.map(d => d.close), 12) : undefined,
    ema26: activeIndicators.includes('ema') ? EMA(ohlcvData.map(d => d.close), 26) : undefined,
    bb: activeIndicators.includes('bb') ? BollingerBands(ohlcvData.map(d => d.close)) : undefined,
    vwap: activeIndicators.includes('vwap') ? VWAP(ohlcvData) : undefined,
    ichimoku: activeIndicators.includes('ichimoku') ? IchimokuCloud(ohlcvData) : undefined,
  }), [ohlcvData, activeIndicators]);
  
  // Calculate RSI for display (memoized)
  const currentRSI = useMemo(() => {
    const rsiData = RSI(ohlcvData.map(d => d.close));
    return rsiData[rsiData.length - 1];
  }, [ohlcvData]);
  
  // Calculate MACD for display (memoized)
  const currentMACD = useMemo(() => {
    const macdData = MACD(ohlcvData.map(d => d.close));
    return macdData.histogram[macdData.histogram.length - 1];
  }, [ohlcvData]);
  
  // Calculate Fibonacci levels (memoized)
  const fibonacciLevels: FibonacciLevel[] = useMemo(() => 
    activeIndicators.includes('fib') 
      ? FibonacciRetracement(ohlcvData)
      : [],
    [ohlcvData, activeIndicators]
  );
  
  const toggleIndicator = useCallback((indicator: string) => {
    setActiveIndicators(prev => 
      prev.includes(indicator)
        ? prev.filter(i => i !== indicator)
        : [...prev, indicator]
    );
  }, []);

  // Screenshot function (memoized)
  const handleScreenshot = useCallback(() => {
    if (chartRef.current) {
      const dataUrl = chartRef.current.takeScreenshot();
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `chartwise-${selectedAsset}-${timeframe}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    }
  }, [selectedAsset, timeframe]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNextAsset: () => {
      const currentIndex = assets.findIndex(a => a.symbol === selectedAsset);
      const nextIndex = (currentIndex + 1) % assets.length;
      setSelectedAsset(assets[nextIndex].symbol);
    },
    onPrevAsset: () => {
      const currentIndex = assets.findIndex(a => a.symbol === selectedAsset);
      const prevIndex = (currentIndex - 1 + assets.length) % assets.length;
      setSelectedAsset(assets[prevIndex].symbol);
    },
    onToggleTheme: toggleTheme,
    onToggleWatchlist: () => toggleWatchlist(selectedAsset),
    onNextTimeframe: () => {
      const currentIndex = TIMEFRAMES.indexOf(timeframe);
      const nextIndex = (currentIndex + 1) % TIMEFRAMES.length;
      setTimeframe(TIMEFRAMES[nextIndex]);
    },
    onPrevTimeframe: () => {
      const currentIndex = TIMEFRAMES.indexOf(timeframe);
      const prevIndex = (currentIndex - 1 + TIMEFRAMES.length) % TIMEFRAMES.length;
      setTimeframe(TIMEFRAMES[prevIndex]);
    },
    onToggleIndicator: toggleIndicator,
  });
  
  return (
    <main id="main-content" className="min-h-screen" role="main">
      {/* Market Ticker */}
      <ErrorBoundary componentName="Market Ticker">
        <MarketTicker onSelectAsset={setSelectedAsset} />
      </ErrorBoundary>

      <div className="p-4 md:p-6">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
              ChartWise
            </h1>
            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">AI-Powered</span>
            <AssetSearch onSelect={setSelectedAsset} currentAsset={selectedAsset} />
          </div>
          {/* Tools: Share, Screenshot, Compare, Theme */}
          <div className="flex items-center gap-2">
            <ShareButton
              symbol={selectedAsset}
              timeframe={timeframe}
              chartType={chartType}
              indicators={activeIndicators}
              onGetScreenshot={() => chartRef.current?.takeScreenshot() || null}
            />
            <button
              onClick={() => {
                if (ohlcvData.length > 0) {
                  import('@/utils/exportData').then(({ exportToCSV }) => {
                    exportToCSV(ohlcvData, selectedAsset, timeframe);
                  });
                }
              }}
              className="theme-toggle"
              title="Export data to CSV"
            >
              📥
            </button>
            <button
              onClick={() => {
                if (ohlcvData.length > 0) {
                  const screenshot = chartRef.current?.takeScreenshot() || null;
                  import('@/utils/exportData').then(({ exportToPDF }) => {
                    exportToPDF({
                      symbol: selectedAsset,
                      timeframe,
                      data: ohlcvData,
                      assetInfo,
                      aiAnalysis,
                      chartScreenshot: screenshot,
                    });
                  });
                }
              }}
              className="theme-toggle"
              title="Export PDF report"
            >
              📄
            </button>
            <button
              onClick={() => setShowCompare(true)}
              className="theme-toggle"
              title="Compare assets"
            >
              📊
            </button>
            <button
              onClick={() => setShowOverlay(true)}
              className="theme-toggle"
              title="Overlay comparison (normalized %)"
            >
              📉
            </button>
            <button
              onClick={() => setShowMultiChart(true)}
              className="theme-toggle"
              title="Multi-chart view"
            >
              ⊞
            </button>
            <ChartTemplates
              currentConfig={{
                asset: selectedAsset,
                timeframe,
                chartType,
                indicators: activeIndicators,
              }}
              onLoadTemplate={(config) => {
                setSelectedAsset(config.asset);
                setTimeframe(config.timeframe);
                setChartType(config.chartType);
                setActiveIndicators(config.indicators);
              }}
            />
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
        </div>
        
        {/* Asset Selector */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-2">CRYPTO</div>
          <div className="asset-scroll flex flex-wrap sm:flex-wrap gap-2 mb-3">
            {assets.filter(a => a.type === 'crypto').map(asset => (
              <div key={asset.symbol} className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedAsset(asset.symbol)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedAsset === asset.symbol
                      ? 'bg-blue-500 text-white'
                      : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {asset.symbol}
                </button>
                {watchlistMounted && (
                  <button
                    onClick={() => toggleWatchlist(asset.symbol)}
                    className={`p-1 text-sm transition-all ${
                      isInWatchlist(asset.symbol) ? 'text-yellow-400' : 'text-[var(--text-secondary)] hover:text-yellow-400'
                    }`}
                    title={isInWatchlist(asset.symbol) ? 'Remove from watchlist' : 'Add to watchlist'}
                  >
                    {isInWatchlist(asset.symbol) ? '⭐' : '☆'}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-500 mb-2">STOCKS</div>
          <div className="asset-scroll flex flex-wrap sm:flex-wrap gap-2">
            {assets.filter(a => a.type === 'stock').map(asset => (
              <div key={asset.symbol} className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedAsset(asset.symbol)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedAsset === asset.symbol
                      ? 'bg-green-500 text-white'
                      : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {asset.symbol}
                </button>
                {watchlistMounted && (
                  <button
                    onClick={() => toggleWatchlist(asset.symbol)}
                    className={`p-1 text-sm transition-all ${
                      isInWatchlist(asset.symbol) ? 'text-yellow-400' : 'text-[var(--text-secondary)] hover:text-yellow-400'
                    }`}
                    title={isInWatchlist(asset.symbol) ? 'Remove from watchlist' : 'Add to watchlist'}
                  >
                    {isInWatchlist(asset.symbol) ? '⭐' : '☆'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Timeframe Selector */}
        <div className="asset-scroll flex gap-2 overflow-x-auto pb-2">
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
              {TIMEFRAME_LABELS[tf] || tf}
            </button>
          ))}
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto hover:text-red-300"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* Price Info */}
      {assetInfo && (
        <div className="price-grid grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--bg-card)] rounded-lg p-4">
            <div className="text-sm text-[var(--text-secondary)] mb-1">Price</div>
            <LivePriceIndicator
              symbol={selectedAsset}
              fallbackPrice={assetInfo.price}
              onPriceUpdate={(price) => {
                setAssetPrices(prev => ({ ...prev, [selectedAsset]: price }));
              }}
            />
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
      
      {/* Watchlist */}
      {watchlistMounted && (
        <Watchlist
          watchlist={watchlist}
          selectedAsset={selectedAsset}
          onSelectAsset={setSelectedAsset}
          onRemove={removeFromWatchlist}
        />
      )}
      
      {/* Price Alerts */}
      {alertsMounted && assetInfo && (
        <div className="mb-6">
          <PriceAlerts
            symbol={selectedAsset}
            currentPrice={assetInfo.price}
            alerts={alerts}
            onAddAlert={addAlert}
            onRemoveAlert={removeAlert}
            onRequestPermission={requestNotificationPermission}
          />
        </div>
      )}

      {/* Alert Conditions Builder */}
      {assetInfo && ohlcvData.length > 20 && (
        <div className="mb-6">
          <ErrorBoundary componentName="Alert Conditions">
            <AlertConditionsBuilder
              symbol={selectedAsset}
              data={ohlcvData}
              currentPrice={assetInfo.price}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Alert History */}
      {alertsMounted && alertHistory.length > 0 && (
        <AlertHistory
          history={alertHistory}
          onClearHistory={clearAlertHistory}
          onSelectSymbol={setSelectedAsset}
        />
      )}

      {/* Funding Rate, Liquidation Levels & Fear/Greed for crypto */}
      {assetInfo && assets.find(a => a.symbol === selectedAsset)?.type === 'crypto' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <ErrorBoundary componentName="Funding Rate">
              <FundingRate symbol={selectedAsset} />
            </ErrorBoundary>
            <ErrorBoundary componentName="Liquidation Levels">
              <LiquidationLevels symbol={selectedAsset} currentPrice={assetInfo.price} />
            </ErrorBoundary>
            <ErrorBoundary componentName="Fear & Greed Index">
              <FearGreedIndex />
            </ErrorBoundary>
          </div>
        </>
      )}

      {/* Trade Tape, Open Interest, Long/Short Ratio & Whale Tracker for crypto */}
      {assets.find(a => a.symbol === selectedAsset)?.type === 'crypto' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <ErrorBoundary componentName="Trade Tape">
              <TradeTape symbol={selectedAsset} />
            </ErrorBoundary>
            <ErrorBoundary componentName="Open Interest">
              <OpenInterest symbol={selectedAsset} />
            </ErrorBoundary>
            <ErrorBoundary componentName="Long/Short Ratio">
              <LongShortRatio symbol={selectedAsset} />
            </ErrorBoundary>
          </div>
          <div className="mb-6">
            <ErrorBoundary componentName="Whale Tracker">
              <WhaleTracker symbol={selectedAsset} />
            </ErrorBoundary>
          </div>
        </>
      )}

      {/* Portfolio Tracker */}
      {portfolioMounted && (
        <>
          <Portfolio
            holdings={getHoldingsWithPrices(assetPrices)}
            totalValue={getTotalValue(assetPrices)}
            totalCost={getTotalCost()}
            onAdd={addHolding}
            onRemove={removeHolding}
            onSelectAsset={setSelectedAsset}
            availableSymbols={assets.map(a => a.symbol)}
          />
          {holdings.length > 0 && (
            <div className="mb-6">
              <ErrorBoundary componentName="Performance Dashboard">
                <PerformanceDashboard
                  holdings={getHoldingsWithPrices(assetPrices)}
                  totalValue={getTotalValue(assetPrices)}
                  totalCost={getTotalCost()}
                />
              </ErrorBoundary>
            </div>
          )}
        </>
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
          
          {/* Sentiment Score & Recommendation */}
          <div className="flex flex-wrap items-center gap-4 mb-4 p-3 rounded-lg bg-[var(--bg-hover)]">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-secondary)]">Sentiment:</span>
              <span className={`text-2xl font-bold ${
                aiAnalysis.sentimentScore >= 25 ? 'text-green-400' :
                aiAnalysis.sentimentScore <= -25 ? 'text-red-400' :
                'text-yellow-400'
              }`}>
                {aiAnalysis.sentimentScore > 0 ? '+' : ''}{aiAnalysis.sentimentScore}
              </span>
            </div>
            <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${
              aiAnalysis.recommendation === 'Strong Buy' ? 'bg-green-500 text-white' :
              aiAnalysis.recommendation === 'Buy' ? 'bg-green-500/30 text-green-400' :
              aiAnalysis.recommendation === 'Hold' ? 'bg-yellow-500/30 text-yellow-400' :
              aiAnalysis.recommendation === 'Sell' ? 'bg-red-500/30 text-red-400' :
              'bg-red-500 text-white'
            }`}>
              {aiAnalysis.recommendation}
            </div>
            {/* Sentiment Bar */}
            <div className="flex-1 min-w-[120px]">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    aiAnalysis.sentimentScore >= 0 ? 'bg-green-400' : 'bg-red-400'
                  }`}
                  style={{
                    width: `${Math.abs(aiAnalysis.sentimentScore) / 2}%`,
                    marginLeft: aiAnalysis.sentimentScore >= 0 ? '50%' : `${50 - Math.abs(aiAnalysis.sentimentScore) / 2}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Bearish</span>
                <span>Neutral</span>
                <span>Bullish</span>
              </div>
            </div>
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

      {/* Crypto Dominance, Price Performance & Correlation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <ErrorBoundary componentName="Crypto Dominance">
          <CryptoDominance />
        </ErrorBoundary>
        <ErrorBoundary componentName="Price Performance">
          <PricePerformance selectedAsset={selectedAsset} onSelectAsset={setSelectedAsset} />
        </ErrorBoundary>
        <ErrorBoundary componentName="Correlation Matrix">
          <CorrelationMatrix />
        </ErrorBoundary>
      </div>

      {/* Market Heatmap */}
      <ErrorBoundary componentName="Market Heatmap">
        <MarketHeatmap onSelectAsset={setSelectedAsset} />
      </ErrorBoundary>

      {/* Asset Screener */}
      <ErrorBoundary componentName="Asset Screener">
        <AssetScreener onSelectAsset={setSelectedAsset} />
      </ErrorBoundary>

      {/* Economic Calendar */}
      <ErrorBoundary componentName="Economic Calendar">
        <EconomicCalendar />
      </ErrorBoundary>

      {/* Custom Indicator Builder */}
      {ohlcvData.length > 20 && (
        <div className="mb-6">
          <ErrorBoundary componentName="Custom Indicators">
            <CustomIndicatorBuilder data={ohlcvData} symbol={selectedAsset} />
          </ErrorBoundary>
        </div>
      )}

      {/* Strategy Backtester */}
      <ErrorBoundary componentName="Strategy Backtester">
        {ohlcvData.length > 0 && (
          <StrategyBacktest data={ohlcvData} symbol={selectedAsset} />
        )}
      </ErrorBoundary>

      {/* Pattern Detection, Divergence & Volume Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <PatternDetector data={ohlcvData} symbol={selectedAsset} />
        <DivergenceDetector data={ohlcvData} symbol={selectedAsset} />
        <VolumeProfile data={ohlcvData} currentPrice={assetInfo?.price || 0} />
      </div>

      {/* Multi-Timeframe Analysis & Chart Annotations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ErrorBoundary componentName="Multi-Timeframe">
          <MultiTimeframe symbol={selectedAsset} />
        </ErrorBoundary>
        <ErrorBoundary componentName="Chart Annotations">
          <ChartAnnotations
            symbol={selectedAsset}
            annotations={annotations}
            onAddAnnotation={addAnnotation}
            onRemoveAnnotation={removeAnnotation}
            onClearAnnotations={() => clearAnnotations(selectedAsset)}
          />
        </ErrorBoundary>
      </div>

      {/* News Feed, Sentiment & Trading Journal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <NewsFeed symbol={selectedAsset} />
        <ErrorBoundary componentName="News Sentiment">
          <NewsSentiment symbol={selectedAsset} />
        </ErrorBoundary>
        <TradingJournal symbol={selectedAsset} currentPrice={assetInfo?.price || 0} />
      </div>
      
      {/* Quick Stats Bar */}
      {ohlcvData.length > 20 && (
        <div className="mb-4">
          <QuickStats data={ohlcvData} symbol={selectedAsset} />
        </div>
      )}

      {/* Chart Type & Indicators Toggle */}
      <div className="indicator-scroll flex flex-wrap items-center gap-4 mb-4 overflow-x-auto pb-2">
        {/* Chart Type Selector */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm text-[var(--text-secondary)]">Chart:</span>
          {[
            { id: 'candlestick', label: '🕯️', title: 'Candlestick' },
            { id: 'heikinashi', label: '🔥', title: 'Heikin Ashi' },
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
          { id: 'bb', label: 'Bollinger' },
          { id: 'vwap', label: 'VWAP' },
          { id: 'fib', label: 'Fibonacci' },
          { id: 'ichimoku', label: 'Ichimoku' },
          { id: 'rsi', label: 'RSI' },
          { id: 'macd', label: 'MACD' },
          { id: 'stochRsi', label: 'Stoch RSI' },
          { id: 'atr', label: 'ATR' },
          { id: 'obv', label: 'OBV' },
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
      
      {/* Drawing Tools */}
      <div className="mb-2">
        <DrawingTools
          activeTool={activeTool}
          onToolChange={setActiveTool}
          drawings={drawings}
          onClearDrawings={clearDrawings}
          onUndoDrawing={undoDrawing}
          drawingColor={drawingColor}
          onColorChange={setDrawingColor}
        />
      </div>

      {/* Main Chart */}
      <div className="mb-6">
        {loading ? (
          <div className="chart-container h-[350px] sm:h-[500px] flex items-center justify-center">
            <div className="text-[var(--text-secondary)]">Loading chart...</div>
          </div>
        ) : (
          <div className="chart-mobile sm:h-auto">
            <Chart 
              ref={chartRef}
              data={ohlcvData} 
              indicators={indicators}
              supportResistance={aiAnalysis?.supportResistance || []}
              fibonacciLevels={fibonacciLevels}
              height={isMobile ? 350 : 500}
              chartType={chartType}
              drawings={drawings}
              activeTool={activeTool}
              drawingColor={drawingColor}
              currentDrawing={currentDrawing}
              onDrawingStart={handleDrawingStart}
              onDrawingMove={handleDrawingMove}
              onDrawingEnd={handleDrawingEnd}
            />
          </div>
        )}

        {/* Sub-chart Indicators */}
        {!loading && ohlcvData.length > 20 && (
          <>
            {activeIndicators.includes('rsi') && (() => {
              const rsiData = RSI(ohlcvData.map(d => d.close));
              return (
                <IndicatorChart
                  type="rsi"
                  data={ohlcvData}
                  rsiValues={rsiData}
                  height={isMobile ? 120 : 150}
                />
              );
            })()}
            {activeIndicators.includes('macd') && (() => {
              const macdResult = MACD(ohlcvData.map(d => d.close));
              return (
                <IndicatorChart
                  type="macd"
                  data={ohlcvData}
                  macdLine={macdResult.macd}
                  macdSignal={macdResult.signal}
                  macdHistogram={macdResult.histogram}
                  height={isMobile ? 120 : 150}
                />
              );
            })()}
            {activeIndicators.includes('stochRsi') && (() => {
              const stochData = StochasticRSI(ohlcvData.map(d => d.close));
              return (
                <IndicatorChart
                  type="stochRsi"
                  data={ohlcvData}
                  stochK={stochData.k}
                  stochD={stochData.d}
                  height={isMobile ? 120 : 150}
                />
              );
            })()}
            {activeIndicators.includes('atr') && (() => {
              const atrData = ATR(ohlcvData);
              return (
                <IndicatorChart
                  type="atr"
                  data={ohlcvData}
                  atrValues={atrData}
                  height={isMobile ? 120 : 150}
                />
              );
            })()}
            {activeIndicators.includes('obv') && (() => {
              const obvData = OBV(ohlcvData);
              return (
                <IndicatorChart
                  type="obv"
                  data={ohlcvData}
                  obvValues={obvData}
                  height={isMobile ? 120 : 150}
                />
              );
            })()}
          </>
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
        <p className="mt-1 text-xs">Press ? for keyboard shortcuts</p>
      </footer>

      {/* Compare Modal */}
      <CompareModal
        isOpen={showCompare}
        onClose={() => setShowCompare(false)}
        primaryAsset={selectedAsset}
      />

      <MultiChartView
        isOpen={showMultiChart}
        onClose={() => setShowMultiChart(false)}
        initialSymbols={[selectedAsset, 'ETH']}
      />

      <OverlayComparison
        isOpen={showOverlay}
        onClose={() => setShowOverlay(false)}
        primaryAsset={selectedAsset}
      />
      </div>{/* end p-4 md:p-6 wrapper */}
    </main>
  );
}
