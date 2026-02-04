import { OHLCV, SMA, RSI, EMA } from './indicators';

export interface Trade {
  type: 'buy' | 'sell';
  date: number; // timestamp
  price: number;
  reason: string;
}

export interface BacktestResult {
  strategy: string;
  trades: Trade[];
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number; // percentage
  maxDrawdown: number; // percentage
  sharpeRatio: number;
  profitFactor: number;
  equity: { time: number; value: number }[];
}

export type StrategyType = 'sma_crossover' | 'rsi_reversal' | 'ema_crossover' | 'bollinger_bounce';

export interface StrategyConfig {
  type: StrategyType;
  // SMA Crossover
  fastPeriod?: number;
  slowPeriod?: number;
  // RSI
  rsiPeriod?: number;
  rsiBuyThreshold?: number;
  rsiSellThreshold?: number;
  // Initial capital
  initialCapital?: number;
}

const STRATEGY_DEFAULTS: Record<StrategyType, Partial<StrategyConfig>> = {
  sma_crossover: { fastPeriod: 10, slowPeriod: 30 },
  rsi_reversal: { rsiPeriod: 14, rsiBuyThreshold: 30, rsiSellThreshold: 70 },
  ema_crossover: { fastPeriod: 12, slowPeriod: 26 },
  bollinger_bounce: { fastPeriod: 20 },
};

export function runBacktest(data: OHLCV[], config: StrategyConfig): BacktestResult {
  const defaults = STRATEGY_DEFAULTS[config.type] || {};
  const fullConfig = { ...defaults, ...config };
  const initialCapital = fullConfig.initialCapital || 10000;

  let trades: Trade[] = [];
  let signals: ('buy' | 'sell' | 'hold')[] = [];

  switch (config.type) {
    case 'sma_crossover':
      signals = smaCrossoverSignals(data, fullConfig.fastPeriod!, fullConfig.slowPeriod!);
      break;
    case 'rsi_reversal':
      signals = rsiReversalSignals(data, fullConfig.rsiPeriod!, fullConfig.rsiBuyThreshold!, fullConfig.rsiSellThreshold!);
      break;
    case 'ema_crossover':
      signals = emaCrossoverSignals(data, fullConfig.fastPeriod!, fullConfig.slowPeriod!);
      break;
    case 'bollinger_bounce':
      signals = bollingerBounceSignals(data, fullConfig.fastPeriod!);
      break;
  }

  // Execute trades based on signals
  let position: 'long' | 'none' = 'none';
  let entryPrice = 0;

  for (let i = 0; i < data.length; i++) {
    const signal = signals[i];
    const price = data[i].close;
    const time = data[i].time;

    if (signal === 'buy' && position === 'none') {
      position = 'long';
      entryPrice = price;
      trades.push({ type: 'buy', date: time, price, reason: getSignalReason(config.type, 'buy') });
    } else if (signal === 'sell' && position === 'long') {
      position = 'none';
      trades.push({ type: 'sell', date: time, price, reason: getSignalReason(config.type, 'sell') });
    }
  }

  // Close any open position at the end
  if (position === 'long' && data.length > 0) {
    const lastCandle = data[data.length - 1];
    trades.push({ type: 'sell', date: lastCandle.time, price: lastCandle.close, reason: 'End of period' });
  }

  // Calculate results
  return calculateResults(trades, data, initialCapital, config.type);
}

function smaCrossoverSignals(data: OHLCV[], fastPeriod: number, slowPeriod: number): ('buy' | 'sell' | 'hold')[] {
  const closes = data.map(d => d.close);
  const fastSMA = SMA(closes, fastPeriod);
  const slowSMA = SMA(closes, slowPeriod);

  return data.map((_, i) => {
    if (i < 1 || isNaN(fastSMA[i]) || isNaN(slowSMA[i]) || isNaN(fastSMA[i - 1]) || isNaN(slowSMA[i - 1])) {
      return 'hold';
    }
    // Golden cross
    if (fastSMA[i - 1] <= slowSMA[i - 1] && fastSMA[i] > slowSMA[i]) return 'buy';
    // Death cross
    if (fastSMA[i - 1] >= slowSMA[i - 1] && fastSMA[i] < slowSMA[i]) return 'sell';
    return 'hold';
  });
}

function rsiReversalSignals(data: OHLCV[], period: number, buyThreshold: number, sellThreshold: number): ('buy' | 'sell' | 'hold')[] {
  const closes = data.map(d => d.close);
  const rsi = RSI(closes, period);

  return data.map((_, i) => {
    if (i < 1 || isNaN(rsi[i]) || isNaN(rsi[i - 1])) return 'hold';
    // RSI crosses above oversold
    if (rsi[i - 1] <= buyThreshold && rsi[i] > buyThreshold) return 'buy';
    // RSI crosses below overbought
    if (rsi[i - 1] >= sellThreshold && rsi[i] < sellThreshold) return 'sell';
    return 'hold';
  });
}

function emaCrossoverSignals(data: OHLCV[], fastPeriod: number, slowPeriod: number): ('buy' | 'sell' | 'hold')[] {
  const closes = data.map(d => d.close);
  const fastEMA = EMA(closes, fastPeriod);
  const slowEMA = EMA(closes, slowPeriod);

  return data.map((_, i) => {
    if (i < 1 || isNaN(fastEMA[i]) || isNaN(slowEMA[i]) || isNaN(fastEMA[i - 1]) || isNaN(slowEMA[i - 1])) {
      return 'hold';
    }
    if (fastEMA[i - 1] <= slowEMA[i - 1] && fastEMA[i] > slowEMA[i]) return 'buy';
    if (fastEMA[i - 1] >= slowEMA[i - 1] && fastEMA[i] < slowEMA[i]) return 'sell';
    return 'hold';
  });
}

function bollingerBounceSignals(data: OHLCV[], period: number): ('buy' | 'sell' | 'hold')[] {
  const closes = data.map(d => d.close);
  const sma = SMA(closes, period);

  // Calculate Bollinger Bands
  return data.map((candle, i) => {
    if (i < period) return 'hold';

    const slice = closes.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    const upper = mean + 2 * std;
    const lower = mean - 2 * std;

    // Price touches lower band → buy
    if (candle.close <= lower) return 'buy';
    // Price touches upper band → sell
    if (candle.close >= upper) return 'sell';
    return 'hold';
  });
}

function getSignalReason(strategy: StrategyType, action: 'buy' | 'sell'): string {
  switch (strategy) {
    case 'sma_crossover':
      return action === 'buy' ? 'SMA Golden Cross' : 'SMA Death Cross';
    case 'rsi_reversal':
      return action === 'buy' ? 'RSI oversold reversal' : 'RSI overbought reversal';
    case 'ema_crossover':
      return action === 'buy' ? 'EMA Golden Cross' : 'EMA Death Cross';
    case 'bollinger_bounce':
      return action === 'buy' ? 'Price at lower BB' : 'Price at upper BB';
  }
}

function calculateResults(
  trades: Trade[],
  data: OHLCV[],
  initialCapital: number,
  strategyName: string
): BacktestResult {
  let capital = initialCapital;
  let shares = 0;
  let wins = 0;
  let losses = 0;
  let totalGain = 0;
  let totalLoss = 0;
  const equity: { time: number; value: number }[] = [];
  let peakEquity = initialCapital;
  let maxDrawdown = 0;
  const returns: number[] = [];

  // Build equity curve
  let currentPos: 'none' | 'long' = 'none';
  let entryPrice = 0;
  let tradeIdx = 0;

  for (let i = 0; i < data.length; i++) {
    const time = data[i].time;
    const price = data[i].close;

    // Check if there's a trade at this time
    while (tradeIdx < trades.length && trades[tradeIdx].date === time) {
      const trade = trades[tradeIdx];
      if (trade.type === 'buy' && currentPos === 'none') {
        shares = capital / trade.price;
        entryPrice = trade.price;
        capital = 0;
        currentPos = 'long';
      } else if (trade.type === 'sell' && currentPos === 'long') {
        capital = shares * trade.price;
        const pnl = ((trade.price - entryPrice) / entryPrice) * 100;
        returns.push(pnl);
        if (pnl > 0) {
          wins++;
          totalGain += pnl;
        } else {
          losses++;
          totalLoss += Math.abs(pnl);
        }
        shares = 0;
        currentPos = 'none';
      }
      tradeIdx++;
    }

    // Calculate current equity
    const currentEquity = currentPos === 'long' ? shares * price : capital;
    equity.push({ time, value: currentEquity });

    // Track drawdown
    if (currentEquity > peakEquity) peakEquity = currentEquity;
    const drawdown = ((peakEquity - currentEquity) / peakEquity) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  const finalEquity = equity.length > 0 ? equity[equity.length - 1].value : initialCapital;
  const totalReturn = ((finalEquity - initialCapital) / initialCapital) * 100;

  // Sharpe Ratio (simplified, annualized)
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdReturn = returns.length > 1
    ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1))
    : 0;
  const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

  const profitFactor = totalLoss > 0 ? totalGain / totalLoss : totalGain > 0 ? Infinity : 0;

  // Strategy display names
  const strategyNames: Record<string, string> = {
    sma_crossover: 'SMA Crossover',
    rsi_reversal: 'RSI Reversal',
    ema_crossover: 'EMA Crossover',
    bollinger_bounce: 'Bollinger Bounce',
  };

  return {
    strategy: strategyNames[strategyName] || strategyName,
    trades,
    totalTrades: Math.floor(trades.length / 2),
    winningTrades: wins,
    losingTrades: losses,
    winRate: wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0,
    totalReturn,
    maxDrawdown,
    sharpeRatio,
    profitFactor,
    equity,
  };
}
