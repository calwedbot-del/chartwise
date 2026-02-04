'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import { OHLCV } from '@/utils/indicators';
import { SupportResistance } from '@/utils/aiAnalysis';

interface ChartProps {
  data: OHLCV[];
  supportResistance?: SupportResistance[];
  indicators?: {
    sma20?: number[];
    sma50?: number[];
    ema12?: number[];
    ema26?: number[];
    bb?: { upper: number[]; middle: number[]; lower: number[] };
  };
  height?: number;
}

export default function Chart({ 
  data, 
  supportResistance = [],
  indicators,
  height = 500 
}: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;
    
    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#1e222d' },
        horzLines: { color: '#1e222d' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
    });
    
    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderDownColor: '#ef5350',
      borderUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      wickUpColor: '#26a69a',
    });
    
    // Set candlestick data
    const candleData = data.map(d => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    
    candlestickSeries.setData(candleData as any);
    
    // Add indicator lines
    if (indicators?.sma20) {
      const sma20Series = chart.addLineSeries({
        color: '#2962ff',
        lineWidth: 1,
      });
      const sma20Data = indicators.sma20
        .map((value, i) => ({
          time: data[i].time,
          value: isNaN(value) ? null : value,
        }))
        .filter(d => d.value !== null);
      sma20Series.setData(sma20Data as any);
    }
    
    if (indicators?.sma50) {
      const sma50Series = chart.addLineSeries({
        color: '#ff9800',
        lineWidth: 1,
      });
      const sma50Data = indicators.sma50
        .map((value, i) => ({
          time: data[i].time,
          value: isNaN(value) ? null : value,
        }))
        .filter(d => d.value !== null);
      sma50Series.setData(sma50Data as any);
    }
    
    // Add Bollinger Bands
    if (indicators?.bb) {
      const bbUpperSeries = chart.addLineSeries({
        color: 'rgba(76, 175, 80, 0.5)',
        lineWidth: 1,
      });
      const bbLowerSeries = chart.addLineSeries({
        color: 'rgba(76, 175, 80, 0.5)',
        lineWidth: 1,
      });
      
      const bbUpperData = indicators.bb.upper
        .map((value, i) => ({
          time: data[i].time,
          value: isNaN(value) ? null : value,
        }))
        .filter(d => d.value !== null);
      
      const bbLowerData = indicators.bb.lower
        .map((value, i) => ({
          time: data[i].time,
          value: isNaN(value) ? null : value,
        }))
        .filter(d => d.value !== null);
      
      bbUpperSeries.setData(bbUpperData as any);
      bbLowerSeries.setData(bbLowerData as any);
    }
    
    // Add support/resistance lines
    supportResistance.forEach((sr) => {
      const lineSeries = chart.addLineSeries({
        color: sr.type === 'support' ? 'rgba(38, 166, 154, 0.7)' : 'rgba(239, 83, 80, 0.7)',
        lineWidth: 2,
        lineStyle: 2,
      });
      
      lineSeries.setData([
        { time: data[0].time, value: sr.price },
        { time: data[data.length - 1].time, value: sr.price },
      ] as any);
    });
    
    // Fit content
    chart.timeScale().fitContent();
    
    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, supportResistance, indicators, height]);
  
  return (
    <div className="chart-container p-1">
      <div ref={chartContainerRef} />
    </div>
  );
}
