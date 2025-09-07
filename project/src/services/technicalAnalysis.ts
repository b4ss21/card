import { Candle, Signal, Timeframe } from '../types';

export type AnalysisMode = 'candles' | 'all';

export class TechnicalAnalysisService {
	// Apenas candles: retorna o último candle relevante
	analyzeCandlesOnly(candles: Candle[]): any {
		if (!candles || candles.length === 0) return null;
		const last = candles[candles.length - 1];
		return {
			close: last.close,
			open: last.open,
			high: last.high,
			low: last.low,
			volume: last.volume
		};
	}

	// Todos os indicadores: exemplo simples (SMA, RSI, MACD mock)
	analyzeIndicators(candles: Candle[]): any {
		if (!candles || candles.length === 0) return null;
		const closes = candles.map(c => c.close);
		const sma = closes.reduce((a, b) => a + b, 0) / closes.length;
		// Mock RSI e MACD
		const rsi = 50;
		const macd = 0;
		return { sma, rsi, macd };
	}

	// Correlação BTC mockada
	calculateBTCCorrelation(candles: Candle[], btcCandles: Candle[]): number {
		return 0.5;
	}

	// Gera sinal baseado no modo de análise
	generateSignal(
		symbol: string,
		candles: Candle[],
		mode: AnalysisMode,
		indicators: any,
		btcCorrelation: number | undefined,
		timeframe: Timeframe
	): Signal | null {
		if (!candles || candles.length < 10) return null;
		// Exemplo: lógica diferente para cada modo
		let confidence = 60;
		let direction: 'BUY' | 'SELL' = 'BUY';
		if (mode === 'all' && indicators && indicators.rsi > 60) {
			confidence = 80;
			direction = 'SELL';
		}
		return {
			id: symbol + '-' + Date.now(),
			symbol,
			confidence,
			direction,
			expectedGain: 2.5,
			status: 'PENDING',
			timeframe,
			createdAt: Date.now(),
			indicators,
			btcCorrelation
		};
	}
}
import { Candle, Signal, Timeframe } from '../types';

// Implementação mockada/minimalista
export class TechnicalAnalysisService {
	analyzeIndicators(candles: Candle[]): any {
		// Retorna indicadores fictícios
		return {
			sma: candles.length > 0 ? candles.reduce((a, c) => a + c.close, 0) / candles.length : 0,
			rsi: 50,
			macd: 0
		};
	}

	calculateBTCCorrelation(candles: Candle[], btcCandles: Candle[]): number {
		// Mock: retorna correlação fictícia
		return 0.5;
	}

	generateSignal(
		symbol: string,
		candles: Candle[],
		indicators: any,
		btcCorrelation: number | undefined,
		timeframe: Timeframe
	): Signal | null {
		// Mock: gera um sinal fictício se houver candles
		if (!candles || candles.length < 50) return null;
		return {
			id: symbol + '-' + Date.now(),
			symbol,
			confidence: 70,
			direction: 'BUY',
			expectedGain: 2.5,
			status: 'PENDING',
			timeframe,
			createdAt: Date.now(),
			indicators,
			btcCorrelation
		};
	}
}
