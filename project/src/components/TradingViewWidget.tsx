import React, { useEffect, useRef } from 'react';

type TradingViewWidgetProps = {
	symbol?: string; // Ex: 'BINANCE:BTCUSDT'
	width?: string | number;
	height?: string | number;
};

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
	symbol = 'BINANCE:BTCUSDT',
	width = '100%',
	height = 400,
}) => {
	const container = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// Remove widget anterior se houver
		if (container.current) {
			container.current.innerHTML = '';
		}
		const script = document.createElement('script');
		script.src = 'https://s3.tradingview.com/tv.js';
		script.async = true;
		script.onload = () => {
			// @ts-ignore
			if (window.TradingView) {
				// @ts-ignore
				new window.TradingView.widget({
					autosize: false,
					width,
					height,
					symbol,
					interval: '60',
					timezone: 'Etc/UTC',
					theme: 'light',
					style: '1',
					locale: 'br',
					toolbar_bg: '#f1f3f6',
					enable_publishing: false,
					hide_top_toolbar: false,
					hide_legend: false,
					save_image: false,
					container_id: container.current?.id || 'tv-widget',
				});
			}
		};
		if (container.current) {
			container.current.appendChild(script);
		}
		// Cleanup
		return () => {
			if (container.current) container.current.innerHTML = '';
		};
	}, [symbol, width, height]);

	return (
		<div
			id="tv-widget"
			ref={container}
			style={{ width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height }}
		/>
	);
};
