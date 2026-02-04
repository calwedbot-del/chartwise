'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi } from 'lightweight-charts';
import { OHLCV, FibonacciLevel } from '@/utils/indicators';
import { SupportResistance } from '@/utils/aiAnalysis';

export type ChartType = 'candlestick' | 'line' | 'area';

export interface ChartRef {
  takeScreenshot: () => string | null;
}

interface ChartProps {
  data: OHLCV[];
  supportResistance?: SupportResistance[];
  indicators?: {
    sma20?: number[];
    sma50?: number[];
    ema12?: number[];
    ema26?: number[];
    bb?: { upper: number[]; middle: number[]; lower: number[] };
    vwap?: number[];
  };
  fibonacciLevels?: FibonacciLevel[];
  height?: number;
  chartType?: ChartType;
  showVolume?: boolean;
}

const Chart = forwardRef<ChartRef, ChartProps>(function Chart({ 
  data, 
  supportResistance = [],
  indicators,
  fibonacciLevels = [],
  height = 500,
  chartType = 'candlestick',
  showVolume = true
}, ref) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Expose screenshot function
  useImperativeHandle(ref, () => ({
    takeScreenshot: () => {
      if (chartRef.current) {
        const canvas = chartRef.current.takeScreenshot();
        return canvas.toDataURL('image/png');
      }
      return null;
    }
  }));
  
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

    // Store chart reference for screenshots
    chartRef.current = chart;
    
    // Add main price series based on chart type
    let mainSeries: any;
    
    if (chartType === 'candlestick') {
      mainSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderDownColor: '#ef5350',
        borderUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        wickUpColor: '#26a69a',
      });
      const candleData = data.map(d => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));
      mainSeries.setData(candleData as any);
    } else if (chartType === 'line') {
      mainSeries = chart.addLineSeries({
        color: '#2962ff',
        lineWidth: 2,
      });
      const lineData = data.map(d => ({
        time: d.time,
        value: d.close,
      }));
      mainSeries.setData(lineData as any);
    } else if (chartType === 'area') {
      mainSeries = chart.addAreaSeries({
        topColor: 'rgba(41, 98, 255, 0.4)',
        bottomColor: 'rgba(41, 98, 255, 0.0)',
        lineColor: '#2962ff',
        lineWidth: 2,
      });
      const areaData = data.map(d => ({
        time: d.time,
        value: d.close,
      }));
      mainSeries.setData(areaData as any);
    }
    
    // Add volume histogram
    if (showVolume && data.some(d => d.volume)) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      });
      
      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
      
      const volumeData = data.map((d, i) => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
      }));
      
      volumeSeries.setData(volumeData as any);
    }
    
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
    
    // Add VWAP
    if (indicators?.vwap) {
      const vwapSeries = chart.addLineSeries({
        color: '#e91e63', // Pink
        lineWidth: 2,
        lineStyle: 0, // Solid
      });
      const vwapData = indicators.vwap
        .map((value, i) => ({
          time: data[i].time,
          value: isNaN(value) ? null : value,
        }))
        .filter(d => d.value !== null);
      vwapSeries.setData(vwapData as any);
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
    
    // Add Fibonacci retracement levels
    if (fibonacciLevels.length > 0) {
      const fibColors: Record<string, string> = {
        '0%': 'rgba(255, 152, 0, 0.8)',     // Orange - high
        '23.6%': 'rgba(255, 193, 7, 0.6)',  // Amber
        '38.2%': 'rgba(255, 235, 59, 0.6)', // Yellow
        '50%': 'rgba(76, 175, 80, 0.6)',    // Green - key level
        '61.8%': 'rgba(33, 150, 243, 0.6)', // Blue - golden ratio
        '78.6%': 'rgba(156, 39, 176, 0.6)', // Purple
        '100%': 'rgba(255, 152, 0, 0.8)',   // Orange - low
      };
      
      fibonacciLevels.forEach((fib) => {
        const color = fibColors[fib.label] || 'rgba(158, 158, 158, 0.5)';
        
        // Create price line for each Fibonacci level
        mainSeries.createPriceLine({
          price: fib.price,
          color: color,
          lineWidth: 1,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: `Fib ${fib.label}`,
        });
      });
    }
    
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
      chartRef.current = null;
      chart.remove();
    };
  }, [data, supportResistance, indicators, fibonacciLevels, height, chartType, showVolume]);
  
  return (
    <div className="chart-container p-1">
      <div ref={chartContainerRef} />
    </div>
  );
});

export default Chart;
