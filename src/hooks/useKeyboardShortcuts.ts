'use client';

import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsConfig {
  onNextAsset?: () => void;
  onPrevAsset?: () => void;
  onToggleTheme?: () => void;
  onToggleWatchlist?: () => void;
  onNextTimeframe?: () => void;
  onPrevTimeframe?: () => void;
  onToggleIndicator?: (indicator: string) => void;
}

export function useKeyboardShortcuts({
  onNextAsset,
  onPrevAsset,
  onToggleTheme,
  onToggleWatchlist,
  onNextTimeframe,
  onPrevTimeframe,
  onToggleIndicator,
}: KeyboardShortcutsConfig) {
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Arrow keys for asset navigation
    if (e.key === 'ArrowRight' && !e.shiftKey) {
      e.preventDefault();
      onNextAsset?.();
    }
    if (e.key === 'ArrowLeft' && !e.shiftKey) {
      e.preventDefault();
      onPrevAsset?.();
    }

    // Shift + Arrow for timeframe
    if (e.key === 'ArrowRight' && e.shiftKey) {
      e.preventDefault();
      onNextTimeframe?.();
    }
    if (e.key === 'ArrowLeft' && e.shiftKey) {
      e.preventDefault();
      onPrevTimeframe?.();
    }

    // T for theme toggle
    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      onToggleTheme?.();
    }

    // S for star/watchlist
    if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      onToggleWatchlist?.();
    }

    // Number keys for indicators
    if (e.key === '1') {
      e.preventDefault();
      onToggleIndicator?.('sma20');
    }
    if (e.key === '2') {
      e.preventDefault();
      onToggleIndicator?.('sma50');
    }
    if (e.key === '3') {
      e.preventDefault();
      onToggleIndicator?.('ema');
    }
    if (e.key === '4') {
      e.preventDefault();
      onToggleIndicator?.('bb');
    }
    if (e.key === '5') {
      e.preventDefault();
      onToggleIndicator?.('vwap');
    }
    if (e.key === '6') {
      e.preventDefault();
      onToggleIndicator?.('fib');
    }

    // 7 for Ichimoku
    if (e.key === '7') {
      e.preventDefault();
      onToggleIndicator?.('ichimoku');
    }
    // 8 for Stoch RSI
    if (e.key === '8') {
      e.preventDefault();
      onToggleIndicator?.('stochRsi');
    }
    // 9 for ATR
    if (e.key === '9') {
      e.preventDefault();
      onToggleIndicator?.('atr');
    }
    // 0 for OBV
    if (e.key === '0') {
      e.preventDefault();
      onToggleIndicator?.('obv');
    }

    // ? for help
    if (e.key === '?') {
      e.preventDefault();
      alert(`ChartWise Keyboard Shortcuts:

Navigation:
← / → : Previous / Next asset
Shift + ← / → : Previous / Next timeframe
T : Toggle dark/light theme
S : Add/remove from watchlist

Overlay Indicators:
1 : SMA 20      5 : VWAP
2 : SMA 50      6 : Fibonacci
3 : EMA 12/26   7 : Ichimoku Cloud
4 : Bollinger

Sub-Chart Indicators:
8 : Stochastic RSI
9 : ATR
0 : OBV`);
    }
  }, [onNextAsset, onPrevAsset, onToggleTheme, onToggleWatchlist, onNextTimeframe, onPrevTimeframe, onToggleIndicator]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
