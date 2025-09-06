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

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({ symbol, interval, height = 420 }) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!symbol || !interval) return;
    // Remove widget anterior
    if (container.current) container.current.innerHTML = '';
    // Cria novo script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.innerHTML = `
      new TradingView.widget({
        autosize: true,
        symbol: 'BINANCE:${symbol.replace('USDT','/USDT')}',
        interval: '${timeframeMap[interval] || '60'}',
        timezone: 'Etc/UTC',
        theme: 'light',
        style: '1',
        locale: 'br',
        toolbar_bg: '#f1f3f6',
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        container_id: 'tv-widget-container',
        height: ${height}
      });
    `;
    if (container.current) container.current.appendChild(script);
  }, [symbol, interval, height]);

  return <div id="tv-widget-container" ref={container} style={{ width: '100%', height }} />;
};
