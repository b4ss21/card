import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, Time, LineData, ISeriesApi } from 'lightweight-charts';
import type { Candle } from '../types';

interface ProjectionData {
  historicalCandles: Candle[];
  projectedPrices: { time: number; price: number }[];
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  gainPercent: number;
}

interface ProjectionChartProps {
  data: ProjectionData;
  height?: number;
}

export function ProjectionChart({ data, height = 400 }: ProjectionChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const historicalSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const projectionSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { 
        background: { type: ColorType.Solid, color: '#ffffff' }, 
        textColor: '#333' 
      },
      grid: { 
        vertLines: { color: '#eee' }, 
        horzLines: { color: '#eee' } 
      },
      height,
      rightPriceScale: { borderColor: '#ccc' },
      timeScale: { rightOffset: 12, borderColor: '#ccc' },
      crosshair: { mode: 0 },
    });

    // Série histórica (azul)
    const historicalSeries = chart.addLineSeries({
      color: '#2563eb',
      lineWidth: 2,
      title: 'Histórico',
    });

    // Série de projeção (laranja tracejada)
    const projectionSeries = chart.addLineSeries({
      color: '#f97316',
      lineWidth: 2,
      lineStyle: 2, // dashed
      title: 'Projeção',
    });

    chartRef.current = chart;
    historicalSeriesRef.current = historicalSeries;
    projectionSeriesRef.current = projectionSeries;

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
      historicalSeriesRef.current = null;
      projectionSeriesRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    if (!historicalSeriesRef.current || !projectionSeriesRef.current || !chartRef.current) return;

    // Dados históricos
    const historicalData: LineData[] = data.historicalCandles.map(c => ({
      time: (c.timestamp / 1000) as Time,
      value: c.close,
    }));

    // Dados de projeção
    const projectionData: LineData[] = data.projectedPrices.map(p => ({
      time: (p.time / 1000) as Time,
      value: p.price,
    }));

    historicalSeriesRef.current.setData(historicalData);
    projectionSeriesRef.current.setData(projectionData);

    // Linhas de preço (entrada, alvo, stop) - usando setTimeout para garantir que o gráfico esteja pronto
    setTimeout(() => {
      if (historicalSeriesRef.current) {
        const entryLine = historicalSeriesRef.current.createPriceLine({
          price: data.entryPrice,
          color: '#6366f1',
          lineWidth: 2,
          lineStyle: 0,
          title: `Entrada: $${data.entryPrice.toFixed(4)}`,
        });

        const targetLine = historicalSeriesRef.current.createPriceLine({
          price: data.targetPrice,
          color: '#16a34a',
          lineWidth: 2,
          lineStyle: 0,
          title: `Alvo: $${data.targetPrice.toFixed(4)} (+${data.gainPercent.toFixed(2)}%)`,
        });

        const stopLine = historicalSeriesRef.current.createPriceLine({
          price: data.stopLoss,
          color: '#dc2626',
          lineWidth: 2,
          lineStyle: 0,
          title: `Stop: $${data.stopLoss.toFixed(4)}`,
        });
      }
    }, 100);

    chartRef.current.timeScale().fitContent();
  }, [data]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Projeção de Movimento</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-600"></div>
            <span>Histórico</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-orange-500 border-dashed border-t-2 border-orange-500"></div>
            <span>Projeção</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-blue-700 font-medium">Entrada</div>
          <div className="text-blue-900 font-bold">${data.entryPrice.toFixed(4)}</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="text-green-700 font-medium">Alvo</div>
          <div className="text-green-900 font-bold">${data.targetPrice.toFixed(4)}</div>
        </div>
        <div className="bg-red-50 p-3 rounded-lg">
          <div className="text-red-700 font-medium">Stop Loss</div>
          <div className="text-red-900 font-bold">${data.stopLoss.toFixed(4)}</div>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="text-purple-700 font-medium">Ganho Est.</div>
          <div className="text-purple-900 font-bold">+{data.gainPercent.toFixed(2)}%</div>
        </div>
      </div>

      <div ref={containerRef} style={{ width: '100%', height }} />
    </div>
  );
}