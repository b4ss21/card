import { Candle, TechnicalIndicators, Signal } from '../types';

export class TechnicalAnalysisService {
  private _indicatorsSummary(ind: TechnicalIndicators): string {
    return ` | EMA12: ${ind.ema12?.toFixed(2)}, EMA26: ${ind.ema26?.toFixed(2)}, EMA50: ${ind.ema50?.toFixed(2)} | RSI: ${ind.rsi?.toFixed(1)} | Stoch: K=${ind.stochastic?.k?.toFixed(1)}, D=${ind.stochastic?.d?.toFixed(1)} | BB: [${ind.bollingerBands?.lower?.toFixed(2)}, ${ind.bollingerBands?.middle?.toFixed(2)}, ${ind.bollingerBands?.upper?.toFixed(2)}] | MACD: ${ind.macd?.macd?.toFixed(2)}, Sinal: ${ind.macd?.signal?.toFixed(2)}, Hist: ${ind.macd?.histogram?.toFixed(2)} | Volatilidade: ${ind.volatility?.toFixed(2)}`;
  }
  // Detecta padrões simples de candles (exemplo: martelo, engolfo de alta/baixa)
  detectCandlePattern(candles: Candle[], symbol: string, timeframe: string, minConfidence: number): Signal[] {
    if (candles.length < 5) return [];
    // Cálculo do tamanho/volume médio dos candles
    const avgCandleSize = candles.reduce((sum, c) => sum + (c.high - c.low), 0) / candles.length;
    const avgVolume = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;
    // Ajuste do target/stop conforme timeframe e tamanho/volume
    const stablecoins = ['USDCUSDT', 'BUSDUSDT', 'USDTUSDT', 'TUSDUSDT', 'USDPUSDT', 'DAIUSDT', 'FDUSDUSDT', 'EURUSDT', 'USDEUSDT'];
    const isStable = stablecoins.includes(symbol.toUpperCase());
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
    let baseTargetPercent = timeframeTargetMap[timeframe] ?? 0.02;
    let baseStopPercent = timeframeStopMap[timeframe] ?? 0.015;
    // Limite para stablecoins: máximo 2%
    if (isStable) {
      baseTargetPercent = Math.min(baseTargetPercent, 0.02);
      baseStopPercent = Math.min(baseStopPercent, 0.02);
    }
    // Ajuste extra pelo tamanho/volume
    const sizeMultiplier = Math.min(avgCandleSize / (candles[0].close * 0.01), 3); // candle médio em relação a 1% do preço
    const volumeMultiplier = Math.min(avgVolume / (candles[0].volume || 1), 3);
    let targetPercent = baseTargetPercent * (1 + 0.2 * sizeMultiplier + 0.1 * volumeMultiplier);
    let stopPercent = baseStopPercent * (1 + 0.2 * sizeMultiplier);
    // Limite final para stablecoins: nunca maior que 2%
    if (isStable) {
      targetPercent = Math.min(targetPercent, 0.02);
      stopPercent = Math.min(stopPercent, 0.02);
    }
    // Analisa a janela inteira, não candle a candle
    const signals: Signal[] = [];
    // Martelo (Hammer) - busca se existe pelo menos um martelo na janela
    const hammerIdx = candles.findIndex((c, i) => {
      if (i < 4) return false;
      const body = Math.abs(c.close - c.open);
      const candleSize = c.high - c.low;
      const lowerShadow = c.open < c.close ? c.open - c.low : c.close - c.low;
      const upperShadow = c.high - (c.open > c.close ? c.open : c.close);
      return body < candleSize * 0.4 && lowerShadow > body * 2 && upperShadow < body;
    });
    if (hammerIdx !== -1) {
  const c = candles[hammerIdx];
  const entryPrice = c.close;
  let targetPrice = entryPrice * (1 + Math.abs(targetPercent));
  let stopLoss = entryPrice * (1 - Math.abs(stopPercent));
  // Coerência global
  if (targetPrice <= entryPrice) targetPrice = entryPrice * 1.02;
  if (stopLoss >= entryPrice) stopLoss = entryPrice * 0.98;
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
      if (65 >= minConfidence) {
        signals.push({
          id: `${symbol}-hammer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          type: 'BUY',
          entryPrice,
          targetPrice,
          stopLoss,
          confidence: 65,
          timestamp: new Date(),
          timeframe,
          expectedGain: Math.abs((targetPrice - entryPrice) / entryPrice * 100),
          btcCorrelation: 0,
          status: 'PENDING',
          indicators: emptyIndicators,
          reason: 'Martelo detectado. Possível reversão de tendência.' + this._indicatorsSummary(emptyIndicators)
        });
      }
    }
    // Engolfo de Alta
    const bullishIdx = candles.findIndex((c, i) => {
      if (i < 4) return false;
      const prev = candles[i - 1];
      return prev.close < prev.open && c.close > c.open && c.open < prev.close && c.close > prev.open;
    });
    if (bullishIdx !== -1) {
      const c = candles[bullishIdx];
  const entryPrice = c.close;
  let targetPrice = entryPrice * (1 + Math.abs(targetPercent));
  let stopLoss = entryPrice * (1 - Math.abs(stopPercent));
  if (targetPrice <= entryPrice) targetPrice = entryPrice * 1.02;
  if (stopLoss >= entryPrice) stopLoss = entryPrice * 0.98;
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
      if (70 >= minConfidence) {
        signals.push({
          id: `${symbol}-bullish-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          type: 'BUY',
          entryPrice,
          targetPrice,
          stopLoss,
          confidence: 70,
          timestamp: new Date(),
          timeframe,
          expectedGain: Math.abs((targetPrice - entryPrice) / entryPrice * 100),
          btcCorrelation: 0,
          status: 'PENDING',
          indicators: emptyIndicators,
          reason: 'Engolfo de Alta detectado. Possível reversão para alta.' + this._indicatorsSummary(emptyIndicators)
        });
      }
    }
    // Engolfo de Baixa
    const bearishIdx = candles.findIndex((c, i) => {
      if (i < 4) return false;
      const prev = candles[i - 1];
      return prev.close > prev.open && c.close < c.open && c.open > prev.close && c.close < prev.open;
    });
    if (bearishIdx !== -1) {
      const c = candles[bearishIdx];
  const entryPrice = c.close;
  let targetPrice = entryPrice * (1 - Math.abs(targetPercent));
  let stopLoss = entryPrice * (1 + Math.abs(stopPercent));
  if (targetPrice >= entryPrice) targetPrice = entryPrice * 0.98;
  if (stopLoss <= entryPrice) stopLoss = entryPrice * 1.02;
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
      if (70 >= minConfidence) {
        signals.push({
          id: `${symbol}-bearish-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          type: 'SELL',
          entryPrice,
          targetPrice,
          stopLoss,
          confidence: 70,
          timestamp: new Date(),
          timeframe,
          expectedGain: Math.abs((targetPrice - entryPrice) / entryPrice * 100),
          btcCorrelation: 0,
          status: 'PENDING',
          indicators: emptyIndicators,
          reason: 'Engolfo de Baixa detectado. Possível reversão para baixa.' + this._indicatorsSummary(emptyIndicators)
        });
      }
    }
    // Topo Duplo
    const topoIdx = candles.findIndex((c, i) => {
      if (i < 4) return false;
      const high1 = candles[i - 4].high;
      const high2 = candles[i - 2].high;
      const highNow = c.high;
      return Math.abs(high1 - high2) / high1 < 0.01 && Math.abs(high2 - highNow) / high2 < 0.01;
    });
    if (topoIdx !== -1) {
      const c = candles[topoIdx];
  const entryPrice = c.close;
  let targetPrice = entryPrice * (1 - Math.abs(targetPercent));
  let stopLoss = entryPrice * (1 + Math.abs(stopPercent));
  if (targetPrice >= entryPrice) targetPrice = entryPrice * 0.98;
  if (stopLoss <= entryPrice) stopLoss = entryPrice * 1.02;
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
      if (80 >= minConfidence) {
        signals.push({
          id: `${symbol}-topo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          type: 'SELL',
          entryPrice,
          targetPrice,
          stopLoss,
          confidence: 80,
          timestamp: new Date(),
          timeframe,
          expectedGain: Math.abs((targetPrice - entryPrice) / entryPrice * 100),
          btcCorrelation: 0,
          status: 'PENDING',
          indicators: emptyIndicators,
          reason: 'Topo Duplo detectado. Possível reversão para baixa.' + this._indicatorsSummary(emptyIndicators)
        });
      }
    }
    // Fundo Duplo
    const fundoIdx = candles.findIndex((c, i) => {
      if (i < 4) return false;
      const low1 = candles[i - 4].low;
      const low2 = candles[i - 2].low;
      const lowNow = c.low;
      return Math.abs(low1 - low2) / low1 < 0.01 && Math.abs(low2 - lowNow) / low2 < 0.01;
    });
    if (fundoIdx !== -1) {
      const c = candles[fundoIdx];
  const entryPrice = c.close;
  let targetPrice = entryPrice * (1 + Math.abs(targetPercent));
  let stopLoss = entryPrice * (1 - Math.abs(stopPercent));
  if (targetPrice <= entryPrice) targetPrice = entryPrice * 1.02;
  if (stopLoss >= entryPrice) stopLoss = entryPrice * 0.98;
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
      if (80 >= minConfidence) {
        signals.push({
          id: `${symbol}-fundo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          type: 'BUY',
          entryPrice,
          targetPrice,
          stopLoss,
          confidence: 80,
          timestamp: new Date(),
          timeframe,
          expectedGain: Math.abs((targetPrice - entryPrice) / entryPrice * 100),
          btcCorrelation: 0,
          status: 'PENDING',
          indicators: emptyIndicators,
          reason: 'Fundo Duplo detectado. Possível reversão para alta.' + this._indicatorsSummary(emptyIndicators)
        });
      }
    }
    // Triângulo Ascendente
    const triAscIdx = candles.findIndex((c, i) => {
      if (i < 4) return false;
      const cands = candles.slice(i - 4, i + 1);
      const highs = cands.map(x => x.high);
      const lows = cands.map(x => x.low);
      const maxHigh = Math.max(...highs);
      const minHigh = Math.min(...highs);
      return maxHigh - minHigh < maxHigh * 0.005 && lows[4] > lows[0] && lows[3] > lows[1];
    });
    if (triAscIdx !== -1) {
      const c = candles[triAscIdx];
  const entryPrice = c.close;
  let targetPrice = entryPrice * (1 + targetPercent);
  let stopLoss = entryPrice * (1 - stopPercent);
  if (targetPrice <= entryPrice) targetPrice = entryPrice * 1.02;
  if (stopLoss >= entryPrice) stopLoss = entryPrice * 0.98;
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
      if (75 >= minConfidence) {
        signals.push({
          id: `${symbol}-triAsc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          type: 'BUY',
          entryPrice,
          targetPrice,
          stopLoss,
          confidence: 75,
          timestamp: new Date(),
          timeframe,
          expectedGain: Math.abs((targetPrice - entryPrice) / entryPrice * 100),
          btcCorrelation: 0,
          status: 'PENDING',
          indicators: emptyIndicators,
          reason: `Padrão de candle detectado: Triângulo Ascendente`
        });
      }
    }
    // Triângulo Descendente
    const triDescIdx = candles.findIndex((c, i) => {
      if (i < 4) return false;
      const cands = candles.slice(i - 4, i + 1);
      const highs = cands.map(x => x.high);
      const lows = cands.map(x => x.low);
      const maxLow = Math.max(...lows);
      const minLow = Math.min(...lows);
      return maxLow - minLow < maxLow * 0.005 && highs[4] < highs[0] && highs[3] < highs[1];
    });
    if (triDescIdx !== -1) {
      const c = candles[triDescIdx];
  const entryPrice = c.close;
  let targetPrice = entryPrice * (1 - targetPercent);
  let stopLoss = entryPrice * (1 + stopPercent);
  if (targetPrice >= entryPrice) targetPrice = entryPrice * 0.98;
  if (stopLoss <= entryPrice) stopLoss = entryPrice * 1.02;
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
      if (75 >= minConfidence) {
        signals.push({
          id: `${symbol}-triDesc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          type: 'SELL',
          entryPrice,
          targetPrice,
          stopLoss,
          confidence: 75,
          timestamp: new Date(),
          timeframe,
          expectedGain: Math.abs((targetPrice - entryPrice) / entryPrice * 100),
          btcCorrelation: 0,
          status: 'PENDING',
          indicators: emptyIndicators,
          reason: `Padrão de candle detectado: Triângulo Descendente`
        });
      }
    }
    // RSI Sobrevendido
    const rsiIdx = candles.findIndex((c, i) => {
      if (i < 14) return false;
      const closes = candles.slice(i - 14, i + 1).map(c => c.close);
      const rsi = this.calculateRSI(closes, 14);
      return rsi < 10;
    });
    if (rsiIdx !== -1) {
  const c = candles[rsiIdx];
  const entryPrice = c.close;
  let targetPrice = entryPrice * (1 + targetPercent);
  let stopLoss = entryPrice * (1 - stopPercent);
  if (targetPrice <= entryPrice) targetPrice = entryPrice * 1.02;
  if (stopLoss >= entryPrice) stopLoss = entryPrice * 0.98;
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
      if (60 >= minConfidence) {
        signals.push({
          id: `${symbol}-rsi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          type: 'BUY',
          entryPrice,
          targetPrice,
          stopLoss,
          confidence: 60,
          timestamp: new Date(),
          timeframe,
          expectedGain: Math.abs((targetPrice - entryPrice) / entryPrice * 100),
          btcCorrelation: 0,
          status: 'PENDING',
          indicators: emptyIndicators,
          reason: `Padrão de candle detectado: RSI Sobrevendido`
        });
      }
    }
    return signals;
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

    // Critérios de confluência
    let criteriaMet = 0;
    let totalCriteria = 0;

    // EMA
    totalCriteria++;
    const emaAlignment = indicators.ema12 > indicators.ema26 && indicators.ema26 > indicators.ema50;
    const emaBearish = indicators.ema12 < indicators.ema26 && indicators.ema26 < indicators.ema50;
    if (emaAlignment) {
      criteriaMet++;
      signalType = 'BUY';
      reasons.push('Alinhamento altista das EMAs (12>26>50)');
    } else if (emaBearish) {
      criteriaMet++;
      signalType = 'SELL';
      reasons.push('Alinhamento baixista das EMAs (12<26<50)');
    }

    // RSI
    totalCriteria++;
    if (indicators.rsi < 25) {
      criteriaMet++;
      if (signalType !== 'SELL') signalType = 'BUY';
      reasons.push(`RSI extremamente sobrevendido (${indicators.rsi.toFixed(1)})`);
    } else if (indicators.rsi > 75) {
      criteriaMet++;
      if (signalType !== 'BUY') signalType = 'SELL';
      reasons.push(`RSI extremamente sobrecomprado (${indicators.rsi.toFixed(1)})`);
    }

    // MACD
    totalCriteria++;
    const macdBullish = indicators.macd.macd > indicators.macd.signal && indicators.macd.histogram > 0;
    const macdBearish = indicators.macd.macd < indicators.macd.signal && indicators.macd.histogram < 0;
    if (macdBullish && signalType === 'BUY') {
      criteriaMet++;
      reasons.push('Sinal altista do MACD');
    } else if (macdBearish && signalType === 'SELL') {
      criteriaMet++;
      reasons.push('Sinal baixista do MACD');
    }

    // Volume
    totalCriteria++;
    if (indicators.volumeProfile > 1.5) {
      criteriaMet++;
      reasons.push(`Confirmação por alto volume (${indicators.volumeProfile.toFixed(1)}x média)`);
    }

    // Price Action (momentum)
    totalCriteria++;
    const momentum = Math.abs(priceChange);
    if (momentum > 2) {
      criteriaMet++;
      reasons.push(`Momentum forte (${priceChange.toFixed(2)}%)`);
    }

    // Score dinâmico: cada critério vale 20 pontos
    confidence = Math.min(20 * criteriaMet, 95);
    if (confidence < 60 || !signalType) return null;
    
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
    let targetMultiplier = signalType === 'BUY' ? (1 + targetPercent) : (1 - targetPercent);
    let stopMultiplier = signalType === 'BUY' ? (1 - stopPercent) : (1 + stopPercent);
    let targetPrice = currentPrice * targetMultiplier;
    let stopLoss = currentPrice * stopMultiplier;
    // Correção global: garantir coerência
    if (signalType === 'BUY') {
      if (targetPrice <= currentPrice) targetPrice = currentPrice * 1.02;
      if (stopLoss >= currentPrice) stopLoss = currentPrice * 0.98;
    } else if (signalType === 'SELL') {
      if (targetPrice >= currentPrice) targetPrice = currentPrice * 0.98;
      if (stopLoss <= currentPrice) stopLoss = currentPrice * 1.02;
    }
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