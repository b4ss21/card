  // Selecionar todos os sinais gerados
  function handleSelectAllSignals(checked: boolean) {
    if (checked) {
      setSelectedSignals(filteredSignals.map((s: Signal) => s.id));
    } else {
      setSelectedSignals([]);
    }
  }

  // Deletar selecionados dos sinais gerados
  function handleDeleteSelectedSignals() {
    setSignals((prev: Signal[]) => prev.filter((s: Signal) => !selectedSignals.includes(s.id)));
    setSelectedSignals([]);
  }
import { useState, useEffect, useRef } from 'react';
import { CryptoPair, Signal, Timeframe } from '../types';
import { BinanceService } from '../services/binanceApi';
import { TechnicalAnalysisService } from '../services/technicalAnalysis';
import { SignalCard } from './SignalCard';
import { BuyIcon, SellIcon } from './SignalIcons';
import { TradingViewWidget } from './TradingViewWidget';
import { ImageAnalysis } from './ImageAnalysis';
import { Settings, RefreshCw, Filter } from 'lucide-react';

export function Dashboard() {
  // Estado para seleção de sinais
  // Selecionar todos os sinais gerados
  function handleSelectAllSignals(checked: boolean) {
    if (checked) {
      setSelectedSignals(filteredSignals.map((s: Signal) => s.id));
    } else {
      setSelectedSignals([]);
    }
  }

  // Deletar selecionados dos sinais gerados
  function handleDeleteSelectedSignals() {
    setSignals((prev: Signal[]) => prev.filter((s: Signal) => !selectedSignals.includes(s.id)));
    setSelectedSignals([]);
  }
  // Estado para seleção de sinais ativos
  const [selectedActiveSignals, setSelectedActiveSignals] = useState<string[]>([]);

  // Selecionar/desselecionar um sinal ativo
  function handleSelectActiveSignal(id: string, checked: boolean) {
    setSelectedActiveSignals((prev: string[]) => checked ? [...prev, id] : prev.filter((sid: string) => sid !== id));
  }

  // Selecionar todos os ativos
  function handleSelectAllActiveSignals(checked: boolean) {
    if (checked) {
      setSelectedActiveSignals(activeSignals.map((s: Signal) => s.id));
    } else {
      setSelectedActiveSignals([]);
    }
  }

  // Deletar selecionados ativos
  function handleDeleteSelectedActiveSignals() {
    setActiveSignals((prev: Signal[]) => prev.filter((s: Signal) => !selectedActiveSignals.includes(s.id)));
    setSelectedActiveSignals([]);
  }

  // Deletar individual ativo
  function handleDeleteActiveSignal(id: string) {
    setActiveSignals((prev: Signal[]) => prev.filter((s: Signal) => s.id !== id));
    setSelectedActiveSignals((prev: string[]) => prev.filter((sid: string) => sid !== id));
  }
  // Ref para o gráfico
  const chartRef = useRef<HTMLDivElement>(null);
  // --- Estados do gerador de sinais ---
  const [pairs, setPairs] = useState<CryptoPair[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1h');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDT');
  const [minConfidence, setMinConfidence] = useState(60);
  const [maxSignals, setMaxSignals] = useState(30);
  const [signalError, setSignalError] = useState<string | null>(null);
  // Token Hugging Face
  const [showTokenConfig, setShowTokenConfig] = useState(false);
  const [hfToken, setHfToken] = useState(() => {
    try {
      return localStorage.getItem('hf_token') || '';
    } catch {
      return '';
    }
  });
  const [analysisMode, setAnalysisMode] = useState<'candles' | 'indicators' | 'bbUpperBreak' | 'bbMiddleBreak'>('indicators');

  // Estado para seleção de sinais
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);

  const binanceService = BinanceService.getInstance();
  const technicalService = new TechnicalAnalysisService();

  const timeframes: Timeframe[] = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];

  useEffect(() => {
    loadCryptoPairs();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('selectedSymbol');
    if (saved) setSelectedSymbol(saved);
  }, []);

  useEffect(() => {
    calculateStats();
  }, [signals]);

  const loadCryptoPairs = async () => {
    try {
      const cryptoPairs = await binanceService.getTop500USDTPairs();
      setPairs(cryptoPairs);
    } catch (error) {
      console.error('Error loading crypto pairs:', error);
    }
  };

  // --- Renderização ---


  // Selecionar/desselecionar um sinal
  function handleSelectSignal(id: string, checked: boolean) {
    setSelectedSignals((prev: string[]) => checked ? [...prev, id] : prev.filter((sid: string) => sid !== id));
  }


  // Deletar individual

  function handleDeleteSignal(id: string) {
    setSignals((prev: Signal[]) => prev.filter((s: Signal) => s.id !== id));
    setSelectedSignals((prev: string[]) => prev.filter((sid: string) => sid !== id));
  }



  const generateSignals = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    if (pairs.length === 0) return;
    try {
      let currentPairs = pairs;
      if (currentPairs.length === 0) {
        currentPairs = await binanceService.getTop500USDTPairs();
        setPairs(currentPairs);
      }
      const topPairs = currentPairs.slice(0, 100);
      const allSignals: Signal[] = [];
      const btcCandles = await binanceService.getAllKlineData('BTCUSDT', selectedTimeframe);
      for (const pair of topPairs) {
        const candles = await binanceService.getAllKlineData(pair.symbol, selectedTimeframe);
        if (!candles || candles.length < 50) continue;
        if (analysisMode === 'indicators') {
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
            allSignals.push(signal);
          }
        } else if (analysisMode === 'candles') {
          // Apenas padrões de candles
          const candleSignals = technicalService.detectCandlePattern(candles, pair.symbol, selectedTimeframe, minConfidence);
          allSignals.push(...candleSignals);
        } else if (analysisMode === 'bbUpperBreak') {
          // Sinal apenas se fechamento rompeu a banda superior da BB
          const closes = candles.map(c => c.close);
          const bb = technicalService.calculateBollingerBands(closes);
          const lastCandle = candles[candles.length - 1];
          if (lastCandle.close > bb.upper) {
            allSignals.push({
              id: `${pair.symbol}-bbupper-${Date.now()}`,
              symbol: pair.symbol,
              type: 'BUY',
              entryPrice: lastCandle.close,
              targetPrice: lastCandle.close * 1.02,
              stopLoss: lastCandle.close * 0.98,
              confidence: 100,
              timestamp: new Date(),
              timeframe: selectedTimeframe,
              expectedGain: 2,
              btcCorrelation: 0,
              status: 'PENDING',
              indicators: technicalService.analyzeIndicators(candles),
              reason: 'Rompimento da banda superior da BB'
            });
          }
        } else if (analysisMode === 'bbMiddleBreak') {
          // Sinal apenas se fechamento rompeu a banda do meio (SMA20)
          const closes = candles.map(c => c.close);
          const bb = technicalService.calculateBollingerBands(closes);
          const lastCandle = candles[candles.length - 1];
          if (lastCandle.close > bb.middle) {
            allSignals.push({
              id: `${pair.symbol}-bbmiddle-${Date.now()}`,
              symbol: pair.symbol,
              type: 'BUY',
              entryPrice: lastCandle.close,
              targetPrice: lastCandle.close * 1.02,
              stopLoss: lastCandle.close * 0.98,
              confidence: 100,
              timestamp: new Date(),
              timeframe: selectedTimeframe,
              expectedGain: 2,
              btcCorrelation: 0,
              status: 'PENDING',
              indicators: technicalService.analyzeIndicators(candles),
              reason: 'Rompimento da banda do meio da BB (SMA20)'
            });
          }
        }
      }
      // Ordena e limita os sinais
      const sortedSignals = allSignals
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
      const btcCandles = await binanceService.getAllKlineData('BTCUSDT', selectedTimeframe);
      const candles = await binanceService.getAllKlineData(selectedSymbol, selectedTimeframe);
      if (!candles || candles.length < 50) {
        setSignalError('Não há candles suficientes para gerar sinal nesta moeda/timeframe.');
        return;
      }
      if (analysisMode === 'indicators') {
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
      } else {
        // Apenas padrões de candles
        const candleSignals = technicalService.detectCandlePattern(candles, selectedSymbol, selectedTimeframe, minConfidence);
        if (candleSignals.length > 0) {
          setSignals(prev => [...candleSignals, ...prev].slice(0, 100));
        } else {
          setSignalError('Nenhum padrão de candle relevante detectado para este timeframe.');
        }
      }
    } catch (e) {
      setSignalError('Erro ao tentar gerar sinal. Veja o console para detalhes.');
      console.error('Error generating single symbol signal:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Função de monitoramento de sinais ---
  const [stats, setStats] = useState({ total: 0, win: 0, loss: 0 });
  const [activeSignals, setActiveSignals] = useState<Signal[]>(() => {
    try {
      const saved = localStorage.getItem('active_signals');
      return saved ? JSON.parse(saved) as Signal[] : [];
    } catch {
      return [];
    }
  });

  // Atualiza localStorage e estatísticas ao mudar sinais ativos
  useEffect(() => {
    try {
      localStorage.setItem('active_signals', JSON.stringify(activeSignals));
    } catch {}
    const total = activeSignals.length;
    const win = activeSignals.filter((s: Signal) => s.status === 'WIN').length;
    const loss = activeSignals.filter((s: Signal) => s.status === 'LOSS').length;
    setStats({ total, win, loss });
  }, [activeSignals]);

  // Polling de preço para monitorar sinais ativos
  useEffect(() => {
    if (!activeSignals.length) return;
    let interval: any = null;
    async function pollPrices() {
      const updatedSignals = await Promise.all(activeSignals.map(async (signal: Signal) => {
        if (signal.status !== 'PENDING') return signal;
        try {
          const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${signal.symbol}`);
          const data = await res.json();
          const price = parseFloat(data.price);
          if (signal.type === 'BUY') {
            if (price >= signal.targetPrice) return { ...signal, status: 'WIN' as Signal['status'] };
            if (price <= signal.stopLoss) return { ...signal, status: 'LOSS' as Signal['status'] };
          } else if (signal.type === 'SELL') {
            if (price <= signal.targetPrice) return { ...signal, status: 'WIN' as Signal['status'] };
            if (price >= signal.stopLoss) return { ...signal, status: 'LOSS' as Signal['status'] };
          }
          return signal;
        } catch {
          return signal;
        }
      }));
      setActiveSignals(updatedSignals);
    }
    interval = setInterval(pollPrices, 5000);
    return () => clearInterval(interval);
  }, [activeSignals]);

  // Ativa monitoramento ao clicar no card
  function handleActivateSignal(signal: Signal) {
    if (!activeSignals.find((s: Signal) => s.id === signal.id)) {
      setActiveSignals((prev: Signal[]) => [...prev, { ...signal, status: 'PENDING' }]);
    }
  }

  // Atualiza status de um sinal monitorado
  function handleUpdateStatus(id: string, status: Signal['status']) {
    setActiveSignals(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  }

  // Estatísticas do gerador de sinais (não do monitoramento)
  function calculateStats() {
    // ...pode ser customizado se quiser estatísticas do gerador
  }

  // --- Renderização ---
  const filteredSignals = signals.filter(s => s.timeframe === selectedTimeframe);


  // Estado para feedback do teste do token
  const [tokenTestStatus, setTokenTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>("idle");
  const [tokenTestMsg, setTokenTestMsg] = useState<string>("");

  // Salvar token
  function handleSaveToken() {
    try {
      localStorage.setItem('hf_token', hfToken);
    } catch {}
    setShowTokenConfig(false);
    setTokenTestStatus('idle');
    setTokenTestMsg("");
  }

  // Testar token Hugging Face
  async function handleTestToken() {
    setTokenTestStatus('loading');
    setTokenTestMsg("");
    try {
      // Requisição simples para endpoint de user info (não consome créditos)
      const res = await fetch('https://huggingface.co/api/whoami-v2', {
        headers: { Authorization: `Bearer ${hfToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTokenTestStatus('success');
        setTokenTestMsg(`Token válido! Usuário: ${data.name || data.user || 'desconhecido'}`);
      } else {
        setTokenTestStatus('error');
        setTokenTestMsg('Token inválido ou sem permissão.');
      }
    } catch {
      setTokenTestStatus('error');
      setTokenTestMsg('Erro ao testar o token.');
    }
  }

  // Modal de configuração do token
  const renderTokenConfig = () => (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md border border-gray-200 relative">
        <button onClick={() => setShowTokenConfig(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl">&times;</button>
        <h2 className="text-xl font-bold mb-4">Configurar Token Hugging Face</h2>
        <input
          type="password"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
          placeholder="Cole seu token aqui..."
          value={hfToken}
          onChange={e => setHfToken(e.target.value)}
        />
        <div className="flex gap-2 justify-end mb-2">
          <button
            onClick={handleTestToken}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-60"
            disabled={!hfToken || tokenTestStatus === 'loading'}
          >{tokenTestStatus === 'loading' ? 'Testando...' : 'Testar Token'}</button>
          <button
            onClick={handleSaveToken}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >Salvar</button>
        </div>
        {tokenTestStatus !== 'idle' && (
          <div className={`text-sm mb-2 ${tokenTestStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>{tokenTestMsg}</div>
        )}
        <p className="text-xs text-gray-500 mt-2">O token é salvo apenas no seu navegador e nunca é enviado para terceiros.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {showTokenConfig && renderTokenConfig()}
      <div className="max-w-7xl mx-auto">
        {/* Painel de Estatísticas do monitoramento */}
        <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-col md:flex-row md:items-center md:justify-between border border-gray-200">
          <div className="font-bold text-lg mb-2 md:mb-0">Monitoramento de Sinais</div>
          <div className="flex gap-6 text-sm">
            <span>Total: <b>{stats.total}</b></span>
            <span className="text-green-600">Win: <b>{stats.win}</b> ({stats.total ? ((stats.win / stats.total) * 100).toFixed(1) : 0}%)</span>
            <span className="text-red-600">Loss: <b>{stats.loss}</b> ({stats.total ? ((stats.loss / stats.total) * 100).toFixed(1) : 0}%)</span>
          </div>
        </div>

        {/* Header do gerador de sinais */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-gray-900">Gerador de Sinais Cripto</h1>
              <button
                onClick={() => setShowTokenConfig(true)}
                className="ml-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm text-gray-700 border border-gray-300"
                title="Configurar Token Hugging Face"
              >Token</button>
            </div>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Modo de Análise</label>
              <select
                value={analysisMode}
                onChange={e => setAnalysisMode(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="indicators">Indicadores + Candles</option>
                <option value="candles">Somente Candles</option>
                <option value="bbUpperBreak">Rompimento Banda Superior BB</option>
                <option value="bbMiddleBreak">Rompimento Banda do Meio BB (SMA20)</option>
              </select>
            </div>
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
                  } catch {}
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
                <p>Status: <span className={`font-medium ${isGenerating ? 'text-blue-600' : 'text-gray-600'}`}>{isGenerating ? 'Analisando...' : 'Pronto'}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico principal */}
        <div className="mb-6" ref={chartRef}>
          {selectedSymbol ? (
            <TradingViewWidget symbol={selectedSymbol} interval={selectedTimeframe} />
          ) : (
            <div className="text-center text-gray-400 py-12">Selecione um sinal para visualizar o gráfico</div>
          )}
        </div>

        {/* Image Analysis */}
        <div className="mb-6">
          <ImageAnalysis onAnalysisResult={() => {}} />
        </div>

        {/* Feedback de erro do sinal */}
        {signalError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-center">
            {signalError}
          </div>
        )}

        {/* Controles de seleção dos sinais gerados */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-xl font-bold text-gray-900">Sinais Gerados</h2>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedSignals.length === filteredSignals.length && filteredSignals.length > 0}
                onChange={e => handleSelectAllSignals(e.target.checked)}
                className="accent-blue-600"
              />
              Selecionar todos
            </label>
            <button
              onClick={handleDeleteSelectedSignals}
              disabled={selectedSignals.length === 0}
              className="px-3 py-1 bg-red-500 text-white rounded disabled:opacity-50 text-sm hover:bg-red-600"
            >Deletar selecionados</button>
            <div className="flex items-center gap-2 text-sm text-gray-500 ml-4">
              <Filter className="w-4 h-4" />
              {filteredSignals.length} sinais
            </div>
          </div>
          <div className="border-b border-gray-200 w-full"></div>
        </div>

        {/* Signals Grid */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          {filteredSignals.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">{isGenerating ? 'Analisando mercado...' : 'Clique em "Gerar Sinais" para começar a análise'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredSignals.map(signal => {
                const handleCardClick = () => {
                  // Ativa o sinal (simula trade)
                  handleActivateSignal(signal);
                  // Seleciona o símbolo e rola para o gráfico
                  if (typeof window !== 'undefined' && chartRef.current) {
                    setSelectedSymbol(signal.symbol);
                    setTimeout(() => {
                      chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }
                };
                return (
                  <SignalCard
                    key={signal.id}
                    signal={signal}
                    onUpdateStatus={handleUpdateStatus}
                    onClick={handleCardClick}
                    selected={selectedSignals.includes(signal.id)}
                    onSelect={checked => handleSelectSignal(signal.id, checked)}
                    onDelete={() => handleDeleteSignal(signal.id)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Lista de sinais monitorados (ativos) com seleção */}
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-2">Sinais Ativos</h2>
          {activeSignals.length === 0 ? (
            <div className="text-gray-500">Nenhum sinal sendo monitorado.</div>
          ) : (
            <div>
              <div className="flex items-center gap-4 mb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedActiveSignals.length === activeSignals.length && activeSignals.length > 0}
                    onChange={e => handleSelectAllActiveSignals(e.target.checked)}
                    className="accent-blue-600"
                  />
                  Selecionar todos
                </label>
                <button
                  onClick={handleDeleteSelectedActiveSignals}
                  disabled={selectedActiveSignals.length === 0}
                  className="px-3 py-1 bg-red-500 text-white rounded disabled:opacity-50 text-sm hover:bg-red-600"
                >Deletar selecionados</button>
              </div>
              <ul className="space-y-2">
                {activeSignals.map((signal: Signal) => {
                  const getDecimals = (num: number) => {
                    const s = num.toString();
                    if (s.includes('.')) return s.split('.')[1].length;
                    return 0;
                  };
                  const dec = getDecimals(signal.entryPrice);
                  const fmt = (n: number) => n.toFixed(dec);
                  const percent = signal.type === 'BUY'
                    ? ((signal.targetPrice - signal.entryPrice) / signal.entryPrice) * 100
                    : ((signal.entryPrice - signal.targetPrice) / signal.entryPrice) * 100;
                  const percentStr = `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`;
                  const handleScrollToChart = () => {
                    if (typeof window !== 'undefined' && chartRef.current) {
                      setSelectedSymbol(signal.symbol);
                      setTimeout(() => {
                        chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                    }
                  };
                  return (
                    <li
                      key={signal.id}
                      className="p-3 rounded border flex items-center justify-between bg-white shadow cursor-pointer hover:bg-gray-50 transition"
                      onClick={handleScrollToChart}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedActiveSignals.includes(signal.id)}
                          onChange={e => handleSelectActiveSignal(signal.id, e.target.checked)}
                          onClick={e => e.stopPropagation()}
                          className="accent-blue-600"
                        />
                        {signal.type === 'BUY' ? <BuyIcon /> : <SellIcon />}
                        <span className="font-bold">{signal.symbol}</span>
                        <span className={signal.type === 'BUY' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {signal.type}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5 ml-1">{signal.timeframe}</span>
                        <span className="ml-2">| Entrada: {fmt(signal.entryPrice)} | Target: {fmt(signal.targetPrice)} | Stop: {fmt(signal.stopLoss)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            signal.status === 'WIN' ? 'text-green-600 font-bold mr-2' :
                            signal.status === 'LOSS' ? 'text-red-600 font-bold mr-2' :
                            signal.status === 'ACTIVE' ? 'text-blue-600 font-bold mr-2' :
                            'text-gray-600 font-bold mr-2'
                          }
                        >
                          {signal.status}
                        </span>
                        <span className={percent >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                          {percentStr}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteActiveSignal(signal.id); }}
                          className="ml-2 px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-xs"
                          title="Deletar sinal"
                        >Excluir</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}