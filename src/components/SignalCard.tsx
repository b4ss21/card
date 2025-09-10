import React from 'react';
import { Signal } from '../types';
import { TrendingUp, TrendingDown, Clock, Target, Shield, Zap } from 'lucide-react';

interface SignalCardProps {
  signal: Signal;
  onUpdateStatus: (id: string, status: Signal['status']) => void;
  onClick?: () => void;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
  onDelete?: () => void;
}

export function SignalCard({ signal, onUpdateStatus, onClick, selected = false, onSelect, onDelete }: SignalCardProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status: Signal['status']) => {
    switch (status) {
      case 'WIN': return 'bg-green-500';
      case 'LOSS': return 'bg-red-500';
      case 'ACTIVE': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatPrice = (price: number) => {
    return price < 1 ? price.toFixed(6) : price.toFixed(2);
  };

  return (
    <div
      className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300 cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Checkbox de seleção sempre visível à esquerda */}
          <div className="flex items-center mr-2">
            {onSelect && (
              <input
                type="checkbox"
                checked={selected}
                onChange={e => onSelect(e.target.checked)}
                onClick={e => e.stopPropagation()}
                className="accent-blue-600 scale-125"
                title="Selecionar sinal"
              />
            )}
          </div>
          <div className={`p-2 rounded-full ${signal.type === 'BUY' ? 'bg-green-100' : 'bg-red-100'}`}>
            {signal.type === 'BUY' ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">{signal.symbol}</h3>
            <p className="text-sm text-gray-500">{signal.timeframe}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(signal.confidence)}`}>
            {signal.confidence}% Confiança
          </span>
          <span className={`w-3 h-3 rounded-full ${getStatusColor(signal.status)}`}></span>
          {/* Botão deletar individual */}
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="ml-2 px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-xs font-bold"
              title="Deletar sinal"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Entrada</span>
          </div>
          <p className="text-lg font-bold text-gray-900">${formatPrice(signal.entryPrice)}</p>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Alvo</span>
          </div>
          <p className="text-lg font-bold text-green-600">
            ${formatPrice(signal.targetPrice)}
            <span className="text-xs ml-1 text-green-500">
              (+{((signal.targetPrice - signal.entryPrice) / signal.entryPrice * 100).toFixed(2)}%)
            </span>
          </p>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-gray-600">Stop Loss</span>
          </div>
          <p className="text-lg font-bold text-red-600">
            ${formatPrice(signal.stopLoss)}
            <span className="text-xs ml-1 text-red-500">
              ({((signal.stopLoss - signal.entryPrice) / signal.entryPrice * 100).toFixed(2)}%)
            </span>
          </p>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">Ganho Est.</span>
          </div>
          <p className="text-lg font-bold text-purple-600">{signal.expectedGain.toFixed(2)}%</p>
        </div>
      </div>

      <div className="bg-blue-50 p-3 rounded-lg mb-4">
        <h4 className="font-medium text-blue-900 mb-2">Indicadores Técnicos</h4>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>RSI: <span className="font-medium">{signal.indicators.rsi.toFixed(1)}</span></div>
          <div>Vol: <span className="font-medium">{signal.indicators.volumeProfile.toFixed(1)}x</span></div>
          <div>Stoch K: <span className="font-medium">{signal.indicators.stochastic.k.toFixed(1)}</span></div>
          <div>EMA12: <span className="font-medium">${formatPrice(signal.indicators.ema12)}</span></div>
          <div>Volatility: <span className="font-medium">{signal.indicators.volatility.toFixed(1)}%</span></div>
          <div>BTC Corr: <span className="font-medium">{(signal.btcCorrelation * 100).toFixed(1)}%</span></div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">Razão do Sinal:</p>
        <p className="text-xs font-medium text-gray-800 bg-gray-50 p-2 rounded leading-relaxed">{signal.reason}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          {signal.timestamp.toLocaleTimeString()}
        </div>
        
        <div className="flex gap-2">
          {signal.status === 'PENDING' && (
            <>
              <button
                onClick={() => onUpdateStatus(signal.id, 'WIN')}
                className="px-3 py-1 bg-green-500 text-white text-xs rounded-md hover:bg-green-600 transition-colors font-medium"
              >
                ✓ Win
              </button>
              <button
                onClick={() => onUpdateStatus(signal.id, 'LOSS')}
                className="px-3 py-1 bg-red-500 text-white text-xs rounded-md hover:bg-red-600 transition-colors font-medium"
              >
                ✗ Loss
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}