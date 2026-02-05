'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi } from 'lightweight-charts';
import { OHLCV, FibonacciLevel, HeikinAshi, IchimokuData } from '@/utils/indicators';
import { SupportResistance } from '@/utils/aiAnalysis';
import { Drawing, DrawingTool } from '@/components/DrawingTools';

export type ChartType = 'candlestick' | 'line' | 'area' | 'heikinashi';

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
    ichimoku?: IchimokuData;
  };
  fibonacciLevels?: FibonacciLevel[];
  height?: number;
  chartType?: ChartType;
  showVolume?: boolean;
  // Drawing tools integration
  drawings?: Drawing[];
  activeTool?: DrawingTool;
  drawingColor?: string;
  onDrawingStart?: (point: { time: number; price: number }) => void;
  onDrawingMove?: (point: { time: number; price: number }) => void;
  onDrawingEnd?: (point: { time: number; price: number }) => void;
  currentDrawing?: Partial<Drawing> | null;
}

const Chart = forwardRef<ChartRef, ChartProps>(function Chart({ 
  data, 
  supportResistance = [],
  indicators,
  fibonacciLevels = [],
  height = 500,
  chartType = 'candlestick',
  showVolume = true,
  drawings = [],
  activeTool = 'none',
  drawingColor = '#3b82f6',
  onDrawingStart,
  onDrawingMove,
  onDrawingEnd,
  currentDrawing,
}, ref) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const drawingSeriesRef = useRef<ISeriesApi<any>[]>([]);

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
    
    if (chartType === 'candlestick' || chartType === 'heikinashi') {
      const displayData = chartType === 'heikinashi' ? HeikinAshi(data) : data;
      
      mainSeries = chart.addCandlestickSeries({
        upColor: chartType === 'heikinashi' ? '#00c853' : '#26a69a',
        downColor: chartType === 'heikinashi' ? '#ff1744' : '#ef5350',
        borderDownColor: chartType === 'heikinashi' ? '#ff1744' : '#ef5350',
        borderUpColor: chartType === 'heikinashi' ? '#00c853' : '#26a69a',
        wickDownColor: chartType === 'heikinashi' ? '#ff1744' : '#ef5350',
        wickUpColor: chartType === 'heikinashi' ? '#00c853' : '#26a69a',
      });
      const candleData = displayData.map(d => ({
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
    
    // Add EMA lines
    if (indicators?.ema12) {
      const ema12Series = chart.addLineSeries({
        color: '#00bcd4',
        lineWidth: 1,
      });
      const ema12Data = indicators.ema12
        .map((value, i) => ({
          time: data[i].time,
          value: isNaN(value) ? null : value,
        }))
        .filter(d => d.value !== null);
      ema12Series.setData(ema12Data as any);
    }

    if (indicators?.ema26) {
      const ema26Series = chart.addLineSeries({
        color: '#ff5722',
        lineWidth: 1,
      });
      const ema26Data = indicators.ema26
        .map((value, i) => ({
          time: data[i].time,
          value: isNaN(value) ? null : value,
        }))
        .filter(d => d.value !== null);
      ema26Series.setData(ema26Data as any);
    }

    // Add Ichimoku Cloud
    if (indicators?.ichimoku) {
      const { tenkanSen, kijunSen, senkouSpanA, senkouSpanB, chikouSpan } = indicators.ichimoku;

      // Tenkan-sen (Conversion Line) - blue
      const tenkanSeries = chart.addLineSeries({
        color: '#2962ff',
        lineWidth: 1,
        title: 'Tenkan',
      });
      const tenkanData = tenkanSen
        .map((value, i) => ({
          time: data[i]?.time,
          value: isNaN(value) ? null : value,
        }))
        .filter(d => d.time && d.value !== null);
      tenkanSeries.setData(tenkanData as any);

      // Kijun-sen (Base Line) - red
      const kijunSeries = chart.addLineSeries({
        color: '#b71c1c',
        lineWidth: 1,
        title: 'Kijun',
      });
      const kijunData = kijunSen
        .map((value, i) => ({
          time: data[i]?.time,
          value: isNaN(value) ? null : value,
        }))
        .filter(d => d.time && d.value !== null);
      kijunSeries.setData(kijunData as any);

      // Senkou Span A (Leading Span A) - green cloud boundary
      const spanASeries = chart.addLineSeries({
        color: 'rgba(76, 175, 80, 0.5)',
        lineWidth: 1,
        title: 'Span A',
      });
      const spanAData = senkouSpanA
        .map((value, i) => ({
          time: data[i]?.time,
          value: isNaN(value) ? null : value,
        }))
        .filter(d => d.time && d.value !== null);
      spanASeries.setData(spanAData as any);

      // Senkou Span B (Leading Span B) - red cloud boundary
      const spanBSeries = chart.addLineSeries({
        color: 'rgba(244, 67, 54, 0.5)',
        lineWidth: 1,
        title: 'Span B',
      });
      const spanBData = senkouSpanB
        .map((value, i) => ({
          time: data[i]?.time,
          value: isNaN(value) ? null : value,
        }))
        .filter(d => d.time && d.value !== null);
      spanBSeries.setData(spanBData as any);

      // Chikou Span (Lagging Span) - green dashed
      const chikouSeries = chart.addLineSeries({
        color: 'rgba(156, 39, 176, 0.7)',
        lineWidth: 1,
        lineStyle: 2,
        title: 'Chikou',
      });
      const chikouData = chikouSpan
        .map((value, i) => ({
          time: data[i]?.time,
          value: isNaN(value) ? null : value,
        }))
        .filter(d => d.time && d.value !== null);
      chikouSeries.setData(chikouData as any);
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
    
    // Store main series reference for coordinate conversion
    mainSeriesRef.current = mainSeries;

    // Render saved drawings
    drawingSeriesRef.current = [];
    const allDrawings = [...drawings];
    if (currentDrawing?.points && currentDrawing.points.length >= 1 && currentDrawing.type) {
      allDrawings.push(currentDrawing as Drawing);
    }

    allDrawings.forEach((drawing) => {
      if (!drawing.points || drawing.points.length === 0) return;

      if (drawing.type === 'horizontal' && drawing.points.length >= 1) {
        const hLine = chart.addLineSeries({
          color: drawing.color || '#3b82f6',
          lineWidth: 2,
          lineStyle: 2,
          crosshairMarkerVisible: false,
        });
        hLine.setData([
          { time: data[0].time, value: drawing.points[0].price },
          { time: data[data.length - 1].time, value: drawing.points[0].price },
        ] as any);
        drawingSeriesRef.current.push(hLine);
      } else if (drawing.type === 'trendline' && drawing.points.length >= 2) {
        const tLine = chart.addLineSeries({
          color: drawing.color || '#3b82f6',
          lineWidth: 2,
          crosshairMarkerVisible: false,
        });
        tLine.setData([
          { time: drawing.points[0].time, value: drawing.points[0].price },
          { time: drawing.points[1].time, value: drawing.points[1].price },
        ] as any);
        drawingSeriesRef.current.push(tLine);
      } else if (drawing.type === 'rectangle' && drawing.points.length >= 2) {
        // Draw rectangle as 4 lines (top, bottom, left, right approximated by lines)
        const p1 = drawing.points[0];
        const p2 = drawing.points[1];
        const topPrice = Math.max(p1.price, p2.price);
        const bottomPrice = Math.min(p1.price, p2.price);
        const leftTime = Math.min(p1.time, p2.time);
        const rightTime = Math.max(p1.time, p2.time);

        // Top line
        const topLine = chart.addLineSeries({
          color: drawing.color || '#3b82f6',
          lineWidth: 1,
          crosshairMarkerVisible: false,
        });
        topLine.setData([
          { time: leftTime, value: topPrice },
          { time: rightTime, value: topPrice },
        ] as any);
        drawingSeriesRef.current.push(topLine);

        // Bottom line
        const bottomLine = chart.addLineSeries({
          color: drawing.color || '#3b82f6',
          lineWidth: 1,
          crosshairMarkerVisible: false,
        });
        bottomLine.setData([
          { time: leftTime, value: bottomPrice },
          { time: rightTime, value: bottomPrice },
        ] as any);
        drawingSeriesRef.current.push(bottomLine);
      }
    });

    // Fit content
    chart.timeScale().fitContent();
    
    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    // Mouse event handling for drawing tools
    const handleCrosshairMove = (param: any) => {
      if (activeTool === 'none' || !param.point || !param.time) return;
      
      const price = mainSeries.coordinateToPrice(param.point.y);
      if (price !== null && !isNaN(price)) {
        onDrawingMove?.({ time: param.time as number, price });
      }
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    const handleClick = (param: any) => {
      if (activeTool === 'none' || !param.point || !param.time) return;
      
      const price = mainSeries.coordinateToPrice(param.point.y);
      if (price !== null && !isNaN(price)) {
        const point = { time: param.time as number, price };
        if (!currentDrawing || !currentDrawing.points || currentDrawing.points.length === 0) {
          onDrawingStart?.(point);
        } else {
          onDrawingEnd?.(point);
        }
      }
    };

    chart.subscribeClick(handleClick);
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.unsubscribeClick(handleClick);
      mainSeriesRef.current = null;
      drawingSeriesRef.current = [];
      chartRef.current = null;
      chart.remove();
    };
  }, [data, supportResistance, indicators, fibonacciLevels, height, chartType, showVolume, drawings, activeTool, currentDrawing, drawingColor, onDrawingStart, onDrawingMove, onDrawingEnd]);
  
  return (
    <div className="chart-container p-1">
      <div 
        ref={chartContainerRef} 
        style={{ cursor: activeTool !== 'none' ? 'crosshair' : 'default' }}
      />
    </div>
  );
});

export default Chart;
