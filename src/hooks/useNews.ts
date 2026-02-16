'use client';

import { useState, useEffect, useCallback } from 'react';

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

interface NewsState {
  news: NewsItem[];
  loading: boolean;
  error: string | null;
  metadata?: any;
}

export function useNews(symbol: string, enabled: boolean = true) {
  const [state, setState] = useState<NewsState>({
    news: [],
    loading: false,
    error: null,
  });

  const fetchNews = useCallback(async () => {
    if (!symbol || !enabled) return;

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(`/api/news/${symbol}`);
      if (!res.ok) throw new Error(`Failed to fetch news: ${res.statusText}`);
      const data = await res.json();
      setState({
        news: data.news || [],
        loading: false,
        error: null,
        metadata: data.metadata,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, [symbol, enabled]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return { ...state, refetch: fetchNews };
}
