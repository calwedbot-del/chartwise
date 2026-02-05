'use client';

import { useState, useEffect, useMemo } from 'react';

interface FearGreedData {
  value: number;
  classification: string;
  timestamp: number;
}

interface FearGreedHistory {
  value: number;
  classification: string;
  timestamp: string;
}

interface FearGreedIndexProps {
  className?: string;
}

// Alternative.me Fear & Greed Index API (free, no auth)
const API_URL = 'https://api.alternative.me/fng/';

function getGaugeColor(value: number): string {
  if (value <= 20) return '#ef4444'; // Extreme Fear
  if (value <= 40) return '#f97316'; // Fear
  if (value <= 60) return '#eab308'; // Neutral
  if (value <= 80) return '#84cc16'; // Greed
  return '#22c55e'; // Extreme Greed
}

function getGaugeEmoji(value: number): string {
  if (value <= 20) return '😱';
  if (value <= 40) return '😨';
  if (value <= 60) return '😐';
  if (value <= 80) return '😀';
  return '🤑';
}

export default function FearGreedIndex({ className = '' }: FearGreedIndexProps) {
  const [current, setCurrent] = useState<FearGreedData | null>(null);
  const [history, setHistory] = useState<FearGreedHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch current + 30 days of history
        const res = await fetch(`${API_URL}?limit=31&format=json`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();

        if (data.data && data.data.length > 0) {
          const latest = data.data[0];
          setCurrent({
            value: parseInt(latest.value),
            classification: latest.value_classification,
            timestamp: parseInt(latest.timestamp) * 1000,
          });

          setHistory(
            data.data.slice(1).map((d: { value: string; value_classification: string; timestamp: string }) => ({
              value: parseInt(d.value),
              classification: d.value_classification,
              timestamp: d.timestamp,
            }))
          );
        }
      } catch (error) {
        console.error('Fear & Greed fetch error:', error);
      }
      setLoading(false);
    }

    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const weekAvg = useMemo(() => {
    if (history.length < 7) return null;
    const sum = history.slice(0, 7).reduce((s, h) => s + h.value, 0);
    return Math.round(sum / 7);
  }, [history]);

  const monthAvg = useMemo(() => {
    if (history.length < 30) return null;
    const sum = history.slice(0, 30).reduce((s, h) => s + h.value, 0);
    return Math.round(sum / Math.min(30, history.length));
  }, [history]);

  if (loading && !current) {
    return (
      <div className={`bg-[var(--bg-card)] rounded-lg p-3 animate-pulse ${className}`}>
        <div className="h-4 w-32 bg-gray-700 rounded mb-2" />
        <div className="h-8 w-20 bg-gray-700 rounded" />
      </div>
    );
  }

  if (!current) return null;

  const color = getGaugeColor(current.value);
  const emoji = getGaugeEmoji(current.value);

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Fear & Greed Index</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold" style={{ color }}>{current.value}</span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${color}20`, color }}>
            {current.classification}
          </span>
          <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3">
          {/* Gauge */}
          <div className="relative h-4 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full overflow-hidden">
            <div
              className="absolute top-0 w-1 h-full bg-white shadow-lg transition-all"
              style={{ left: `${current.value}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--text-secondary)]">
            <span>Extreme Fear</span>
            <span>Neutral</span>
            <span>Extreme Greed</span>
          </div>

          {/* Averages */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[var(--bg-hover)] rounded-lg p-2 text-center">
              <div className="text-xs text-[var(--text-secondary)]">Now</div>
              <div className="font-bold" style={{ color }}>{current.value}</div>
            </div>
            {weekAvg !== null && (
              <div className="bg-[var(--bg-hover)] rounded-lg p-2 text-center">
                <div className="text-xs text-[var(--text-secondary)]">7d Avg</div>
                <div className="font-bold" style={{ color: getGaugeColor(weekAvg) }}>{weekAvg}</div>
              </div>
            )}
            {monthAvg !== null && (
              <div className="bg-[var(--bg-hover)] rounded-lg p-2 text-center">
                <div className="text-xs text-[var(--text-secondary)]">30d Avg</div>
                <div className="font-bold" style={{ color: getGaugeColor(monthAvg) }}>{monthAvg}</div>
              </div>
            )}
          </div>

          {/* Mini History Chart */}
          {history.length > 0 && (
            <div>
              <div className="text-xs text-[var(--text-secondary)] mb-1">30-Day History</div>
              <div className="flex items-end gap-[2px] h-10">
                {history.slice(0, 30).reverse().map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm transition-all"
                    style={{
                      height: `${h.value}%`,
                      backgroundColor: getGaugeColor(h.value),
                      opacity: 0.7,
                    }}
                    title={`${h.value} - ${h.classification}`}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded-lg p-2">
            The Crypto Fear & Greed Index analyzes emotions and sentiments from different sources 
            including volatility, market momentum, social media, and surveys.
            <br />
            <span className="text-gray-500">Source: Alternative.me</span>
          </div>
        </div>
      )}
    </div>
  );
}
