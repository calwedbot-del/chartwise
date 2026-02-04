'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface ChartState {
  asset: string;
  timeframe: string;
  indicators: string[];
  chartType: 'candlestick' | 'line' | 'area';
}

const DEFAULT_STATE: ChartState = {
  asset: 'ETH',
  timeframe: '90d',
  indicators: ['sma20', 'bb'],
  chartType: 'candlestick',
};

export function useChartState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<ChartState>(DEFAULT_STATE);

  // Parse URL on mount
  useEffect(() => {
    setMounted(true);
    
    const asset = searchParams.get('asset') || DEFAULT_STATE.asset;
    const timeframe = searchParams.get('tf') || DEFAULT_STATE.timeframe;
    const indicatorsParam = searchParams.get('ind');
    const chartType = (searchParams.get('type') as ChartState['chartType']) || DEFAULT_STATE.chartType;
    
    const indicators = indicatorsParam 
      ? indicatorsParam.split(',').filter(Boolean)
      : DEFAULT_STATE.indicators;

    setState({ asset, timeframe, indicators, chartType });
  }, [searchParams]);

  // Update URL when state changes
  const updateState = useCallback((newState: Partial<ChartState>) => {
    setState(prev => {
      const updated = { ...prev, ...newState };
      
      // Build URL params
      const params = new URLSearchParams();
      if (updated.asset !== DEFAULT_STATE.asset) params.set('asset', updated.asset);
      if (updated.timeframe !== DEFAULT_STATE.timeframe) params.set('tf', updated.timeframe);
      if (updated.indicators.join(',') !== DEFAULT_STATE.indicators.join(',')) {
        params.set('ind', updated.indicators.join(','));
      }
      if (updated.chartType !== DEFAULT_STATE.chartType) params.set('type', updated.chartType);
      
      // Update URL without refresh
      const newUrl = params.toString() ? `?${params.toString()}` : '/';
      router.replace(newUrl, { scroll: false });
      
      return updated;
    });
  }, [router]);

  // Generate shareable link
  const getShareLink = useCallback(() => {
    const params = new URLSearchParams();
    params.set('asset', state.asset);
    params.set('tf', state.timeframe);
    params.set('ind', state.indicators.join(','));
    params.set('type', state.chartType);
    
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}?${params.toString()}`;
  }, [state]);

  // Copy share link to clipboard
  const copyShareLink = useCallback(async () => {
    const link = getShareLink();
    try {
      await navigator.clipboard.writeText(link);
      return true;
    } catch {
      return false;
    }
  }, [getShareLink]);

  return {
    ...state,
    mounted,
    setAsset: (asset: string) => updateState({ asset }),
    setTimeframe: (timeframe: string) => updateState({ timeframe }),
    setIndicators: (indicators: string[]) => updateState({ indicators }),
    setChartType: (chartType: ChartState['chartType']) => updateState({ chartType }),
    toggleIndicator: (indicator: string) => {
      const newIndicators = state.indicators.includes(indicator)
        ? state.indicators.filter(i => i !== indicator)
        : [...state.indicators, indicator];
      updateState({ indicators: newIndicators });
    },
    getShareLink,
    copyShareLink,
  };
}
