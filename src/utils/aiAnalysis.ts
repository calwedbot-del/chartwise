// AI-Powered Technical Analysis

import { OHLCV } from './indicators';

export interface TrendLine {
  startTime: number;
  startPrice: number;
  endTime: number;
  endPrice: number;
  type: 'support' | 'resistance' | 'trend';
  strength: number; // 0-100
}

export interface SupportResistance {
  price: number;
  type: 'support' | 'resistance';
  strength: number;
  touches: number;
}

export interface Pattern {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  startIndex: number;
  endIndex: number;
  description: string;
}

export interface AIAnalysis {
  trendLines: TrendLine[];
  supportResistance: SupportResistance[];
  patterns: Pattern[];
  trend: 'bullish' | 'bearish' | 'sideways';
  trendStrength: number;
  summary: string;
  sentimentScore: number; // -100 (extremely bearish) to +100 (extremely bullish)
  recommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
}

// Find local peaks and troughs
function findPivots(candles: OHLCV[], lookback: number = 5): { peaks: number[]; troughs: number[] } {
  const peaks: number[] = [];
  const troughs: number[] = [];
  
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isPeak = true;
    let isTrough = true;
    
    for (let j = 1; j <= lookback; j++) {
      if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) {
        isPeak = false;
      }
      if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) {
        isTrough = false;
      }
    }
    
    if (isPeak) peaks.push(i);
    if (isTrough) troughs.push(i);
  }
  
  return { peaks, troughs };
}

// Linear regression for trendline fitting
function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number; r2: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R²
  const meanY = sumY / n;
  const ssTotal = points.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0);
  const ssResidual = points.reduce((sum, p) => sum + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  const r2 = 1 - ssResidual / ssTotal;
  
  return { slope, intercept, r2 };
}

// Detect auto trendlines
export function detectTrendLines(candles: OHLCV[]): TrendLine[] {
  const trendLines: TrendLine[] = [];
  const { peaks, troughs } = findPivots(candles);
  
  // Resistance lines from peaks (minimum 3 points)
  if (peaks.length >= 3) {
    const peakPoints = peaks.slice(-6).map(i => ({ x: i, y: candles[i].high }));
    const { slope, intercept, r2 } = linearRegression(peakPoints);
    
    if (r2 > 0.7) {
      const startIdx = peakPoints[0].x;
      const endIdx = peakPoints[peakPoints.length - 1].x;
      
      trendLines.push({
        startTime: candles[startIdx].time,
        startPrice: slope * startIdx + intercept,
        endTime: candles[endIdx].time,
        endPrice: slope * endIdx + intercept,
        type: slope > 0.0001 ? 'resistance' : slope < -0.0001 ? 'resistance' : 'resistance',
        strength: Math.round(r2 * 100),
      });
    }
  }
  
  // Support lines from troughs (minimum 3 points)
  if (troughs.length >= 3) {
    const troughPoints = troughs.slice(-6).map(i => ({ x: i, y: candles[i].low }));
    const { slope, intercept, r2 } = linearRegression(troughPoints);
    
    if (r2 > 0.7) {
      const startIdx = troughPoints[0].x;
      const endIdx = troughPoints[troughPoints.length - 1].x;
      
      trendLines.push({
        startTime: candles[startIdx].time,
        startPrice: slope * startIdx + intercept,
        endTime: candles[endIdx].time,
        endPrice: slope * endIdx + intercept,
        type: 'support',
        strength: Math.round(r2 * 100),
      });
    }
  }
  
  return trendLines;
}

// Detect support and resistance levels
export function detectSupportResistance(candles: OHLCV[], sensitivity: number = 0.02): SupportResistance[] {
  const levels: Map<number, { type: 'support' | 'resistance'; touches: number }> = new Map();
  const priceRange = Math.max(...candles.map(c => c.high)) - Math.min(...candles.map(c => c.low));
  const threshold = priceRange * sensitivity;
  
  const { peaks, troughs } = findPivots(candles);
  
  // Cluster peaks for resistance
  for (const peakIdx of peaks) {
    const price = candles[peakIdx].high;
    let found = false;
    
    for (const [level, data] of levels) {
      if (Math.abs(level - price) < threshold && data.type === 'resistance') {
        // Update existing level
        levels.set((level * data.touches + price) / (data.touches + 1), {
          type: 'resistance',
          touches: data.touches + 1,
        });
        levels.delete(level);
        found = true;
        break;
      }
    }
    
    if (!found) {
      levels.set(price, { type: 'resistance', touches: 1 });
    }
  }
  
  // Cluster troughs for support
  for (const troughIdx of troughs) {
    const price = candles[troughIdx].low;
    let found = false;
    
    for (const [level, data] of levels) {
      if (Math.abs(level - price) < threshold && data.type === 'support') {
        levels.set((level * data.touches + price) / (data.touches + 1), {
          type: 'support',
          touches: data.touches + 1,
        });
        levels.delete(level);
        found = true;
        break;
      }
    }
    
    if (!found) {
      levels.set(price, { type: 'support', touches: 1 });
    }
  }
  
  // Convert to array and calculate strength
  const result: SupportResistance[] = [];
  for (const [price, data] of levels) {
    if (data.touches >= 2) {
      result.push({
        price,
        type: data.type,
        touches: data.touches,
        strength: Math.min(100, data.touches * 25),
      });
    }
  }
  
  return result.sort((a, b) => b.strength - a.strength).slice(0, 6);
}

// Detect chart patterns
export function detectPatterns(candles: OHLCV[]): Pattern[] {
  const patterns: Pattern[] = [];
  
  if (candles.length < 20) return patterns;
  
  // Double Top Detection
  const { peaks } = findPivots(candles);
  if (peaks.length >= 2) {
    const lastTwo = peaks.slice(-2);
    const peak1 = candles[lastTwo[0]].high;
    const peak2 = candles[lastTwo[1]].high;
    const priceDiff = Math.abs(peak1 - peak2) / peak1;
    
    if (priceDiff < 0.02 && lastTwo[1] - lastTwo[0] > 5) {
      patterns.push({
        name: 'Double Top',
        type: 'bearish',
        confidence: Math.round((1 - priceDiff) * 100),
        startIndex: lastTwo[0],
        endIndex: lastTwo[1],
        description: 'Two peaks at similar levels indicating potential reversal',
      });
    }
  }
  
  // Double Bottom Detection
  const { troughs } = findPivots(candles);
  if (troughs.length >= 2) {
    const lastTwo = troughs.slice(-2);
    const trough1 = candles[lastTwo[0]].low;
    const trough2 = candles[lastTwo[1]].low;
    const priceDiff = Math.abs(trough1 - trough2) / trough1;
    
    if (priceDiff < 0.02 && lastTwo[1] - lastTwo[0] > 5) {
      patterns.push({
        name: 'Double Bottom',
        type: 'bullish',
        confidence: Math.round((1 - priceDiff) * 100),
        startIndex: lastTwo[0],
        endIndex: lastTwo[1],
        description: 'Two troughs at similar levels indicating potential reversal',
      });
    }
  }
  
  // Higher Highs / Lower Lows trend
  if (peaks.length >= 3) {
    const recentPeaks = peaks.slice(-3);
    const highs = recentPeaks.map(i => candles[i].high);
    
    if (highs[0] < highs[1] && highs[1] < highs[2]) {
      patterns.push({
        name: 'Higher Highs',
        type: 'bullish',
        confidence: 80,
        startIndex: recentPeaks[0],
        endIndex: recentPeaks[2],
        description: 'Consecutive higher highs indicating uptrend',
      });
    } else if (highs[0] > highs[1] && highs[1] > highs[2]) {
      patterns.push({
        name: 'Lower Highs',
        type: 'bearish',
        confidence: 80,
        startIndex: recentPeaks[0],
        endIndex: recentPeaks[2],
        description: 'Consecutive lower highs indicating downtrend',
      });
    }
  }
  
  return patterns;
}

// Determine overall trend
export function detectTrend(candles: OHLCV[]): { trend: 'bullish' | 'bearish' | 'sideways'; strength: number } {
  if (candles.length < 20) return { trend: 'sideways', strength: 0 };
  
  const closes = candles.map(c => c.close);
  const points = closes.map((c, i) => ({ x: i, y: c }));
  const { slope, r2 } = linearRegression(points);
  
  const priceRange = Math.max(...closes) - Math.min(...closes);
  const normalizedSlope = (slope * candles.length) / priceRange;
  
  if (Math.abs(normalizedSlope) < 0.1) {
    return { trend: 'sideways', strength: Math.round(r2 * 50) };
  } else if (normalizedSlope > 0) {
    return { trend: 'bullish', strength: Math.round(r2 * 100) };
  } else {
    return { trend: 'bearish', strength: Math.round(r2 * 100) };
  }
}

// Calculate sentiment score from analysis components
function calculateSentimentScore(
  trend: 'bullish' | 'bearish' | 'sideways',
  trendStrength: number,
  patterns: Pattern[],
  candles: OHLCV[]
): number {
  let score = 0;
  
  // Trend contribution (up to ±50 points)
  if (trend === 'bullish') {
    score += (trendStrength / 100) * 50;
  } else if (trend === 'bearish') {
    score -= (trendStrength / 100) * 50;
  }
  
  // Pattern contribution (up to ±30 points)
  for (const pattern of patterns) {
    const patternScore = (pattern.confidence / 100) * 15;
    if (pattern.type === 'bullish') {
      score += patternScore;
    } else if (pattern.type === 'bearish') {
      score -= patternScore;
    }
  }
  
  // Recent momentum (up to ±20 points)
  if (candles.length >= 5) {
    const recent = candles.slice(-5);
    const priceChange = (recent[recent.length - 1].close - recent[0].close) / recent[0].close;
    score += priceChange * 200; // Scale to roughly ±20
  }
  
  // Clamp to -100 to +100
  return Math.max(-100, Math.min(100, Math.round(score)));
}

// Get recommendation based on sentiment score
function getRecommendation(score: number): 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' {
  if (score >= 60) return 'Strong Buy';
  if (score >= 25) return 'Buy';
  if (score >= -25) return 'Hold';
  if (score >= -60) return 'Sell';
  return 'Strong Sell';
}

// Full AI Analysis
export function runAIAnalysis(candles: OHLCV[]): AIAnalysis {
  const trendLines = detectTrendLines(candles);
  const supportResistance = detectSupportResistance(candles);
  const patterns = detectPatterns(candles);
  const { trend, strength: trendStrength } = detectTrend(candles);
  
  // Calculate sentiment and recommendation
  const sentimentScore = calculateSentimentScore(trend, trendStrength, patterns, candles);
  const recommendation = getRecommendation(sentimentScore);
  
  // Generate summary
  let summary = `Market is in a ${trend} trend`;
  if (trendStrength > 70) {
    summary += ' with strong conviction';
  } else if (trendStrength > 40) {
    summary += ' with moderate strength';
  } else {
    summary += ' with weak momentum';
  }
  
  if (supportResistance.length > 0) {
    const nearestSupport = supportResistance.find(s => s.type === 'support');
    const nearestResistance = supportResistance.find(s => s.type === 'resistance');
    
    if (nearestSupport) {
      summary += `. Key support at $${nearestSupport.price.toFixed(2)}`;
    }
    if (nearestResistance) {
      summary += `, resistance at $${nearestResistance.price.toFixed(2)}`;
    }
  }
  
  if (patterns.length > 0) {
    summary += `. ${patterns[0].name} pattern detected (${patterns[0].confidence}% confidence)`;
  }
  
  return {
    trendLines,
    supportResistance,
    patterns,
    trend,
    trendStrength,
    summary,
    sentimentScore,
    recommendation,
  };
}
