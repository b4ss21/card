import { useState, useEffect } from 'react';
import { CryptoPair, Signal, Timeframe, ImageAnalysisResult } from '../types';
import { BinanceService } from '../services/binanceApi';
import { TechnicalAnalysisService } from '../services/technicalAnalysis';
import { SignalCard } from './SignalCard';
import { TradingViewWidget } from './TradingViewWidget';
import { ImageAnalysis } from './ImageAnalysis';
import { Settings, RefreshCw, Filter } from 'lucide-react';

export function Dashboard() {
  const [pairs, setPairs] = useState<CryptoPair[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1h');
  // estado de loading removido (não utilizado)
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [minConfidence, setMinConfidence] = useState(60); // limiar ajustável
  const [maxSignals, setMaxSignals] = useState(10);
  const [signalError, setSignalError] = useState<string | null>(null);

  const binanceService = BinanceService.getInstance();
  const technicalService = new TechnicalAnalysisService();

  const timeframes: Timeframe[] = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];


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


  // Mapeamento de quantidade de candles por timeframe
  const timeframeCandleMap: Record<Timeframe, number> = {
    '1m': 10000,
    '3m': 10000,
    '5m': 10000,
    '15m': 10000,
    '30m': 10000,
    '1h': 10000,
    '2h': 10000,
    '4h': 10000,
    '6h': 10000,
    '8h': 10000,
    '12h': 10000,
    '1d': 5000,
    '3d': 5000,
    '1w': 5000,
    '1M': 5000
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
      // Define o limit conforme o timeframe selecionado
      const limit = timeframeCandleMap[selectedTimeframe] || 500;
      const btcCandles = await binanceService.getKlineData('BTCUSDT', selectedTimeframe, limit);
      // Use batch processing for faster data retrieval
      const symbols = topPairs.map(p => p.symbol);
      const batchData = await binanceService.getMultiplePairData(symbols, selectedTimeframe, limit);
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
        if (signal && signal.confidence >= minConfidence) {
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
    setSignalError(null);
    if (isGenerating || !selectedSymbol) return;
    setIsGenerating(true);
    try {
      const limit = timeframeCandleMap[selectedTimeframe] || 500;
      const btcCandles = await binanceService.getKlineData('BTCUSDT', selectedTimeframe, limit);
      const raw = await binanceService.getKlineData(selectedSymbol, selectedTimeframe, limit);
      const candles = raw;
      if (!candles || candles.length < 50) {
        setSignalError('Não há candles suficientes para gerar sinal nesta moeda/timeframe.');
        return;
      }
      const indicators = technicalService.analyzeIndicators(candles);
      const btcCorrelation = technicalService.calculateBTCCorrelation(candles, btcCandles);
      const signal = technicalService.generateSignal(
        selectedSymbol,
        candles,
        indicators,
        btcCorrelation,
        selectedTimeframe
      );
      if (signal && signal.confidence >= minConfidence) {
        setSignals(prev => [signal, ...prev].slice(0, 100));
      } else {
        setSignalError('Não foi possível gerar sinal para esta moeda/timeframe com a confiança mínima definida.');
      }
    } catch (e) {
      setSignalError('Erro ao tentar gerar sinal. Veja o console para detalhes.');
      console.error('Error generating single symbol signal:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const calculateStats = () => {
  // stats removido
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

  // Exibe todos os sinais gerados
  // Exibe apenas sinais do timeframe selecionado
  const filteredSignals = signals.filter(s => s.timeframe === selectedTimeframe);

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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confiança mínima</label>
              <input
                type="range"
                min={30}
                max={95}
                step={1}
                value={minConfidence}
                onChange={e => setMinConfidence(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>30</span>
                <span>{minConfidence}%</span>
                <span>95</span>
              </div>
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

        {/* TradingView Chart Panel */}
        <div className="mb-6">
          {selectedSymbol ? (
            <TradingViewWidget symbol={selectedSymbol} interval={selectedTimeframe} />
          ) : (
            <div className="text-center text-gray-400 py-12">Selecione um sinal para visualizar o gráfico</div>
          )}
        </div>

        {/* Image Analysis */}
        <div className="mb-6">
          <ImageAnalysis onAnalysisResult={handleImageAnalysis} />
        </div>

        {/* Feedback de erro do sinal */}
        {signalError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-center">
            {signalError}
          </div>
        )}
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
                  onClick={() => {
                    setSelectedSymbol(signal.symbol);
                    setSelectedTimeframe(signal.timeframe as Timeframe);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}