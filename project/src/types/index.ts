export interface CryptoPair {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  rank: number;
}

export interface TechnicalIndicators {
  ema12: number;
  ema26: number;
  ema50: number;
  rsi: number;
  stochastic: {
    k: number;
    d: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  volatility: number;
  volumeProfile: number;
}

export interface Signal {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  confidence: number;
  timestamp: Date;
  timeframe: string;
  expectedGain: number;
  btcCorrelation: number;
  status: 'PENDING' | 'WIN' | 'LOSS' | 'ACTIVE';
  indicators: TechnicalIndicators;
  reason: string;
}

export interface PerformanceStats {
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number;
  totalProfit: number;
  avgGain: number;
  avgLoss: number;
}

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M';

export interface ImageAnalysisResult {
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  patterns: string[];
  recommendation: string;
}