

import { CryptoPair, Candle, Timeframe } from '../types';

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';

export class BinanceService {
  public async getTickerPrice(symbol: string): Promise<{ price: string }> {
    try {
      const response = await fetch(`${BINANCE_API_BASE}/ticker/price?symbol=${symbol}`);
      const data = await response.json();
      return { price: data.price };
    } catch (error) {
      console.error('Error fetching ticker price:', error);
      return { price: '0' };
    }
  }
  private static instance: BinanceService;

  public static getInstance(): BinanceService {
    if (!BinanceService.instance) {
      BinanceService.instance = new BinanceService();
    }
    return BinanceService.instance;
  }

  // Busca o máximo de candles possível para o símbolo/timeframe (paginando)
  async getAllKlineData(symbol: string, interval: Timeframe): Promise<Candle[]> {
    const maxPerRequest = 1000;
    let allCandles: Candle[] = [];
    let fetchMore = true;
    let endTime: number | undefined = undefined;
    try {
      while (fetchMore) {
        let url = `${BINANCE_API_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${maxPerRequest}`;
        if (endTime) url += `&endTime=${endTime}`;
        const response = await fetch(url);
        const data: unknown = await response.json();
        const candles = (data as string[][]).map((kline) => ({
          timestamp: Number(kline[0]),
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          close: parseFloat(kline[4]),
          volume: parseFloat(kline[5])
        }));
        if (candles.length === 0) break;
        // Evita duplicidade do último candle
        if (allCandles.length > 0 && candles.length > 1) {
          candles.pop();
        }
        allCandles = [...candles, ...allCandles];
        if (candles.length < maxPerRequest) {
          fetchMore = false;
        } else {
          endTime = candles[0].timestamp - 1;
        }
      }
      return allCandles;
    } catch (error) {
      console.error('Error fetching all kline data:', error);
      return allCandles;
    }
  }

  async getTop500USDTPairs(): Promise<CryptoPair[]> {
    try {
      const response = await fetch(`${BINANCE_API_BASE}/ticker/24hr`);
      const data = await response.json();
      
      type Ticker24hr = {
        symbol: string;
        lastPrice: string;
        priceChangePercent: string;
        quoteVolume: string;
      };

      const usdtPairs = (data as Ticker24hr[])
        .filter((ticker) => ticker.symbol.endsWith('USDT'))
        .filter((ticker) => parseFloat(ticker.quoteVolume) > 1000000) // Filter by volume
        .map((ticker, index: number) => ({
          symbol: ticker.symbol,
          price: parseFloat(ticker.lastPrice),
          change24h: parseFloat(ticker.priceChangePercent),
          volume: parseFloat(ticker.quoteVolume),
          rank: index + 1
        }))
        .sort((a: CryptoPair, b: CryptoPair) => b.volume - a.volume)
        .slice(0, 500);

      return usdtPairs;
    } catch (error) {
      console.error('Error fetching crypto pairs:', error);
      return this.getMockData();
    }
  }

  async getMultiplePairData(symbols: string[], interval: Timeframe, limit: number = 100): Promise<Map<string, string[][]>> {
    const results = new Map<string, string[][]>();
    
    try {
      // Use batch requests for better performance
      const batchSize = 10;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const promises = batch.map(symbol => 
          fetch(`${BINANCE_API_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`)
            .then(res => res.json())
            .then((data: unknown) => ({ symbol, data }))
            .catch(error => ({ symbol, error }))
        );
        
        const batchResults = await Promise.all(promises);
        
        batchResults.forEach(result => {
          if (!('error' in result) && Array.isArray(result.data)) {
            // data é um array de arrays de strings/números vindos da API
            results.set(result.symbol, result.data as string[][]);
          }
        });
        
        // Small delay between batches to respect rate limits
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    } catch (error) {
      console.error('Error in batch request:', error);
    }
    
    return results;
  }
  async getKlineData(symbol: string, interval: Timeframe, limit: number = 100): Promise<Candle[]> {
    try {
      const response = await fetch(
        `${BINANCE_API_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      );
      const data: unknown = await response.json();
      
      return (data as string[][]).map((kline) => ({
        timestamp: Number(kline[0]),
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5])
      }));
    } catch (error) {
      console.error('Error fetching kline data:', error);
      return this.getMockKlineData();
    }
  }

  async getBTCPrice(): Promise<number> {
    try {
      const response = await fetch(`${BINANCE_API_BASE}/ticker/price?symbol=BTCUSDT`);
      const data = await response.json();
      return parseFloat(data.price);
    } catch (error) {
      console.error('Error fetching BTC price:', error);
      return 45000; // Mock BTC price
    }
  }

  private getMockData(): CryptoPair[] {
    const mockPairs = [
      { symbol: 'BTCUSDT', price: 45000, change24h: 2.5, volume: 1000000, rank: 1 },
      { symbol: 'ETHUSDT', price: 2800, change24h: -1.2, volume: 800000, rank: 2 },
      { symbol: 'ADAUSDT', price: 0.45, change24h: 3.8, volume: 600000, rank: 3 },
      { symbol: 'SOLUSDT', price: 95, change24h: 5.2, volume: 500000, rank: 4 },
      { symbol: 'DOTUSDT', price: 6.2, change24h: -2.1, volume: 400000, rank: 5 }
    ];
    
    // Generate more mock data
    const symbols = ['LINK', 'AVAX', 'MATIC', 'UNI', 'ATOM', 'ALGO', 'XLM', 'VET'];
    for (let i = 0; i < symbols.length; i++) {
      mockPairs.push({
        symbol: `${symbols[i]}USDT`,
        price: Math.random() * 100,
        change24h: (Math.random() - 0.5) * 10,
        volume: Math.random() * 1000000,
        rank: i + 6
      });
    }
    
    return mockPairs;
  }

  private getMockKlineData(): Candle[] {
    const candles: Candle[] = [];
    let price = 45000;
    
    for (let i = 0; i < 100; i++) {
      const change = (Math.random() - 0.5) * 1000;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * 500;
      const low = Math.min(open, close) - Math.random() * 500;
      
      candles.push({
        timestamp: Date.now() - (100 - i) * 60000,
        open,
        high,
        low,
        close,
        volume: Math.random() * 1000
      });
      
      price = close;
    }
    
    return candles;
  }
}