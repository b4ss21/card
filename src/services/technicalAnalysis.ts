  // Detecta padrões simples de candles (exemplo: martelo, engolfo de alta/baixa)
  detectCandlePattern(candles: Candle[]): { type: 'BUY' | 'SELL' | null, pattern: string | null } {
    if (candles.length < 2) return { type: null, pattern: null };
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    // Martelo (Hammer)
    const body = Math.abs(last.close - last.open);
    const candleSize = last.high - last.low;
    const lowerShadow = last.open < last.close ? last.open - last.low : last.close - last.low;
    const upperShadow = last.high - (last.open > last.close ? last.open : last.close);
    if (
      body < candleSize * 0.4 &&
      lowerShadow > body * 2 &&
      upperShadow < body
    ) {
      return { type: 'BUY', pattern: 'Martelo' };
    }
    // Engolfo de alta (Bullish Engulfing)
    if (
      prev.close < prev.open &&
      last.close > last.open &&
      last.open < prev.close &&
      last.close > prev.open
    ) {
      return { type: 'BUY', pattern: 'Engolfo de Alta' };
    }
    // Engolfo de baixa (Bearish Engulfing)
    if (
      prev.close > prev.open &&
      last.close < last.open &&
      last.open > prev.close &&
      last.close < prev.open
    ) {
      return { type: 'SELL', pattern: 'Engolfo de Baixa' };
    }
    // Doji
    if (body < candleSize * 0.1) {
      return { type: null, pattern: 'Doji' };
    }
    return { type: null, pattern: null };
  }

import { Candle, TechnicalIndicators, Signal } from '../types';

export class TechnicalAnalysisService {
  // Detecta padrões simples de candles (exemplo: martelo, engolfo de alta/baixa)
  detectCandlePattern(candles: Candle[], symbol: string, timeframe: string): Signal | null {
    if (candles.length < 5) return null;
    // Percorre toda a janela de candles para buscar padrões
    for (let i = 4; i < candles.length; i++) {
      const last = candles[i];
      const prev = candles[i - 1];
      let type: 'BUY' | 'SELL' | null = null;
      let pattern: string | null = null;
      // Martelo (Hammer)
      const body = Math.abs(last.close - last.open);
      const candleSize = last.high - last.low;
      const lowerShadow = last.open < last.close ? last.open - last.low : last.close - last.low;
      const upperShadow = last.high - (last.open > last.close ? last.open : last.close);
      if (
        body < candleSize * 0.4 &&
        lowerShadow > body * 2 &&
        upperShadow < body
      ) {
        type = 'BUY';
        pattern = 'Martelo';
      }
      // Engolfo de alta (Bullish Engulfing)
      else if (
        prev.close < prev.open &&
        last.close > last.open &&
        last.open < prev.close &&
        last.close > prev.open
      ) {
        type = 'BUY';
        pattern = 'Engolfo de Alta';
      }
      // Engolfo de baixa (Bearish Engulfing)
      else if (
        prev.close > prev.open &&
        last.close < last.open &&
        last.open > prev.close &&
        last.close < prev.open
      ) {
        type = 'SELL';
        pattern = 'Engolfo de Baixa';
      }
      // Doji
      else if (body < candleSize * 0.1) {
        pattern = 'Doji';
      }
      // Topo duplo
      if (!type && i >= 4) {
        const high1 = candles[i - 4].high;
        const high2 = candles[i - 2].high;
        const highNow = last.high;
        if (Math.abs(high1 - high2) / high1 < 0.01 && Math.abs(high2 - highNow) / high2 < 0.01) {
          type = 'SELL';
          pattern = 'Topo Duplo';
        }
      }
      // Fundo duplo (suporte duplo)
      if (!type && i >= 4) {
        const low1 = candles[i - 4].low;
        const low2 = candles[i - 2].low;
        const lowNow = last.low;
        if (Math.abs(low1 - low2) / low1 < 0.01 && Math.abs(low2 - lowNow) / low2 < 0.01) {
          type = 'BUY';
          pattern = 'Fundo Duplo';
        }
      }
      // Triângulo ascendente
      if (!type && i >= 4) {
        const c = candles.slice(i - 4, i + 1);
        const highs = c.map(x => x.high);
        const lows = c.map(x => x.low);
        const maxHigh = Math.max(...highs);
        const minHigh = Math.min(...highs);
        // topo horizontal e fundos ascendentes
        if (maxHigh - minHigh < maxHigh * 0.005 && lows[4] > lows[0] && lows[3] > lows[1]) {
          type = 'BUY';
          pattern = 'Triângulo Ascendente';
        }
      }
      // Triângulo descendente
      if (!type && i >= 4) {
        const c = candles.slice(i - 4, i + 1);
        const highs = c.map(x => x.high);
        const lows = c.map(x => x.low);
        const maxLow = Math.max(...lows);
        const minLow = Math.min(...lows);
        // fundo horizontal e topos descendentes
        if (maxLow - minLow < maxLow * 0.005 && highs[4] < highs[0] && highs[3] < highs[1]) {
          type = 'SELL';
          pattern = 'Triângulo Descendente';
        }
      }
      // RSI sobrevendido tocando zero
      if (!type && i >= 14) {
        const closes = candles.slice(i - 14, i + 1).map(c => c.close);
        const rsi = this.calculateRSI(closes, 14);
        if (rsi < 10) {
          type = 'BUY';
          pattern = 'RSI Sobrevendido';
        }
      }
      if (type) {
        // Parâmetros do trade
        const entryPrice = last.close;
        const targetPercent = type === 'BUY' ? 0.015 : -0.015;
        const stopPercent = type === 'BUY' ? -0.01 : 0.01;
        const targetPrice = entryPrice * (1 + targetPercent);
        const stopLoss = entryPrice * (1 + stopPercent);
        // Indicadores neutros para compatibilidade
        const emptyIndicators: TechnicalIndicators = {
          ema12: entryPrice,
          ema26: entryPrice,
          ema50: entryPrice,
          rsi: 50,
          stochastic: { k: 50, d: 50 },
          bollingerBands: { upper: entryPrice, middle: entryPrice, lower: entryPrice },
          macd: { macd: 0, signal: 0, histogram: 0 },
          volatility: 0,
          volumeProfile: 1
        };
        return {
          id: `${symbol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          type,
          entryPrice,
          targetPrice,
          stopLoss,
          confidence: 70,
          timestamp: new Date(),
          timeframe,
          expectedGain: Math.abs(targetPercent * 100),
          btcCorrelation: 0,
          status: 'PENDING',
          indicators: emptyIndicators,
          reason: `Padrão de candle detectado: ${pattern}`
        };
      }
    }
    return null;
  }
  calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((sum, price) => sum + price, 0) / period;
  }

  calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(prices.slice(0, period), period);
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;
    
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      const difference = prices[i] - prices[i - 1];
      gains.push(difference > 0 ? difference : 0);
      losses.push(difference < 0 ? Math.abs(difference) : 0);
    }
    
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;
    
    // Use Wilder's smoothing for more accurate RSI
    for (let i = period; i < gains.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
    }
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  calculateStochastic(candles: Candle[], kPeriod: number = 14, dPeriod: number = 3): { k: number; d: number } {
    if (candles.length < kPeriod) return { k: 50, d: 50 };
    
    const recentCandles = candles.slice(-kPeriod);
    const currentClose = candles[candles.length - 1].close;
    const highestHigh = Math.max(...recentCandles.map(c => c.high));
    const lowestLow = Math.min(...recentCandles.map(c => c.low));
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    // Calculate %D as SMA of %K values
    const kValues = [];
    for (let i = Math.max(0, candles.length - dPeriod); i < candles.length; i++) {
      const periodCandles = candles.slice(Math.max(0, i - kPeriod + 1), i + 1);
      if (periodCandles.length === kPeriod) {
        const periodHigh = Math.max(...periodCandles.map(c => c.high));
        const periodLow = Math.min(...periodCandles.map(c => c.low));
        kValues.push(((periodCandles[periodCandles.length - 1].close - periodLow) / (periodHigh - periodLow)) * 100);
      }
    }
    
    const d = kValues.length > 0 ? kValues.reduce((sum, val) => sum + val, 0) / kValues.length : k;
    
    return { k, d };
  }

  calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number } {
    if (prices.length < period) {
      const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const deviation = avg * 0.02;
      return { upper: avg + deviation, middle: avg, lower: avg - deviation };
    }
    
    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    };
  }

  calculateMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): { macd: number; signal: number; histogram: number } {
    const emaFast = this.calculateEMA(prices, fastPeriod);
    const emaSlow = this.calculateEMA(prices, slowPeriod);
    const macd = emaFast - emaSlow;
    
    // Calculate signal line (EMA of MACD)
    const macdValues = [];
    for (let i = slowPeriod; i <= prices.length; i++) {
      const periodPrices = prices.slice(0, i);
      const periodEmaFast = this.calculateEMA(periodPrices, fastPeriod);
      const periodEmaSlow = this.calculateEMA(periodPrices, slowPeriod);
      macdValues.push(periodEmaFast - periodEmaSlow);
    }
    
    const signal = this.calculateEMA(macdValues, signalPeriod);
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
  }

  calculateVolatility(candles: Candle[]): number {
    if (candles.length < 2) return 0;
    
    const returns = candles.slice(1).map((candle, i) => 
      Math.log(candle.close / candles[i].close)
    );
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(365) * 100; // Annualized volatility
  }

  calculateVolumeProfile(candles: Candle[]): number {
    if (candles.length < 10) return 1;
    
    const recentVolumes = candles.slice(-10).map(c => c.volume);
    const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
    const currentVolume = candles[candles.length - 1].volume;
    
    return currentVolume / avgVolume;
  }

  analyzeIndicators(candles: Candle[]): TechnicalIndicators {
  const prices = candles.map(c => c.close);
    
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const ema50 = this.calculateEMA(prices, 50);
    const rsi = this.calculateRSI(prices);
    const stochastic = this.calculateStochastic(candles);
    const bollingerBands = this.calculateBollingerBands(prices);
    const macd = this.calculateMACD(prices);
    
    return {
      ema12,
      ema26,
      ema50,
      rsi,
      stochastic,
      bollingerBands,
      macd,
      volatility: this.calculateVolatility(candles),
      volumeProfile: this.calculateVolumeProfile(candles)
    };
  }

  generateSignal(
    symbol: string, 
    candles: Candle[], 
    indicators: TechnicalIndicators,
    btcCorrelation: number,
    timeframe: string
  ): Signal | null {
    if (candles.length < 50) return null; // Need enough data for accurate analysis
    
    const currentPrice = candles[candles.length - 1].close;
    const prevPrice = candles[candles.length - 2].close;
    const priceChange = (currentPrice - prevPrice) / prevPrice * 100;
    
  let signalType: 'BUY' | 'SELL' | null = null;
  let confidence = 0;
  const reasons: string[] = [];
    
    // Advanced EMA Analysis
    const emaAlignment = indicators.ema12 > indicators.ema26 && indicators.ema26 > indicators.ema50;
    const emaBearish = indicators.ema12 < indicators.ema26 && indicators.ema26 < indicators.ema50;
    
    if (emaAlignment) {
      confidence += 25;
      signalType = 'BUY';
      reasons.push('Alinhamento altista das EMAs (12>26>50)');
    } else if (emaBearish) {
      confidence += 25;
      signalType = 'SELL';
      reasons.push('Alinhamento baixista das EMAs (12<26<50)');
    }
    
    // Enhanced RSI Analysis
    if (indicators.rsi < 25) {
      confidence += 30;
      if (signalType !== 'SELL') signalType = 'BUY';
      reasons.push(`RSI extremamente sobrevendido (${indicators.rsi.toFixed(1)})`);
    } else if (indicators.rsi > 75) {
      confidence += 30;
      if (signalType !== 'BUY') signalType = 'SELL';
      reasons.push(`RSI extremamente sobrecomprado (${indicators.rsi.toFixed(1)})`);
    } else if (indicators.rsi < 35 && signalType === 'BUY') {
      confidence += 15;
      reasons.push(`RSI sugere suporte (sobrevendido) (${indicators.rsi.toFixed(1)})`);
    } else if (indicators.rsi > 65 && signalType === 'SELL') {
      confidence += 15;
      reasons.push(`RSI sugere resistência (sobrecomprado) (${indicators.rsi.toFixed(1)})`);
    }
    
    // Advanced Stochastic Analysis
    const stochOversold = indicators.stochastic.k < 20 && indicators.stochastic.d < 20;
    const stochOverbought = indicators.stochastic.k > 80 && indicators.stochastic.d > 80;
    const stochBullishCross = indicators.stochastic.k > indicators.stochastic.d && indicators.stochastic.k < 50;
    const stochBearishCross = indicators.stochastic.k < indicators.stochastic.d && indicators.stochastic.k > 50;
    
    if (stochOversold) {
      confidence += 20;
      if (signalType !== 'SELL') signalType = 'BUY';
      reasons.push('Estocástico em zona de sobrevenda');
    } else if (stochOverbought) {
      confidence += 20;
      if (signalType !== 'BUY') signalType = 'SELL';
      reasons.push('Estocástico em zona de sobrecompra');
    } else if (stochBullishCross && signalType === 'BUY') {
      confidence += 15;
      reasons.push('Cruzamento altista do Estocástico');
    } else if (stochBearishCross && signalType === 'SELL') {
      confidence += 15;
      reasons.push('Cruzamento baixista do Estocástico');
    }
    
    // Bollinger Bands Analysis
    const bbPosition = (currentPrice - indicators.bollingerBands.lower) / 
                      (indicators.bollingerBands.upper - indicators.bollingerBands.lower);
    
    if (bbPosition <= 0.1) {
      confidence += 25;
      if (signalType !== 'SELL') signalType = 'BUY';
      reasons.push('Preço na banda inferior de Bollinger');
    } else if (bbPosition >= 0.9) {
      confidence += 25;
      if (signalType !== 'BUY') signalType = 'SELL';
      reasons.push('Preço na banda superior de Bollinger');
    }
    
    // MACD Analysis
    const macdBullish = indicators.macd.macd > indicators.macd.signal && indicators.macd.histogram > 0;
    const macdBearish = indicators.macd.macd < indicators.macd.signal && indicators.macd.histogram < 0;
    
    if (macdBullish && signalType === 'BUY') {
      confidence += 20;
      reasons.push('Sinal altista do MACD');
    } else if (macdBearish && signalType === 'SELL') {
      confidence += 20;
      reasons.push('Sinal baixista do MACD');
    }
    
    // Volume Analysis
    if (indicators.volumeProfile > 1.5) {
      confidence += 15;
      reasons.push(`Confirmação por alto volume (${indicators.volumeProfile.toFixed(1)}x média)`);
    } else if (indicators.volumeProfile < 0.5) {
      confidence -= 10;
      reasons.push('Aviso: volume baixo');
    }
    
    // Volatility Analysis
    if (indicators.volatility > 100) {
      confidence -= 15;
      reasons.push('Risco: volatilidade elevada');
    } else if (indicators.volatility < 30) {
      confidence += 10;
      reasons.push('Ambiente de baixa volatilidade');
    }
    
    // BTC Correlation Analysis
    if (Math.abs(btcCorrelation) > 0.8) {
      confidence += 15;
      reasons.push(`Forte correlação com o BTC (${(btcCorrelation * 100).toFixed(1)}%)`);
    } else if (Math.abs(btcCorrelation) < 0.3) {
      confidence += 10;
      reasons.push('Movimento independente do BTC');
    }
    
    // Price Action Analysis
    const momentum = Math.abs(priceChange);
  if (momentum > 2) {
      if ((priceChange > 0 && signalType === 'BUY') || (priceChange < 0 && signalType === 'SELL')) {
        confidence += 15;
    reasons.push(`Momentum forte (${priceChange.toFixed(2)}%)`);
      } else {
        confidence -= 10;
    reasons.push('Momentum conflitante');
      }
    }
    
    // Multi-timeframe confirmation (simulated)
    const trendStrength = this.calculateTrendStrength(candles);
    if (trendStrength > 0.7 && signalType === 'BUY') {
      confidence += 20;
      reasons.push('Confirmação de forte tendência de alta');
    } else if (trendStrength < -0.7 && signalType === 'SELL') {
      confidence += 20;
      reasons.push('Confirmação de forte tendência de baixa');
    }
    
    // Minimum confidence threshold
    if (!signalType || confidence < 65) return null;
    
    // Ajusta o alvo conforme o timeframe
    const timeframeTargetMap: Record<string, number> = {
      '1m': 0.01, '3m': 0.012, '5m': 0.015, '15m': 0.018, '30m': 0.02,
      '1h': 0.025, '2h': 0.03, '4h': 0.04, '6h': 0.05, '8h': 0.06, '12h': 0.07,
      '1d': 0.10, '3d': 0.15, '1w': 0.20, '1M': 0.30
    };
    const timeframeStopMap: Record<string, number> = {
      '1m': 0.008, '3m': 0.01, '5m': 0.012, '15m': 0.014, '30m': 0.015,
      '1h': 0.018, '2h': 0.02, '4h': 0.025, '6h': 0.03, '8h': 0.035, '12h': 0.04,
      '1d': 0.05, '3d': 0.07, '1w': 0.10, '1M': 0.15
    };
    const baseTargetPercent = timeframeTargetMap[timeframe] ?? 0.02;
    const baseStopPercent = timeframeStopMap[timeframe] ?? 0.015;
    // Volatilidade ainda influencia levemente
    const volatilityMultiplier = Math.min(indicators.volatility / 50, 2);
    const targetPercent = baseTargetPercent + (volatilityMultiplier * 0.005);
    const stopPercent = baseStopPercent + (volatilityMultiplier * 0.003);
    const targetMultiplier = signalType === 'BUY' ? (1 + targetPercent) : (1 - targetPercent);
    const stopMultiplier = signalType === 'BUY' ? (1 - stopPercent) : (1 + stopPercent);
    // Ensure target and stop are different from entry
    const targetPrice = currentPrice * targetMultiplier;
    const stopLoss = currentPrice * stopMultiplier;
    
    // Validate prices are different
    if (Math.abs(targetPrice - currentPrice) < currentPrice * 0.005 || 
        Math.abs(stopLoss - currentPrice) < currentPrice * 0.005) {
      return null; // Skip if prices are too close
    }
    
    return {
      id: `${symbol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      type: signalType,
      entryPrice: currentPrice,
      targetPrice,
      stopLoss,
      confidence: Math.min(confidence, 95),
      timestamp: new Date(),
      timeframe,
      expectedGain: Math.abs((targetPrice - currentPrice) / currentPrice * 100),
      btcCorrelation,
      status: 'PENDING',
      indicators,
      reason: reasons.join(', ')
    };
  }

  calculateTrendStrength(candles: Candle[]): number {
    if (candles.length < 20) return 0;
    
    const prices = candles.map(c => c.close);
    const ema20 = this.calculateEMA(prices, 20);
    const ema50 = this.calculateEMA(prices, 50);
    
    const currentPrice = prices[prices.length - 1];
    const priceVsEma20 = (currentPrice - ema20) / ema20;
    const emaAlignment = (ema20 - ema50) / ema50;
    
    return (priceVsEma20 + emaAlignment) / 2;
  }

  calculateBTCCorrelation(symbolCandles: Candle[], btcCandles: Candle[]): number {
    const minLength = Math.min(symbolCandles.length, btcCandles.length);
    if (minLength < 20) return 0;
    
    const symbolPrices = symbolCandles.slice(-minLength).map(c => c.close);
    const btcPrices = btcCandles.slice(-minLength).map(c => c.close);
    
    const symbolReturns = symbolPrices.slice(1).map((price, i) => 
      Math.log(price / symbolPrices[i])
    );
    
    const btcReturns = btcPrices.slice(1).map((price, i) => 
      Math.log(price / btcPrices[i])
    );
    
    // Pearson correlation coefficient
    const n = symbolReturns.length;
    if (n < 10) return 0;
    
    const sumX = symbolReturns.reduce((sum, x) => sum + x, 0);
    const sumY = btcReturns.reduce((sum, y) => sum + y, 0);
    const sumXY = symbolReturns.reduce((sum, x, i) => sum + x * btcReturns[i], 0);
    const sumX2 = symbolReturns.reduce((sum, x) => sum + x * x, 0);
    const sumY2 = btcReturns.reduce((sum, y) => sum + y * y, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : Math.max(-1, Math.min(1, numerator / denominator));
  }

  findSupportResistance(candles: Candle[]): { support: number; resistance: number } {
    if (candles.length < 20) {
      const currentPrice = candles[candles.length - 1].close;
      return { support: currentPrice * 0.98, resistance: currentPrice * 1.02 };
    }
    
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    
    // Find recent significant highs and lows
    const recentHighs = highs.slice(-20).sort((a, b) => b - a);
    const recentLows = lows.slice(-20).sort((a, b) => a - b);
    
    const resistance = recentHighs.slice(0, 3).reduce((sum, high) => sum + high, 0) / 3;
    const support = recentLows.slice(0, 3).reduce((sum, low) => sum + low, 0) / 3;
    
    return { support, resistance };
  }
}