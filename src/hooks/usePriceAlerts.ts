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

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('chartwise-alerts');
    if (stored) {
      try {
        setAlerts(JSON.parse(stored));
      } catch {
        setAlerts([]);
      }
    }
  }, []);

  const saveAlerts = (newAlerts: PriceAlert[]) => {
    setAlerts(newAlerts);
    localStorage.setItem('chartwise-alerts', JSON.stringify(newAlerts));
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
    
    const updated = alerts.map(alert => {
      if (alert.symbol !== symbol || alert.triggered) return alert;
      
      const shouldTrigger = 
        (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
        (alert.condition === 'below' && currentPrice <= alert.targetPrice);
      
      if (shouldTrigger) {
        triggeredAlerts.push(alert);
        return { ...alert, triggered: true };
      }
      return alert;
    });
    
    if (triggeredAlerts.length > 0) {
      saveAlerts(updated);
      // Show browser notification if permitted
      triggeredAlerts.forEach(alert => {
        if (Notification.permission === 'granted') {
          new Notification(`ChartWise Alert: ${alert.symbol}`, {
            body: `Price ${alert.condition === 'above' ? 'rose above' : 'fell below'} $${alert.targetPrice.toLocaleString()}`,
            icon: '/favicon.ico'
          });
        }
      });
    }
    
    return triggeredAlerts;
  }, [alerts]);

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
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

  return {
    alerts,
    addAlert,
    removeAlert,
    checkAlerts,
    getActiveAlerts,
    clearTriggeredAlerts,
    requestNotificationPermission,
    mounted
  };
}
