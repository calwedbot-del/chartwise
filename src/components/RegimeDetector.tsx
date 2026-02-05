'use client';

import { useMemo } from 'react';
import { OHLCV, SMA, ATR, RSI } from '@/utils/indicators';

type Regime = 'strong_uptrend' | 'weak_uptrend' | 'ranging' | 'weak_downtrend' | 'strong_downtrend' | 'breakout';

interface RegimeInfo {
  regime: Regime;
  label: string;
  emoji: string;
  confidence: number;
  description: string;
  color: string;
  strategy: string;
}

interface RegimeDetectorProps {
  data: OHLCV[];
  symbol: string;
  className?: string;
}

function detectRegime(data: OHLCV[]): RegimeInfo {
  if (data.length < 50) {
    return {
      regime: 'ranging', label: 'Insufficient Data', emoji: '❓',
      confidence: 0, description: 'Need at least 50 data points for regime detection',
      color: 'text-gray-400', strategy: 'Wait for more data',
    };
  }

  const closes = data.map(d => d.close);

  // 1. Trend direction via moving averages
  const sma20 = SMA(closes, 20);
  const sma50 = SMA(closes, 50);
  const currentPrice = closes[closes.length - 1];
  const lastSma20 = sma20[sma20.length - 1];
  const lastSma50 = sma50[sma50.length - 1];

  // SMA slope (rate of change over last 10 periods)
  const sma20Slope = (sma20[sma20.length - 1] - sma20[sma20.length - 10]) / sma20[sma20.length - 10] * 100;
  const sma50Slope = (sma50[sma50.length - 1] - sma50[sma50.length - 10]) / sma50[sma50.length - 10] * 100;

  // 2. ATR-based volatility
  const atrData = ATR(data);
  const recentATR = atrData.slice(-5).reduce((s, v) => s + v, 0) / 5;
  const historicalATR = atrData.slice(-50, -5).reduce((s, v) => s + v, 0) / Math.max(atrData.slice(-50, -5).length, 1);
  const atrRatio = historicalATR > 0 ? recentATR / historicalATR : 1;

  // 3. Price range vs trend (efficiency ratio)
  const last20 = closes.slice(-20);
  const netChange = Math.abs(last20[last20.length - 1] - last20[0]);
  let totalChange = 0;
  for (let i = 1; i < last20.length; i++) {
    totalChange += Math.abs(last20[i] - last20[i - 1]);
  }
  const efficiencyRatio = totalChange > 0 ? netChange / totalChange : 0;
  // ER close to 1 = trending, close to 0 = ranging

  // 4. Bollinger Band Width (normalized)
  const sma20Val = lastSma20;
  const std20 = Math.sqrt(closes.slice(-20).reduce((s, c) => s + Math.pow(c - sma20Val, 2), 0) / 20);
  const bbWidth = sma20Val > 0 ? (std20 * 4) / sma20Val * 100 : 0; // percentage width

  // 5. RSI for momentum context
  const rsiData = RSI(closes);
  const lastRSI = rsiData[rsiData.length - 1];

  // 6. Higher highs / lower lows count
  const last15 = data.slice(-15);
  let hh = 0, ll = 0;
  for (let i = 1; i < last15.length; i++) {
    if (last15[i].high > last15[i - 1].high) hh++;
    if (last15[i].low < last15[i - 1].low) ll++;
  }

  // Classify regime
  let regime: Regime;
  let confidence = 0;
  let factors: string[] = [];

  const isTrending = efficiencyRatio > 0.3;
  const isStrongTrend = efficiencyRatio > 0.5;
  const isUpward = currentPrice > lastSma20 && lastSma20 > lastSma50;
  const isDownward = currentPrice < lastSma20 && lastSma20 < lastSma50;
  const isVolatile = atrRatio > 1.5;
  const isSqueeze = bbWidth < 3 && atrRatio < 0.7;

  if (isSqueeze && !isTrending) {
    regime = 'breakout';
    confidence = Math.min(90, 50 + (1 - atrRatio) * 40);
    factors = ['Bollinger squeeze', 'Low ATR', 'Breakout imminent'];
  } else if (isStrongTrend && isUpward) {
    regime = 'strong_uptrend';
    confidence = Math.min(95, efficiencyRatio * 100 + 30);
    factors = [`ER: ${(efficiencyRatio * 100).toFixed(0)}%`, `${hh} higher highs`, `Price > SMA 20 > SMA 50`];
  } else if (isStrongTrend && isDownward) {
    regime = 'strong_downtrend';
    confidence = Math.min(95, efficiencyRatio * 100 + 30);
    factors = [`ER: ${(efficiencyRatio * 100).toFixed(0)}%`, `${ll} lower lows`, `Price < SMA 20 < SMA 50`];
  } else if (isTrending && isUpward) {
    regime = 'weak_uptrend';
    confidence = Math.min(80, efficiencyRatio * 100 + 20);
    factors = ['Positive MA alignment', `RSI: ${lastRSI?.toFixed(0) || '?'}`];
  } else if (isTrending && isDownward) {
    regime = 'weak_downtrend';
    confidence = Math.min(80, efficiencyRatio * 100 + 20);
    factors = ['Negative MA alignment', `RSI: ${lastRSI?.toFixed(0) || '?'}`];
  } else {
    regime = 'ranging';
    confidence = Math.min(85, (1 - efficiencyRatio) * 100);
    factors = [`ER: ${(efficiencyRatio * 100).toFixed(0)}%`, `BB Width: ${bbWidth.toFixed(1)}%`, 'No clear trend'];
  }

  const regimeMap: Record<Regime, Omit<RegimeInfo, 'confidence'>> = {
    strong_uptrend: {
      regime: 'strong_uptrend', label: 'Strong Uptrend', emoji: '🚀',
      description: `Strong bullish trend with ${(efficiencyRatio * 100).toFixed(0)}% efficiency. Price trending above key moving averages with ${hh} higher highs in 15 periods.`,
      color: 'text-green-400',
      strategy: 'Buy dips to SMA 20. Trail stops below SMA 20. Add on pullbacks to support.',
    },
    weak_uptrend: {
      regime: 'weak_uptrend', label: 'Weak Uptrend', emoji: '📈',
      description: `Mild bullish bias. Price above averages but trend lacks conviction. SMA 20 slope: ${sma20Slope.toFixed(2)}%.`,
      color: 'text-green-300',
      strategy: 'Trade cautiously long. Tighter stops. Take partial profits at resistance.',
    },
    ranging: {
      regime: 'ranging', label: 'Range-Bound', emoji: '↔️',
      description: `Market is consolidating with ${(efficiencyRatio * 100).toFixed(0)}% efficiency ratio. BB width: ${bbWidth.toFixed(1)}%. No clear directional bias.`,
      color: 'text-yellow-400',
      strategy: 'Mean reversion trades. Buy support, sell resistance. Avoid trend-following strategies.',
    },
    weak_downtrend: {
      regime: 'weak_downtrend', label: 'Weak Downtrend', emoji: '📉',
      description: `Mild bearish bias. Price below averages but selling pressure moderate.`,
      color: 'text-orange-400',
      strategy: 'Short rallies to SMA 20. Keep position sizes small. Watch for reversal signals.',
    },
    strong_downtrend: {
      regime: 'strong_downtrend', label: 'Strong Downtrend', emoji: '💥',
      description: `Strong bearish trend with ${(efficiencyRatio * 100).toFixed(0)}% efficiency. Price below key averages with ${ll} lower lows.`,
      color: 'text-red-400',
      strategy: 'Short rallies. Avoid catching knives. Wait for reversal confirmation before buying.',
    },
    breakout: {
      regime: 'breakout', label: 'Breakout Setup', emoji: '⚡',
      description: `Volatility squeeze detected! BB width narrowing to ${bbWidth.toFixed(1)}% with ATR ${((1 - atrRatio) * 100).toFixed(0)}% below average. Explosive move likely.`,
      color: 'text-purple-400',
      strategy: 'Prepare for breakout. Set alerts above/below range. Don\'t predict direction — react to the break.',
    },
  };

  return { ...regimeMap[regime], confidence };
}

export default function RegimeDetector({ data, symbol, className = '' }: RegimeDetectorProps) {
  const regime = useMemo(() => detectRegime(data), [data]);

  if (regime.confidence === 0) return null;

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔬</span>
          <h3 className="font-semibold text-[var(--text-primary)]">Market Regime</h3>
          <span className="text-xs text-[var(--text-secondary)]">{symbol}</span>
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--bg-hover)] ${regime.color}`}>
          <span>{regime.emoji}</span>
          <span className="font-bold text-sm">{regime.label}</span>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
          <span>Regime Confidence</span>
          <span className={regime.color}>{regime.confidence.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              regime.regime.includes('uptrend') ? 'bg-green-400' :
              regime.regime.includes('downtrend') ? 'bg-red-400' :
              regime.regime === 'breakout' ? 'bg-purple-400' : 'bg-yellow-400'
            }`}
            style={{ width: `${regime.confidence}%` }}
          />
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--text-secondary)] mb-3">{regime.description}</p>

      {/* Suggested Strategy */}
      <div className="bg-[var(--bg-hover)] rounded-lg p-3">
        <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">💡 Suggested Strategy</div>
        <p className="text-sm text-[var(--text-primary)]">{regime.strategy}</p>
      </div>
    </div>
  );
}
