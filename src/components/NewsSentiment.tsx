'use client';

import { useState, useEffect, useMemo } from 'react';

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

interface NewsSentimentProps {
  symbol: string;
  className?: string;
}

// Extended keyword-based sentiment analysis with weighted scoring
function analyzeSentimentScore(title: string): { score: number; category: 'positive' | 'negative' | 'neutral'; keywords: string[] } {
  const lowerTitle = title.toLowerCase();
  
  const positiveWeighted: [string, number][] = [
    ['surge', 3], ['rally', 3], ['soars', 3], ['moon', 3], ['breakthrough', 3],
    ['bullish', 2], ['gains', 2], ['jumps', 2], ['rises', 2], ['record', 2], ['boom', 2],
    ['growth', 1], ['profit', 1], ['up', 1], ['high', 1], ['success', 1],
    ['adoption', 2], ['upgrade', 1], ['launch', 1], ['partnership', 2], ['institutional', 2],
  ];
  
  const negativeWeighted: [string, number][] = [
    ['crash', 3], ['plunge', 3], ['hack', 3], ['scam', 3], ['ban', 3],
    ['bearish', 2], ['falls', 2], ['dump', 2], ['slump', 2], ['fear', 2], ['warning', 2],
    ['drop', 1], ['down', 1], ['low', 1], ['loss', 1], ['decline', 1],
    ['risk', 1], ['concern', 1], ['sell', 1], ['regulation', 1], ['lawsuit', 2],
  ];
  
  let positiveScore = 0;
  let negativeScore = 0;
  const foundKeywords: string[] = [];
  
  for (const [word, weight] of positiveWeighted) {
    if (lowerTitle.includes(word)) {
      positiveScore += weight;
      foundKeywords.push(`+${word}`);
    }
  }
  
  for (const [word, weight] of negativeWeighted) {
    if (lowerTitle.includes(word)) {
      negativeScore += weight;
      foundKeywords.push(`-${word}`);
    }
  }
  
  const score = positiveScore - negativeScore;
  const category = score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
  
  return { score, category, keywords: foundKeywords };
}

function getScoreColor(score: number): string {
  if (score >= 60) return '#22c55e';
  if (score >= 30) return '#84cc16';
  if (score >= -30) return '#eab308';
  if (score >= -60) return '#f97316';
  return '#ef4444';
}

function getScoreLabel(score: number): string {
  if (score >= 60) return 'Very Bullish';
  if (score >= 30) return 'Bullish';
  if (score >= -30) return 'Neutral';
  if (score >= -60) return 'Bearish';
  return 'Very Bearish';
}

function getScoreEmoji(score: number): string {
  if (score >= 60) return '🤑';
  if (score >= 30) return '😀';
  if (score >= -30) return '😐';
  if (score >= -60) return '😨';
  return '😱';
}

export default function NewsSentiment({ symbol, className = '' }: NewsSentimentProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function fetchNews() {
      setLoading(true);
      try {
        const res = await fetch(`/api/news/${symbol}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (!cancelled) {
          setNews(data.news || []);
        }
      } catch (err) {
        console.error('News sentiment fetch error:', err);
      }
      if (!cancelled) setLoading(false);
    }

    fetchNews();
    return () => { cancelled = true; };
  }, [isOpen, symbol]);

  const sentimentAnalysis = useMemo(() => {
    if (news.length === 0) return null;

    const analyses = news.map(item => ({
      ...item,
      analysis: analyzeSentimentScore(item.title),
    }));

    const totalScore = analyses.reduce((sum, a) => sum + a.analysis.score, 0);
    const avgScore = totalScore / analyses.length;
    // Normalize to -100 to 100 scale
    const normalizedScore = Math.max(-100, Math.min(100, avgScore * 15));

    const positive = analyses.filter(a => a.analysis.category === 'positive').length;
    const negative = analyses.filter(a => a.analysis.category === 'negative').length;
    const neutral = analyses.filter(a => a.analysis.category === 'neutral').length;

    return {
      score: normalizedScore,
      positive,
      negative,
      neutral,
      total: analyses.length,
      analyses,
    };
  }, [news]);

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📰</span>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">News Sentiment</h3>
          <span className="text-xs text-[var(--text-secondary)]">{symbol}</span>
        </div>
        <div className="flex items-center gap-2">
          {sentimentAnalysis && !loading && (
            <span className="text-sm font-bold" style={{ color: getScoreColor(sentimentAnalysis.score) }}>
              {getScoreEmoji(sentimentAnalysis.score)} {getScoreLabel(sentimentAnalysis.score)}
            </span>
          )}
          <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="spinner" />
            </div>
          ) : sentimentAnalysis ? (
            <>
              {/* Score Gauge */}
              <div className="bg-[var(--bg-hover)] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--text-secondary)]">Aggregate Sentiment Score</span>
                  <span
                    className="text-2xl font-bold"
                    style={{ color: getScoreColor(sentimentAnalysis.score) }}
                  >
                    {sentimentAnalysis.score >= 0 ? '+' : ''}{sentimentAnalysis.score.toFixed(0)}
                  </span>
                </div>
                
                {/* Score bar */}
                <div className="relative h-3 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 w-1.5 h-full bg-white shadow-lg rounded-full transition-all"
                    style={{ left: `${(sentimentAnalysis.score + 100) / 2}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-1">
                  <span>Bearish</span>
                  <span>Neutral</span>
                  <span>Bullish</span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-500/10 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-green-400">{sentimentAnalysis.positive}</div>
                  <div className="text-xs text-[var(--text-secondary)]">Positive</div>
                </div>
                <div className="bg-gray-500/10 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-gray-400">{sentimentAnalysis.neutral}</div>
                  <div className="text-xs text-[var(--text-secondary)]">Neutral</div>
                </div>
                <div className="bg-red-500/10 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-red-400">{sentimentAnalysis.negative}</div>
                  <div className="text-xs text-[var(--text-secondary)]">Negative</div>
                </div>
              </div>

              {/* Positive/Negative ratio bar */}
              {sentimentAnalysis.total > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-green-400">
                      {((sentimentAnalysis.positive / sentimentAnalysis.total) * 100).toFixed(0)}% Positive
                    </span>
                    <span className="text-red-400">
                      {((sentimentAnalysis.negative / sentimentAnalysis.total) * 100).toFixed(0)}% Negative
                    </span>
                  </div>
                  <div className="h-2 bg-red-500/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500/70 rounded-full transition-all"
                      style={{
                        width: `${sentimentAnalysis.total > 0
                          ? ((sentimentAnalysis.positive + sentimentAnalysis.neutral * 0.5) / sentimentAnalysis.total) * 100
                          : 50}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* News items with sentiment */}
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                {sentimentAnalysis.analyses.slice(0, 8).map((item) => (
                  <a
                    key={item.id}
                    href={item.url !== '#' ? item.url : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${
                        item.analysis.category === 'positive' ? 'bg-green-500/20 text-green-400' :
                        item.analysis.category === 'negative' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {item.analysis.score >= 0 ? '+' : ''}{item.analysis.score}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[var(--text-primary)] line-clamp-2">{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-[var(--text-secondary)]">{item.source}</span>
                          {item.analysis.keywords.length > 0 && (
                            <span className="text-xs text-gray-500 truncate">
                              {item.analysis.keywords.slice(0, 3).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded-lg p-2">
                <strong>News Sentiment</strong> uses keyword analysis to gauge the overall tone of recent news. 
                Scores range from -100 (very bearish) to +100 (very bullish). 
                Use as one signal among many — not for trading decisions alone.
              </div>
            </>
          ) : (
            <div className="text-center text-xs text-[var(--text-secondary)] py-4">
              No news data available for {symbol}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
