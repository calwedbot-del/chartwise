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

    // ? for help
    if (e.key === '?') {
      e.preventDefault();
      alert(`ChartWise Keyboard Shortcuts:

← / → : Previous / Next asset
Shift + ← / → : Previous / Next timeframe
T : Toggle dark/light theme
S : Add/remove from watchlist

Indicators:
1 : Toggle SMA 20
2 : Toggle SMA 50
3 : Toggle EMA 12/26
4 : Toggle Bollinger Bands
5 : Toggle VWAP
6 : Toggle Fibonacci`);
    }
  }, [onNextAsset, onPrevAsset, onToggleTheme, onToggleWatchlist, onNextTimeframe, onPrevTimeframe, onToggleIndicator]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
