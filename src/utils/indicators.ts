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
