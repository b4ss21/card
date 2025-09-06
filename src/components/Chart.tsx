import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, Time, CandlestickData, ISeriesApi } from 'lightweight-charts';
import type { Candle, Signal } from '../types';

interface ChartProps {
  candles: Candle[];
  signals?: Signal[]; // sinais para o mesmo símbolo/timeframe
  height?: number;
}

export function Chart({ candles, signals = [], height = 420 }: ChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#ffffff' }, textColor: '#333' },
      grid: { vertLines: { color: '#eee' }, horzLines: { color: '#eee' } },
      height,
      rightPriceScale: { borderColor: '#ccc' },
      timeScale: { rightOffset: 8, borderColor: '#ccc' },
      crosshair: { mode: 0 },
    });
    const series = chart.addCandlestickSeries({
      upColor: '#16a34a', downColor: '#dc2626', borderDownColor: '#dc2626', borderUpColor: '#16a34a',
      wickDownColor: '#dc2626', wickUpColor: '#16a34a',
    });
    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) return;
      const { width } = containerRef.current.getBoundingClientRect();
      chartRef.current.applyOptions({ width });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    if (!seriesRef.current) return;
    const data: CandlestickData[] = candles.map(c => ({
      time: (c.timestamp / 1000) as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    seriesRef.current.setData(data);

    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }

    // markers de sinais
    if (signals.length > 0) {
      const lastTime = data[data.length - 1]?.time;
      const markers = signals.map(s => ({
        time: (lastTime ?? data[0]?.time) as Time,
        position: s.type === 'BUY' ? 'belowBar' as const : 'aboveBar' as const,
        color: s.type === 'BUY' ? '#16a34a' : '#dc2626',
        shape: s.type === 'BUY' ? 'arrowUp' as const : 'arrowDown' as const,
        text: s.type === 'BUY' ? 'COMPRAR' : 'VENDER',
      }));
      seriesRef.current.setMarkers(markers);
      // linha de preço de entrada
      seriesRef.current.createPriceLine({
        price: signals[0].entryPrice,
        color: '#6366f1',
        lineWidth: 1,
        lineStyle: 2,
        title: `Entrada ${signals[0].type}`,
      });
    }
  }, [candles, signals]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}
