// Technical Analysis Indicators

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Simple Moving Average
export function SMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    const slice = data.slice(i - period + 1, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / period;
    result.push(avg);
  }
  return result;
}

// Exponential Moving Average
export function EMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA is SMA
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    if (i === period - 1) {
      result.push(ema);
      continue;
    }
    ema = (data[i] - ema) * multiplier + ema;
    result.push(ema);
  }
  return result;
}

// Relative Strength Index
export function RSI(closes: number[], period: number = 14): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Calculate price changes
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // Calculate RSI
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      result.push(NaN);
      continue;
    }
    
    const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    }
  }
  
  return result;
}

// MACD
export function MACD(closes: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): {
  macd: number[];
  signal: number[];
  histogram: number[];
} {
  const fastEMA = EMA(closes, fastPeriod);
  const slowEMA = EMA(closes, slowPeriod);
  
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
  }
  
  const validMacd = macdLine.filter(v => !isNaN(v));
  const signalLine = EMA(validMacd, signalPeriod);
  
  // Pad signal line
  const paddedSignal: number[] = [];
  let signalIdx = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (isNaN(macdLine[i])) {
      paddedSignal.push(NaN);
    } else {
      paddedSignal.push(signalLine[signalIdx] || NaN);
      signalIdx++;
    }
  }
  
  const histogram: number[] = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (isNaN(macdLine[i]) || isNaN(paddedSignal[i])) {
      histogram.push(NaN);
    } else {
      histogram.push(macdLine[i] - paddedSignal[i]);
    }
  }
  
  return { macd: macdLine, signal: paddedSignal, histogram };
}

// Bollinger Bands
export function BollingerBands(closes: number[], period: number = 20, stdDev: number = 2): {
  upper: number[];
  middle: number[];
  lower: number[];
} {
  const middle = SMA(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    upper.push(mean + stdDev * std);
    lower.push(mean - stdDev * std);
  }
  
  return { upper, middle, lower };
}

// Volume Weighted Average Price
export function VWAP(candles: OHLCV[]): number[] {
  const result: number[] = [];
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;
  
  for (const candle of candles) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    const volume = candle.volume || 1;
    
    cumulativeTPV += typicalPrice * volume;
    cumulativeVolume += volume;
    
    result.push(cumulativeTPV / cumulativeVolume);
  }
  
  return result;
}

// Fibonacci Retracement Levels
export interface FibonacciLevel {
  level: number;
  price: number;
  label: string;
}

export function FibonacciRetracement(candles: OHLCV[]): FibonacciLevel[] {
  if (candles.length === 0) return [];
  
  // Find the high and low of the period
  let high = candles[0].high;
  let low = candles[0].low;
  
  for (const candle of candles) {
    if (candle.high > high) high = candle.high;
    if (candle.low < low) low = candle.low;
  }
  
  const diff = high - low;
  
  // Standard Fibonacci retracement levels
  const fibLevels = [
    { level: 0, label: '0%' },
    { level: 0.236, label: '23.6%' },
    { level: 0.382, label: '38.2%' },
    { level: 0.5, label: '50%' },
    { level: 0.618, label: '61.8%' },
    { level: 0.786, label: '78.6%' },
    { level: 1, label: '100%' },
  ];
  
  // Calculate price at each level (from high)
  return fibLevels.map(fib => ({
    level: fib.level,
    price: high - (diff * fib.level),
    label: fib.label
  }));
}

// Heikin Ashi Candles
export function HeikinAshi(candles: OHLCV[]): OHLCV[] {
  if (candles.length === 0) return [];
  
  const result: OHLCV[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    
    let haOpen: number;
    if (i === 0) {
      haOpen = (c.open + c.close) / 2;
    } else {
      haOpen = (result[i - 1].open + result[i - 1].close) / 2;
    }
    
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);
    
    result.push({
      time: c.time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      volume: c.volume,
    });
  }
  
  return result;
}

// Stochastic RSI
export function StochasticRSI(
  closes: number[],
  rsiPeriod: number = 14,
  stochPeriod: number = 14,
  kSmoothing: number = 3,
  dSmoothing: number = 3
): { k: number[]; d: number[] } {
  const rsiValues = RSI(closes, rsiPeriod);
  
  const stochK: number[] = [];
  
  for (let i = 0; i < rsiValues.length; i++) {
    if (isNaN(rsiValues[i]) || i < rsiPeriod + stochPeriod - 1) {
      stochK.push(NaN);
      continue;
    }
    
    const rsiSlice = rsiValues.slice(i - stochPeriod + 1, i + 1).filter(v => !isNaN(v));
    if (rsiSlice.length < stochPeriod) {
      stochK.push(NaN);
      continue;
    }
    
    const minRSI = Math.min(...rsiSlice);
    const maxRSI = Math.max(...rsiSlice);
    
    if (maxRSI === minRSI) {
      stochK.push(50);
    } else {
      stochK.push(((rsiValues[i] - minRSI) / (maxRSI - minRSI)) * 100);
    }
  }
  
  // Smooth K with SMA
  const k = SMA(stochK.map(v => isNaN(v) ? 0 : v), kSmoothing);
  // Re-apply NaN mask
  for (let i = 0; i < stochK.length; i++) {
    if (isNaN(stochK[i])) k[i] = NaN;
  }
  
  // D is SMA of K
  const d = SMA(k.map(v => isNaN(v) ? 0 : v), dSmoothing);
  for (let i = 0; i < k.length; i++) {
    if (isNaN(k[i])) d[i] = NaN;
  }
  
  return { k, d };
}

// Average True Range (ATR)
export function ATR(candles: OHLCV[], period: number = 14): number[] {
  if (candles.length === 0) return [];
  
  const trueRanges: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      trueRanges.push(candles[i].high - candles[i].low);
    } else {
      const tr = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      );
      trueRanges.push(tr);
    }
  }
  
  const result: number[] = [];
  
  for (let i = 0; i < trueRanges.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    
    if (i === period - 1) {
      // First ATR is simple average
      const sum = trueRanges.slice(0, period).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    } else {
      // Subsequent ATR uses smoothing
      result.push((result[i - 1] * (period - 1) + trueRanges[i]) / period);
    }
  }
  
  return result;
}

// On-Balance Volume (OBV)
export function OBV(candles: OHLCV[]): number[] {
  if (candles.length === 0) return [];
  
  const result: number[] = [candles[0].volume || 0];
  
  for (let i = 1; i < candles.length; i++) {
    const volume = candles[i].volume || 0;
    
    if (candles[i].close > candles[i - 1].close) {
      result.push(result[i - 1] + volume);
    } else if (candles[i].close < candles[i - 1].close) {
      result.push(result[i - 1] - volume);
    } else {
      result.push(result[i - 1]);
    }
  }
  
  return result;
}

// Ichimoku Cloud
export interface IchimokuData {
  tenkanSen: number[];    // Conversion Line (9-period)
  kijunSen: number[];     // Base Line (26-period)
  senkouSpanA: number[];  // Leading Span A (displaced 26 periods ahead)
  senkouSpanB: number[];  // Leading Span B (displaced 26 periods ahead)
  chikouSpan: number[];   // Lagging Span (displaced 26 periods back)
}

function highLowAvg(candles: OHLCV[], start: number, period: number): number {
  let high = -Infinity;
  let low = Infinity;
  for (let i = start; i < start + period && i < candles.length; i++) {
    if (candles[i].high > high) high = candles[i].high;
    if (candles[i].low < low) low = candles[i].low;
  }
  return (high + low) / 2;
}

export function IchimokuCloud(
  candles: OHLCV[],
  tenkanPeriod: number = 9,
  kijunPeriod: number = 26,
  senkouBPeriod: number = 52,
  displacement: number = 26
): IchimokuData {
  const len = candles.length;
  const tenkanSen: number[] = new Array(len).fill(NaN);
  const kijunSen: number[] = new Array(len).fill(NaN);
  const senkouSpanA: number[] = new Array(len + displacement).fill(NaN);
  const senkouSpanB: number[] = new Array(len + displacement).fill(NaN);
  const chikouSpan: number[] = new Array(len).fill(NaN);

  for (let i = 0; i < len; i++) {
    // Tenkan-sen (Conversion Line)
    if (i >= tenkanPeriod - 1) {
      tenkanSen[i] = highLowAvg(candles, i - tenkanPeriod + 1, tenkanPeriod);
    }

    // Kijun-sen (Base Line)
    if (i >= kijunPeriod - 1) {
      kijunSen[i] = highLowAvg(candles, i - kijunPeriod + 1, kijunPeriod);
    }

    // Senkou Span A (average of Tenkan & Kijun, displaced forward)
    if (!isNaN(tenkanSen[i]) && !isNaN(kijunSen[i])) {
      senkouSpanA[i + displacement] = (tenkanSen[i] + kijunSen[i]) / 2;
    }

    // Senkou Span B (52-period high-low avg, displaced forward)
    if (i >= senkouBPeriod - 1) {
      senkouSpanB[i + displacement] = highLowAvg(candles, i - senkouBPeriod + 1, senkouBPeriod);
    }

    // Chikou Span (current close, displaced backward)
    if (i >= displacement) {
      chikouSpan[i - displacement] = candles[i].close;
    }
  }

  // Trim spans to original length for chart alignment
  return {
    tenkanSen,
    kijunSen,
    senkouSpanA: senkouSpanA.slice(0, len),
    senkouSpanB: senkouSpanB.slice(0, len),
    chikouSpan,
  };
}

// Fibonacci Extension Levels (for price targets)
export function FibonacciExtension(candles: OHLCV[]): FibonacciLevel[] {
  if (candles.length === 0) return [];
  
  let high = candles[0].high;
  let low = candles[0].low;
  
  for (const candle of candles) {
    if (candle.high > high) high = candle.high;
    if (candle.low < low) low = candle.low;
  }
  
  const diff = high - low;
  
  // Extension levels beyond 100%
  const extLevels = [
    { level: 1.272, label: '127.2%' },
    { level: 1.414, label: '141.4%' },
    { level: 1.618, label: '161.8%' },
    { level: 2.0, label: '200%' },
    { level: 2.618, label: '261.8%' },
  ];
  
  return extLevels.map(ext => ({
    level: ext.level,
    price: low + (diff * ext.level),
    label: ext.label
  }));
}
