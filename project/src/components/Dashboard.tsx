import { useState, useEffect } from 'react';
import { CryptoPair, Signal, PerformanceStats, Timeframe, ImageAnalysisResult } from '../types';
import { BinanceService } from '../services/binanceApi';
import { TechnicalAnalysisService } from '../services/technicalAnalysis';
import { SignalCard } from './SignalCard';
import { PerformancePanel } from './PerformancePanel';
import { ImageAnalysis } from './ImageAnalysis';
import { Settings, RefreshCw, Filter } from 'lucide-react';

export function Dashboard() {
  const [pairs, setPairs] = useState<CryptoPair[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1h');
  // estado de loading removido (não utilizado)
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const MIN_CONFIDENCE = 60; // limiar interno de confiança
  const [maxSignals, setMaxSignals] = useState(10);

  const binanceService = BinanceService.getInstance();
  const technicalService = new TechnicalAnalysisService();

  const timeframes: Timeframe[] = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];

  const [stats, setStats] = useState<PerformanceStats>({
    totalSignals: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    totalProfit: 0,
    avgGain: 0,
    avgLoss: 0
  });

  useEffect(() => {
    // carregamento inicial de pares
    loadCryptoPairs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carrega moeda salva
  useEffect(() => {
    try {
      const saved = localStorage.getItem('selectedSymbol');
      if (saved) setSelectedSymbol(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    calculateStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signals]);


  const loadCryptoPairs = async () => {
    try {
      const cryptoPairs = await binanceService.getTop500USDTPairs();
      setPairs(cryptoPairs);
    } catch (error) {
      console.error('Error loading crypto pairs:', error);
    } finally {
      // noop
    }
  };

  const generateSignals = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    if (pairs.length === 0) return;
    
    try {
      // Load pairs if not loaded
      let currentPairs = pairs;
      if (currentPairs.length === 0) {
        currentPairs = await binanceService.getTop500USDTPairs();
        setPairs(currentPairs);
      }
      
      // Analyze top 50 pairs for better signal quality
      const topPairs = currentPairs.slice(0, 50);
  const btcCandles = await binanceService.getAllKlineData('BTCUSDT', selectedTimeframe);
      
      // Use batch processing for faster data retrieval
  const symbols = topPairs.map(p => p.symbol);
      const batchData = await binanceService.getMultiplePairData(symbols, selectedTimeframe);
      
      const newSignals: Signal[] = [];
      
  const targetPairs = topPairs;

      for (const pair of targetPairs) {
        const rawData = batchData.get(pair.symbol);
  if (!rawData || !Array.isArray(rawData)) continue;

  // tipagem explícita do kline para evitar 'any'
        const candles = rawData.map((kline) => ({
          timestamp: Number(kline[0]),
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          close: parseFloat(kline[4]),
          volume: parseFloat(kline[5])
        }));
        
        if (candles.length < 50) continue;
        
        const indicators = technicalService.analyzeIndicators(candles);
        const btcCorrelation = technicalService.calculateBTCCorrelation(candles, btcCandles);
        
        const signal = technicalService.generateSignal(
          pair.symbol,
          candles,
          indicators,
          btcCorrelation,
          selectedTimeframe
        );
        
  if (signal && signal.confidence >= MIN_CONFIDENCE) {
          newSignals.push(signal);
        }
      }
      
      // Sort by confidence and take top signals
      const sortedSignals = newSignals
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, maxSignals);
      
      if (sortedSignals.length > 0) {
        setSignals(prev => [...sortedSignals, ...prev.slice(0, 100 - sortedSignals.length)]);
      }
    } catch (error) {
      console.error('Error generating signals:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSignalForSymbol = async () => {
    if (isGenerating || !selectedSymbol) return;
    setIsGenerating(true);
    try {
      const btcCandles = await binanceService.getKlineData('BTCUSDT', selectedTimeframe);
  const raw = await binanceService.getAllKlineData(selectedSymbol, selectedTimeframe);
      const candles = raw;
      if (candles.length < 50) return;
      const indicators = technicalService.analyzeIndicators(candles);
      const btcCorrelation = technicalService.calculateBTCCorrelation(candles, btcCandles);
      const signal = technicalService.generateSignal(
        selectedSymbol,
        candles,
        indicators,
        btcCorrelation,
        selectedTimeframe
      );
      if (signal && signal.confidence >= MIN_CONFIDENCE) {
        setSignals(prev => [signal, ...prev].slice(0, 100));
      }
    } catch (e) {
      console.error('Error generating single symbol signal:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const calculateStats = () => {
    const completedSignals = signals.filter(s => s.status === 'WIN' || s.status === 'LOSS');
    const wins = signals.filter(s => s.status === 'WIN').length;
    const losses = signals.filter(s => s.status === 'LOSS').length;
    
    const winSignals = signals.filter(s => s.status === 'WIN');
    const lossSignals = signals.filter(s => s.status === 'LOSS');
    
    const avgGain = winSignals.length > 0 
      ? winSignals.reduce((sum, s) => sum + s.expectedGain, 0) / winSignals.length 
      : 0;
    
    const avgLoss = lossSignals.length > 0 
      ? lossSignals.reduce((sum, s) => sum + s.expectedGain, 0) / lossSignals.length 
      : 0;
    
    const totalProfit = (wins * avgGain) - (losses * avgLoss);
    
    setStats({
      totalSignals: signals.length,
      wins,
      losses,
      winRate: completedSignals.length > 0 ? (wins / completedSignals.length) * 100 : 0,
      totalProfit,
      avgGain,
      avgLoss
    });
  };

  const handleSignalStatusUpdate = (id: string, status: Signal['status']) => {
    setSignals(prev => prev.map(signal => 
      signal.id === id ? { ...signal, status } : signal
    ));
  };

  const handleImageAnalysis = (result: ImageAnalysisResult) => {
    // You could create a signal based on image analysis result
    console.log('Image analysis result:', result);
  };

  const filteredSignals = signals;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Gerador de Sinais Cripto</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={generateSignals}
                disabled={isGenerating}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Gerando Sinais...' : 'Gerar Sinais'}
              </button>
              <button
                onClick={generateSignalForSymbol}
                disabled={isGenerating || !selectedSymbol}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Gerando...' : 'Gerar Sinal da Moeda'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value as Timeframe)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {timeframes.map(tf => (
                  <option key={tf} value={tf}>{tf}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Moeda</label>
              <select
                value={selectedSymbol}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedSymbol(v);
                  try {
                    if (v) {
                      localStorage.setItem('selectedSymbol', v);
                    } else {
                      localStorage.removeItem('selectedSymbol');
                    }
                  } catch {
                    // ignore storage errors
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas (top 50)</option>
                {pairs
                  .slice()
                  .sort((a, b) => a.symbol.localeCompare(b.symbol))
                  .map(p => (
                    <option key={p.symbol} value={p.symbol}>{p.symbol}</option>
                  ))}
              </select>
              <span className="text-xs text-gray-500">Em ordem alfabética • Selecione para gerar sinal da moeda</span>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Sinais</label>
              <select
                value={maxSignals}
                onChange={(e) => setMaxSignals(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={5}>5 sinais</option>
                <option value={10}>10 sinais</option>
                <option value={15}>15 sinais</option>
                <option value={20}>20 sinais</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                <p>Pares carregados: <span className="font-medium">{pairs.length}</span></p>
                <p>Status: <span className={`font-medium ${isGenerating ? 'text-blue-600' : 'text-gray-600'}`}>
                  {isGenerating ? 'Analisando...' : 'Pronto'}
                </span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Panel */}
        <div className="mb-6">
          <PerformancePanel stats={stats} />
        </div>

        {/* Image Analysis */}
        <div className="mb-6">
          <ImageAnalysis onAnalysisResult={handleImageAnalysis} />
        </div>

        {/* Signals Grid */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Sinais Gerados</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Filter className="w-4 h-4" />
              {filteredSignals.length} sinais
            </div>
          </div>
          
          {filteredSignals.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {isGenerating ? 'Analisando mercado...' : 'Clique em "Gerar Sinais" para começar a análise'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredSignals.map(signal => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  onUpdateStatus={handleSignalStatusUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}