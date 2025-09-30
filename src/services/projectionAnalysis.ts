import { Candle, Signal, TechnicalIndicators } from '../types';

export interface ProjectionResult {
  projectedPrices: { time: number; price: number }[];
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  confidence: number;
  gainPercent: number;
  projectionMethod: string;
}

export class ProjectionAnalysisService {
  
  // Análise de projeção usando múltiplos métodos
  analyzeProjection(candles: Candle[], symbol: string, timeframe: string): ProjectionResult | null {
    if (candles.length < 30) return null;

    const currentPrice = candles[candles.length - 1].close;
    const timeInterval = this.getTimeIntervalMs(timeframe);
    
    // Combina diferentes métodos de projeção
    const linearProjection = this.calculateLinearProjection(candles, 10);
    const movingAverageProjection = this.calculateMovingAverageProjection(candles, 20);
    const trendProjection = this.calculateTrendProjection(candles, 15);
    const fibonacciProjection = this.calculateFibonacciProjection(candles, 12);
    
    // Média ponderada das projeções
    const projectedPrices: { time: number; price: number }[] = [];
    const projectionPeriods = 20; // Projeta 20 períodos à frente
    
    for (let i = 1; i <= projectionPeriods; i++) {
      const futureTime = candles[candles.length - 1].timestamp + (timeInterval * i);
      
      const linearPrice = this.getProjectedPrice(linearProjection, i);
      const maPrice = this.getProjectedPrice(movingAverageProjection, i);
      const trendPrice = this.getProjectedPrice(trendProjection, i);
      const fibPrice = this.getProjectedPrice(fibonacciProjection, i);
      
      // Média ponderada (linear 30%, MA 25%, trend 25%, fib 20%)
      const weightedPrice = (linearPrice * 0.3) + (maPrice * 0.25) + (trendPrice * 0.25) + (fibPrice * 0.2);
      
      projectedPrices.push({
        time: futureTime,
        price: weightedPrice
      });
    }

    // Calcula níveis de entrada, alvo e stop baseado na projeção
    const projectionTrend = this.analyzeTrend(projectedPrices);
    const volatility = this.calculateVolatility(candles.slice(-20));
    
    // Ajusta targets baseado no timeframe e volatilidade
    const timeframeMultiplier = this.getTimeframeMultiplier(timeframe);
    const volatilityMultiplier = Math.min(volatility / 30, 2);
    
    let entryPrice = currentPrice;
    let targetPrice: number;
    let stopLoss: number;
    let confidence = 70;
    
    if (projectionTrend === 'BULLISH') {
      targetPrice = currentPrice * (1 + (0.02 * timeframeMultiplier * volatilityMultiplier));
      stopLoss = currentPrice * (1 - (0.015 * timeframeMultiplier));
      confidence += 10;
    } else if (projectionTrend === 'BEARISH') {
      targetPrice = currentPrice * (1 - (0.02 * timeframeMultiplier * volatilityMultiplier));
      stopLoss = currentPrice * (1 + (0.015 * timeframeMultiplier));
      confidence += 10;
    } else {
      // Neutro - usa range trading
      targetPrice = currentPrice * (1 + (0.015 * timeframeMultiplier));
      stopLoss = currentPrice * (1 - (0.015 * timeframeMultiplier));
    }

    const gainPercent = Math.abs((targetPrice - entryPrice) / entryPrice * 100);

    return {
      projectedPrices,
      entryPrice,
      targetPrice,
      stopLoss,
      confidence: Math.min(confidence, 95),
      gainPercent,
      projectionMethod: 'Análise Combinada (Linear + MA + Trend + Fibonacci)'
    };
  }

  // Projeção linear baseada na tendência recente
  private calculateLinearProjection(candles: Candle[], periods: number): { slope: number; intercept: number } {
    const recentCandles = candles.slice(-periods);
    const prices = recentCandles.map(c => c.close);
    
    const n = prices.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = prices.reduce((sum, price) => sum + price, 0);
    const sumXY = prices.reduce((sum, price, i) => sum + (price * i), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  }

  // Projeção baseada em média móvel exponencial
  private calculateMovingAverageProjection(candles: Candle[], periods: number): { trend: number; base: number } {
    const prices = candles.slice(-periods).map(c => c.close);
    const ema = this.calculateEMA(prices, Math.min(periods, 10));
    const currentPrice = prices[prices.length - 1];
    
    const trend = (currentPrice - ema) / ema;
    
    return { trend, base: currentPrice };
  }

  // Projeção baseada em análise de tendência
  private calculateTrendProjection(candles: Candle[], periods: number): { direction: number; strength: number; base: number } {
    const recentCandles = candles.slice(-periods);
    const highs = recentCandles.map(c => c.high);
    const lows = recentCandles.map(c => c.low);
    const closes = recentCandles.map(c => c.close);
    
    // Analisa a força da tendência
    const highTrend = this.calculateLinearProjection(recentCandles.map((c, i) => ({ ...c, close: c.high })), periods);
    const lowTrend = this.calculateLinearProjection(recentCandles.map((c, i) => ({ ...c, close: c.low })), periods);
    
    const direction = (highTrend.slope + lowTrend.slope) / 2;
    const strength = Math.abs(direction) / (closes[closes.length - 1] * 0.01);
    
    return { direction, strength: Math.min(strength, 3), base: closes[closes.length - 1] };
  }

  // Projeção baseada em níveis de Fibonacci
  private calculateFibonacciProjection(candles: Candle[], periods: number): { levels: number[]; base: number } {
    const recentCandles = candles.slice(-periods);
    const high = Math.max(...recentCandles.map(c => c.high));
    const low = Math.min(...recentCandles.map(c => c.low));
    const currentPrice = candles[candles.length - 1].close;
    
    const range = high - low;
    const fibLevels = [0.236, 0.382, 0.5, 0.618, 0.786];
    
    const levels = fibLevels.map(fib => {
      if (currentPrice > (high + low) / 2) {
        // Tendência de alta - projeta para cima
        return high + (range * fib);
      } else {
        // Tendência de baixa - projeta para baixo
        return low - (range * fib);
      }
    });
    
    return { levels, base: currentPrice };
  }

  // Obtém preço projetado baseado no método
  private getProjectedPrice(projection: any, period: number): number {
    if (projection.slope !== undefined) {
      // Linear projection
      return projection.intercept + (projection.slope * period);
    } else if (projection.trend !== undefined) {
      // Moving average projection
      return projection.base * (1 + (projection.trend * period * 0.1));
    } else if (projection.direction !== undefined) {
      // Trend projection
      return projection.base + (projection.direction * period * projection.strength);
    } else if (projection.levels) {
      // Fibonacci projection - usa o nível médio
      const avgLevel = projection.levels.reduce((sum, level) => sum + level, 0) / projection.levels.length;
      return projection.base + ((avgLevel - projection.base) * period * 0.05);
    }
    
    return projection.base || 0;
  }

  // Analisa tendência da projeção
  private analyzeTrend(projectedPrices: { time: number; price: number }[]): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    if (projectedPrices.length < 5) return 'NEUTRAL';
    
    const firstPrice = projectedPrices[0].price;
    const lastPrice = projectedPrices[projectedPrices.length - 1].price;
    const midPrice = projectedPrices[Math.floor(projectedPrices.length / 2)].price;
    
    const totalChange = (lastPrice - firstPrice) / firstPrice;
    const midChange = (midPrice - firstPrice) / firstPrice;
    
    if (totalChange > 0.01 && midChange > 0) return 'BULLISH';
    if (totalChange < -0.01 && midChange < 0) return 'BEARISH';
    
    return 'NEUTRAL';
  }

  // Calcula volatilidade
  private calculateVolatility(candles: Candle[]): number {
    if (candles.length < 2) return 20;
    
    const returns = candles.slice(1).map((candle, i) => 
      Math.log(candle.close / candles[i].close)
    );
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(365) * 100;
  }

  // Calcula EMA
  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  // Obtém intervalo de tempo em ms baseado no timeframe
  private getTimeIntervalMs(timeframe: string): number {
    const intervals: Record<string, number> = {
      '1m': 60 * 1000,
      '3m': 3 * 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '2h': 2 * 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '8h': 8 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000,
    };
    
    return intervals[timeframe] || 60 * 60 * 1000;
  }

  // Multiplicador baseado no timeframe
  private getTimeframeMultiplier(timeframe: string): number {
    const multipliers: Record<string, number> = {
      '1m': 0.5, '3m': 0.6, '5m': 0.7, '15m': 0.8, '30m': 0.9,
      '1h': 1.0, '2h': 1.1, '4h': 1.3, '6h': 1.4, '8h': 1.5, '12h': 1.6,
      '1d': 2.0, '3d': 2.5, '1w': 3.0, '1M': 4.0
    };
    
    return multipliers[timeframe] || 1.0;
  }

  // Gera sinal baseado na projeção
  generateProjectionSignal(
    symbol: string,
    candles: Candle[],
    timeframe: string,
    minConfidence: number
  ): Signal | null {
    const projection = this.analyzeProjection(candles, symbol, timeframe);
    
    if (!projection || projection.confidence < minConfidence) return null;

    const trend = this.analyzeTrend(projection.projectedPrices);
    const signalType = trend === 'BEARISH' ? 'SELL' : 'BUY';

    const emptyIndicators: TechnicalIndicators = {
      ema12: projection.entryPrice,
      ema26: projection.entryPrice,
      ema50: projection.entryPrice,
      rsi: 50,
      stochastic: { k: 50, d: 50 },
      bollingerBands: { 
        upper: projection.entryPrice * 1.02, 
        middle: projection.entryPrice, 
        lower: projection.entryPrice * 0.98 
      },
      macd: { macd: 0, signal: 0, histogram: 0 },
      volatility: this.calculateVolatility(candles.slice(-20)),
      volumeProfile: 1
    };

    return {
      id: `${symbol}-projection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      type: signalType,
      entryPrice: projection.entryPrice,
      targetPrice: projection.targetPrice,
      stopLoss: projection.stopLoss,
      confidence: projection.confidence,
      timestamp: new Date(),
      timeframe,
      expectedGain: projection.gainPercent,
      btcCorrelation: 0,
      status: 'PENDING',
      indicators: emptyIndicators,
      reason: `Projeção de movimento ${trend.toLowerCase()} baseada em ${projection.projectionMethod}. Confiança: ${projection.confidence}%`
    };
  }
}