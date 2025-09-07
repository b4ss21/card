// Tipos globais para análise técnica e candles

export type Timeframe =
  | '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M';

export type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Signal = {
  id: string;
  symbol: string;
  confidence: number;
  direction: 'BUY' | 'SELL';
  expectedGain: number;
  status: 'PENDING' | 'WIN' | 'LOSS';
  timeframe: Timeframe;
  createdAt: number;
  indicators?: any;
  btcCorrelation?: number;
};

export type CryptoPair = {
  symbol: string;
};

export type PerformanceStats = {
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number;
  totalProfit: number;
  avgGain: number;
  avgLoss: number;
};

export type ImageAnalysisResult = {
  label: string;
  confidence: number;
};
