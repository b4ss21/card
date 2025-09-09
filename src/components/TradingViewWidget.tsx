import React, { useEffect, useRef } from 'react';

interface TradingViewWidgetProps {
  symbol: string;
  interval: string;
  height?: number;
}

// Mapeia os timeframes do app para os do TradingView
const timeframeMap: Record<string, string> = {
  '1m': '1',
  '3m': '3',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '2h': '120',
  '4h': '240',
  '6h': '360',
  '8h': '480',
  '12h': '720',
  '1d': 'D',
  '3d': '3D',
  '1w': 'W',
  '1M': 'M',
};



export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({ symbol, interval }) => {
  const container = useRef<HTMLDivElement>(null);
  // Gera um id único para o container
  const widgetId = `tv-widget-container-${symbol.replace(/[^a-zA-Z0-9]/g, '')}-${interval}`;

  // Altura responsiva 4:3
  useEffect(() => {
    if (!symbol || !interval) return;
    if (!container.current) return;
    container.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      if (window.TradingView) {
        // @ts-ignore
        new window.TradingView.widget({
          autosize: true,
          symbol: `BINANCE:${symbol}`,
          interval: timeframeMap[interval] || '60',
          timezone: 'Etc/UTC',
          theme: 'light',
          style: '1',
          locale: 'br',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: widgetId,
          // FULL-FEATURED
          width: '100%',
          height: '100%',
          allow_symbol_change: true,
          details: true,
          hotlist: true,
          calendar: true,
          studies: [],
          withdateranges: true,
          show_popup_button: true,
          popup_width: '1000',
          popup_height: '650',
          // Mostra barra de busca
          hide_side_toolbar: false,
        });
      }
    };
    container.current.appendChild(script);
  }, [symbol, interval, widgetId]);

  // Wrapper para manter proporção 4:3
  return (
    <div style={{ width: '100%', aspectRatio: '4 / 3', position: 'relative' }}>
      <div
        id={widgetId}
        ref={container}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
    </div>
  );
};
