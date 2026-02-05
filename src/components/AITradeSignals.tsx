'use client';

import { useMemo } from 'react';
import { OHLCV, RSI, MACD, SMA, EMA, BollingerBands, ATR, OBV, StochasticRSI } from '@/utils/indicators';

interface Signal {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
  description: string;
  indicator: string;
}

interface SignalSummary {
  signals: Signal[];
  overallScore: number; // -100 to 100
  overallSignal: 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';
  confidence: number; // 0-100
}

interface AITradeSignalsProps {
  data: OHLCV[];
  symbol: string;
  currentPrice: number;
  className?: string;
}

function generateSignals(data: OHLCV[], currentPrice: number): SignalSummary {
  if (data.length < 50) {
    return { signals: [], overallScore: 0, overallSignal: 'Neutral', confidence: 0 };
  }

  const closes = data.map(d => d.close);
  const signals: Signal[] = [];

  // 1. RSI Analysis
  const rsiData = RSI(closes);
  const rsi = rsiData[rsiData.length - 1];
  const rsiPrev = rsiData[rsiData.length - 2];
  if (!isNaN(rsi)) {
    if (rsi < 30) {
      signals.push({ name: 'RSI Oversold', type: 'bullish', strength: Math.min((30 - rsi) * 3, 90), description: `RSI at ${rsi.toFixed(1)} — oversold, potential bounce`, indicator: 'RSI' });
    } else if (rsi > 70) {
      signals.push({ name: 'RSI Overbought', type: 'bearish', strength: Math.min((rsi - 70) * 3, 90), description: `RSI at ${rsi.toFixed(1)} — overbought, potential pullback`, indicator: 'RSI' });
    } else if (rsi > 50 && rsiPrev < 50) {
      signals.push({ name: 'RSI Bullish Cross', type: 'bullish', strength: 55, description: 'RSI crossed above 50 — momentum shifting bullish', indicator: 'RSI' });
    } else if (rsi < 50 && rsiPrev > 50) {
      signals.push({ name: 'RSI Bearish Cross', type: 'bearish', strength: 55, description: 'RSI crossed below 50 — momentum shifting bearish', indicator: 'RSI' });
    }
  }

  // 2. MACD Analysis
  const macd = MACD(closes);
  const macdLine = macd.macd;
  const macdSignal = macd.signal;
  const macdHist = macd.histogram;
  const lastMacd = macdLine[macdLine.length - 1];
  const lastSignal = macdSignal[macdSignal.length - 1];
  const lastHist = macdHist[macdHist.length - 1];
  const prevHist = macdHist[macdHist.length - 2];

  if (!isNaN(lastMacd) && !isNaN(lastSignal)) {
    // MACD crossover
    const prevMacd = macdLine[macdLine.length - 2];
    const prevSignalLine = macdSignal[macdSignal.length - 2];
    
    if (prevMacd <= prevSignalLine && lastMacd > lastSignal) {
      signals.push({ name: 'MACD Bullish Cross', type: 'bullish', strength: 75, description: 'MACD crossed above signal line — buy signal', indicator: 'MACD' });
    } else if (prevMacd >= prevSignalLine && lastMacd < lastSignal) {
      signals.push({ name: 'MACD Bearish Cross', type: 'bearish', strength: 75, description: 'MACD crossed below signal line — sell signal', indicator: 'MACD' });
    }

    // Histogram momentum
    if (!isNaN(lastHist) && !isNaN(prevHist)) {
      if (lastHist > 0 && lastHist > prevHist) {
        signals.push({ name: 'MACD Momentum Rising', type: 'bullish', strength: 50, description: 'Histogram expanding positive — bullish momentum increasing', indicator: 'MACD' });
      } else if (lastHist < 0 && lastHist < prevHist) {
        signals.push({ name: 'MACD Momentum Falling', type: 'bearish', strength: 50, description: 'Histogram expanding negative — bearish momentum increasing', indicator: 'MACD' });
      }
    }
  }

  // 3. Moving Average Analysis
  const sma20 = SMA(closes, 20);
  const sma50 = SMA(closes, 50);
  const ema12 = EMA(closes, 12);
  const ema26 = EMA(closes, 26);

  const lastSma20 = sma20[sma20.length - 1];
  const lastSma50 = sma50[sma50.length - 1];

  if (!isNaN(lastSma20) && !isNaN(lastSma50)) {
    if (currentPrice > lastSma20 && currentPrice > lastSma50) {
      signals.push({ name: 'Above Key MAs', type: 'bullish', strength: 60, description: `Price above SMA 20 (${lastSma20.toFixed(2)}) and SMA 50 (${lastSma50.toFixed(2)})`, indicator: 'MA' });
    } else if (currentPrice < lastSma20 && currentPrice < lastSma50) {
      signals.push({ name: 'Below Key MAs', type: 'bearish', strength: 60, description: `Price below SMA 20 and SMA 50 — bearish structure`, indicator: 'MA' });
    }

    // Golden/Death Cross
    const prevSma20 = sma20[sma20.length - 2];
    const prevSma50 = sma50[sma50.length - 2];
    if (prevSma20 <= prevSma50 && lastSma20 > lastSma50) {
      signals.push({ name: 'Golden Cross', type: 'bullish', strength: 85, description: 'SMA 20 crossed above SMA 50 — strong bullish signal', indicator: 'MA' });
    } else if (prevSma20 >= prevSma50 && lastSma20 < lastSma50) {
      signals.push({ name: 'Death Cross', type: 'bearish', strength: 85, description: 'SMA 20 crossed below SMA 50 — strong bearish signal', indicator: 'MA' });
    }
  }

  // 4. Bollinger Bands
  const bb = BollingerBands(closes);
  const lastUpper = bb.upper[bb.upper.length - 1];
  const lastLower = bb.lower[bb.lower.length - 1];
  const lastMiddle = bb.middle[bb.middle.length - 1];
  const bbWidth = lastUpper - lastLower;
  const prevWidth = bb.upper[bb.upper.length - 5] - bb.lower[bb.lower.length - 5];

  if (!isNaN(lastUpper) && !isNaN(lastLower)) {
    if (currentPrice >= lastUpper) {
      signals.push({ name: 'BB Upper Band Touch', type: 'bearish', strength: 55, description: 'Price at upper Bollinger Band — may be overextended', indicator: 'BB' });
    } else if (currentPrice <= lastLower) {
      signals.push({ name: 'BB Lower Band Touch', type: 'bullish', strength: 55, description: 'Price at lower Bollinger Band — potential support', indicator: 'BB' });
    }

    // Squeeze detection
    if (!isNaN(prevWidth) && bbWidth < prevWidth * 0.6) {
      signals.push({ name: 'BB Squeeze', type: 'neutral', strength: 70, description: 'Bollinger Bands squeezing — volatility expansion imminent', indicator: 'BB' });
    }
  }

  // 5. Volume Analysis
  const obv = OBV(data);
  const lastOBV = obv[obv.length - 1];
  const obvSma = SMA(obv.slice(-20), 10);
  const lastOBVSma = obvSma[obvSma.length - 1];

  if (!isNaN(lastOBV) && !isNaN(lastOBVSma)) {
    if (lastOBV > lastOBVSma && currentPrice > lastSma20) {
      signals.push({ name: 'Volume Confirming', type: 'bullish', strength: 65, description: 'OBV rising with price — volume confirming uptrend', indicator: 'Volume' });
    } else if (lastOBV < lastOBVSma && currentPrice < lastSma20) {
      signals.push({ name: 'Volume Confirming Down', type: 'bearish', strength: 65, description: 'OBV falling with price — volume confirming downtrend', indicator: 'Volume' });
    } else if (lastOBV > lastOBVSma && currentPrice < lastSma20) {
      signals.push({ name: 'Bullish Divergence (OBV)', type: 'bullish', strength: 70, description: 'OBV rising while price falling — potential reversal', indicator: 'Volume' });
    }
  }

  // 6. Stochastic RSI
  const stochRSI = StochasticRSI(closes);
  const lastK = stochRSI.k[stochRSI.k.length - 1];
  const lastD = stochRSI.d[stochRSI.d.length - 1];
  const prevK = stochRSI.k[stochRSI.k.length - 2];
  const prevD = stochRSI.d[stochRSI.d.length - 2];

  if (!isNaN(lastK) && !isNaN(lastD)) {
    if (lastK < 20 && prevK <= prevD && lastK > lastD) {
      signals.push({ name: 'StochRSI Oversold Cross', type: 'bullish', strength: 70, description: 'StochRSI K crossed D in oversold zone — buy signal', indicator: 'StochRSI' });
    } else if (lastK > 80 && prevK >= prevD && lastK < lastD) {
      signals.push({ name: 'StochRSI Overbought Cross', type: 'bearish', strength: 70, description: 'StochRSI K crossed D in overbought zone — sell signal', indicator: 'StochRSI' });
    }
  }

  // 7. ATR-based volatility context
  const atrData = ATR(data);
  const lastATR = atrData[atrData.length - 1];
  const avgATR = atrData.slice(-20).reduce((s, v) => s + v, 0) / 20;
  
  if (!isNaN(lastATR) && !isNaN(avgATR) && avgATR > 0) {
    if (lastATR > avgATR * 1.5) {
      signals.push({ name: 'High Volatility', type: 'neutral', strength: 60, description: `ATR ${(lastATR / avgATR * 100 - 100).toFixed(0)}% above average — use wider stops`, indicator: 'ATR' });
    }
  }

  // 8. Trend Strength (ADX-like using directional movement)
  const last20 = data.slice(-21);
  let upMoves = 0, downMoves = 0;
  for (let i = 1; i < last20.length; i++) {
    if (last20[i].close > last20[i - 1].close) upMoves++;
    else downMoves++;
  }
  const trendBias = (upMoves - downMoves) / 20;

  if (Math.abs(trendBias) > 0.3) {
    const type = trendBias > 0 ? 'bullish' : 'bearish';
    signals.push({
      name: trendBias > 0 ? 'Strong Uptrend' : 'Strong Downtrend',
      type,
      strength: Math.min(Math.abs(trendBias) * 100, 80),
      description: `${upMoves} up days vs ${downMoves} down days in last 20 — ${type} bias`,
      indicator: 'Trend',
    });
  }

  // Calculate overall score
  let score = 0;
  let totalWeight = 0;
  for (const signal of signals) {
    const weight = signal.strength / 100;
    const direction = signal.type === 'bullish' ? 1 : signal.type === 'bearish' ? -1 : 0;
    score += direction * weight * signal.strength;
    totalWeight += weight;
  }
  const overallScore = totalWeight > 0 ? Math.max(-100, Math.min(100, score / totalWeight)) : 0;
  
  const confidence = Math.min(signals.length * 12, 95);

  let overallSignal: SignalSummary['overallSignal'] = 'Neutral';
  if (overallScore >= 50) overallSignal = 'Strong Buy';
  else if (overallScore >= 20) overallSignal = 'Buy';
  else if (overallScore <= -50) overallSignal = 'Strong Sell';
  else if (overallScore <= -20) overallSignal = 'Sell';

  return { signals, overallScore, overallSignal, confidence };
}

export default function AITradeSignals({ data, symbol, currentPrice, className = '' }: AITradeSignalsProps) {
  const summary = useMemo(() => generateSignals(data, currentPrice), [data, currentPrice]);

  if (summary.signals.length === 0) return null;

  const bullishSignals = summary.signals.filter(s => s.type === 'bullish');
  const bearishSignals = summary.signals.filter(s => s.type === 'bearish');
  const neutralSignals = summary.signals.filter(s => s.type === 'neutral');

  const signalColor = summary.overallScore >= 20 ? 'text-green-400' :
    summary.overallScore <= -20 ? 'text-red-400' : 'text-yellow-400';

  const signalBg = summary.overallSignal === 'Strong Buy' ? 'bg-green-500 text-white' :
    summary.overallSignal === 'Buy' ? 'bg-green-500/30 text-green-400' :
    summary.overallSignal === 'Sell' ? 'bg-red-500/30 text-red-400' :
    summary.overallSignal === 'Strong Sell' ? 'bg-red-500 text-white' :
    'bg-yellow-500/30 text-yellow-400';

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="font-semibold text-[var(--text-primary)]">AI Trade Signals</h3>
          <span className="text-xs text-[var(--text-secondary)]">{symbol}</span>
        </div>
        <div className={`px-3 py-1.5 rounded-lg font-bold text-sm ${signalBg}`}>
          {summary.overallSignal}
        </div>
      </div>

      {/* Score Gauge */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
          <span>Bearish</span>
          <span className={`text-sm font-bold ${signalColor}`}>
            Score: {summary.overallScore > 0 ? '+' : ''}{summary.overallScore.toFixed(0)}
          </span>
          <span>Bullish</span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 flex">
            <div className="w-1/2 bg-gradient-to-r from-red-500/40 to-gray-600/20" />
            <div className="w-1/2 bg-gradient-to-r from-gray-600/20 to-green-500/40" />
          </div>
          {/* Marker */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white rounded shadow-lg transition-all"
            style={{ left: `${50 + summary.overallScore / 2}%` }}
          />
        </div>
        <div className="text-center text-xs text-[var(--text-secondary)] mt-1">
          Confidence: {summary.confidence}% ({summary.signals.length} signals analyzed)
        </div>
      </div>

      {/* Signal Groups */}
      <div className="space-y-3">
        {bullishSignals.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-green-400 mb-1">🟢 Bullish Signals ({bullishSignals.length})</h4>
            <div className="space-y-1">
              {bullishSignals.map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-green-500/5 rounded px-2 py-1">
                  <div>
                    <span className="text-sm font-medium text-green-400">{s.name}</span>
                    <span className="text-xs text-[var(--text-secondary)] ml-2">[{s.indicator}]</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full" style={{ width: `${s.strength}%` }} />
                    </div>
                    <span className="text-xs text-green-400 w-8 text-right">{s.strength}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {bearishSignals.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-red-400 mb-1">🔴 Bearish Signals ({bearishSignals.length})</h4>
            <div className="space-y-1">
              {bearishSignals.map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-red-500/5 rounded px-2 py-1">
                  <div>
                    <span className="text-sm font-medium text-red-400">{s.name}</span>
                    <span className="text-xs text-[var(--text-secondary)] ml-2">[{s.indicator}]</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full" style={{ width: `${s.strength}%` }} />
                    </div>
                    <span className="text-xs text-red-400 w-8 text-right">{s.strength}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {neutralSignals.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-yellow-400 mb-1">⚪ Neutral Signals ({neutralSignals.length})</h4>
            <div className="space-y-1">
              {neutralSignals.map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-yellow-500/5 rounded px-2 py-1">
                  <div>
                    <span className="text-sm font-medium text-yellow-400">{s.name}</span>
                    <span className="text-xs text-[var(--text-secondary)] ml-2">[{s.indicator}]</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${s.strength}%` }} />
                    </div>
                    <span className="text-xs text-yellow-400 w-8 text-right">{s.strength}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Signal Details Tooltip */}
      <div className="mt-3 text-xs text-[var(--text-secondary)] space-y-1 bg-[var(--bg-hover)] rounded p-2">
        {summary.signals.slice(0, 3).map((s, i) => (
          <p key={i}>• {s.description}</p>
        ))}
      </div>

      <div className="mt-2 text-xs text-gray-500 italic">
        ⚠️ These signals are for educational purposes only — not financial advice. Always do your own research.
      </div>
    </div>
  );
}
