'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  createdAt: number;
  triggered: boolean;
}

export interface AlertHistoryItem {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  triggeredAt: number;
  priceAtTrigger: number;
}

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertHistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('chartwise-alerts');
    const storedHistory = localStorage.getItem('chartwise-alert-history');
    if (stored) {
      try {
        setAlerts(JSON.parse(stored));
      } catch {
        setAlerts([]);
      }
    }
    if (storedHistory) {
      try {
        setAlertHistory(JSON.parse(storedHistory));
      } catch {
        setAlertHistory([]);
      }
    }
  }, []);

  const saveAlerts = (newAlerts: PriceAlert[]) => {
    setAlerts(newAlerts);
    localStorage.setItem('chartwise-alerts', JSON.stringify(newAlerts));
  };

  const saveHistory = (newHistory: AlertHistoryItem[]) => {
    setAlertHistory(newHistory);
    localStorage.setItem('chartwise-alert-history', JSON.stringify(newHistory));
  };

  const addAlert = useCallback((symbol: string, targetPrice: number, condition: 'above' | 'below') => {
    const newAlert: PriceAlert = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      targetPrice,
      condition,
      createdAt: Date.now(),
      triggered: false,
    };
    const updated = [...alerts, newAlert];
    saveAlerts(updated);
    return newAlert;
  }, [alerts]);

  const removeAlert = useCallback((id: string) => {
    const updated = alerts.filter(a => a.id !== id);
    saveAlerts(updated);
  }, [alerts]);

  const checkAlerts = useCallback((symbol: string, currentPrice: number) => {
    const triggeredAlerts: PriceAlert[] = [];
    const newHistoryItems: AlertHistoryItem[] = [];
    
    const updated = alerts.map(alert => {
      if (alert.symbol !== symbol || alert.triggered) return alert;
      
      const shouldTrigger = 
        (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
        (alert.condition === 'below' && currentPrice <= alert.targetPrice);
      
      if (shouldTrigger) {
        triggeredAlerts.push(alert);
        // Add to history
        newHistoryItems.push({
          id: `hist-${alert.id}`,
          symbol: alert.symbol,
          targetPrice: alert.targetPrice,
          condition: alert.condition,
          triggeredAt: Date.now(),
          priceAtTrigger: currentPrice,
        });
        return { ...alert, triggered: true };
      }
      return alert;
    });
    
    if (triggeredAlerts.length > 0) {
      saveAlerts(updated);
      // Save to history (keep last 50)
      const updatedHistory = [...newHistoryItems, ...alertHistory].slice(0, 50);
      saveHistory(updatedHistory);
      // Show browser notification if permitted
      if (typeof window !== 'undefined' && 'Notification' in window) {
        triggeredAlerts.forEach(alert => {
          if (Notification.permission === 'granted') {
            new Notification(`ChartWise Alert: ${alert.symbol}`, {
              body: `Price ${alert.condition === 'above' ? 'rose above' : 'fell below'} $${alert.targetPrice.toLocaleString()}`,
              icon: '/favicon.ico'
            });
          }
        });
      }
    }
    
    return triggeredAlerts;
  }, [alerts, alertHistory]);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  const getActiveAlerts = useCallback((symbol?: string) => {
    return alerts.filter(a => !a.triggered && (symbol ? a.symbol === symbol : true));
  }, [alerts]);

  const clearTriggeredAlerts = useCallback(() => {
    const updated = alerts.filter(a => !a.triggered);
    saveAlerts(updated);
  }, [alerts]);

  const clearAlertHistory = useCallback(() => {
    saveHistory([]);
  }, []);

  const getAlertHistory = useCallback((symbol?: string) => {
    return symbol 
      ? alertHistory.filter(h => h.symbol === symbol)
      : alertHistory;
  }, [alertHistory]);

  return {
    alerts,
    alertHistory,
    addAlert,
    removeAlert,
    checkAlerts,
    getActiveAlerts,
    getAlertHistory,
    clearTriggeredAlerts,
    clearAlertHistory,
    requestNotificationPermission,
    mounted
  };
}
