'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi } from 'lightweight-charts';

export type IndicatorType = 'stochRsi' | 'atr' | 'obv';

interface IndicatorChartProps {
  type: IndicatorType;
  data: { time: number }[];
  // Stochastic RSI data
  stochK?: number[];
  stochD?: number[];
  // ATR data
  atrValues?: number[];
  // OBV data
  obvValues?: number[];
  height?: number;
}

const INDICATOR_CONFIG: Record<IndicatorType, { title: string; color: string }> = {
  stochRsi: { title: 'Stochastic RSI (14, 14, 3, 3)', color: '#2962ff' },
  atr: { title: 'ATR (14)', color: '#ff9800' },
  obv: { title: 'OBV', color: '#26a69a' },
};

export default function IndicatorChart({
  type,
  data,
  stochK,
  stochD,
  atrValues,
  obvValues,
  height = 150,
}: IndicatorChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

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
      height,
    });

    chartRef.current = chart;

    if (type === 'stochRsi' && stochK && stochD) {
      // K line
      const kSeries = chart.addLineSeries({
        color: '#2962ff',
        lineWidth: 2,
        title: '%K',
      });
      const kData = stochK
        .map((value, i) => ({
          time: data[i].time,
          value: isNaN(value) ? null : value,
        }))
        .filter(d => d.value !== null);
      kSeries.setData(kData as any);

      // D line
      const dSeries = chart.addLineSeries({
        color: '#ff6d00',
        lineWidth: 1,
        title: '%D',
        lineStyle: 2,
      });
      const dData = stochD
        .map((value, i) => ({
          time: data[i].time,
          value: isNaN(value) ? null : value,
        }))
        .filter(d => d.value !== null);
      dSeries.setData(dData as any);

      // Overbought/Oversold lines
      if (data.length >= 2) {
        const ob = chart.addLineSeries({
          color: 'rgba(239, 83, 80, 0.4)',
          lineWidth: 1,
          lineStyle: 2,
        });
        ob.setData([
          { time: data[0].time, value: 80 },
          { time: data[data.length - 1].time, value: 80 },
        ] as any);

        const os = chart.addLineSeries({
          color: 'rgba(38, 166, 154, 0.4)',
          lineWidth: 1,
          lineStyle: 2,
        });
        os.setData([
          { time: data[0].time, value: 20 },
          { time: data[data.length - 1].time, value: 20 },
        ] as any);
      }
    } else if (type === 'atr' && atrValues) {
      const atrSeries = chart.addLineSeries({
        color: '#ff9800',
        lineWidth: 2,
        title: 'ATR',
      });
      const atrData = atrValues
        .map((value, i) => ({
          time: data[i].time,
          value: isNaN(value) ? null : value,
        }))
        .filter(d => d.value !== null);
      atrSeries.setData(atrData as any);
    } else if (type === 'obv' && obvValues) {
      const obvSeries = chart.addHistogramSeries({
        color: '#26a69a',
        title: 'OBV',
      });
      const obvData = obvValues
        .map((value, i) => ({
          time: data[i].time,
          value,
          color: i > 0 && value >= obvValues[i - 1]
            ? 'rgba(38, 166, 154, 0.7)'
            : 'rgba(239, 83, 80, 0.7)',
        }));
      obvSeries.setData(obvData as any);
    }

    chart.timeScale().fitContent();

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
  }, [type, data, stochK, stochD, atrValues, obvValues, height]);

  const config = INDICATOR_CONFIG[type];

  return (
    <div className="chart-container p-1 mt-1">
      <div className="px-2 py-1 text-xs text-gray-400 bg-[#131722] border-b border-[#1e222d]">
        {config.title}
      </div>
      <div ref={chartContainerRef} />
    </div>
  );
}
