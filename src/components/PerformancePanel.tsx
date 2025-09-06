import React from 'react';
import { PerformanceStats } from '../types';
import { TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react';

interface PerformancePanelProps {
  stats: PerformanceStats;
}

export function PerformancePanel({ stats }: PerformancePanelProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-full">
          <BarChart3 className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Performance</h2>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Total Sinais</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{stats.totalSignals}</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Wins</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{stats.wins}</p>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">Losses</span>
          </div>
          <p className="text-2xl font-bold text-red-900">{stats.losses}</p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Win Rate</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">{stats.winRate.toFixed(1)}%</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-2">Lucro Total</h4>
          <p className={`text-xl font-bold ${stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)}%
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-2">Ganho Médio</h4>
          <p className="text-xl font-bold text-green-600">+{stats.avgGain.toFixed(2)}%</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-2">Perda Média</h4>
          <p className="text-xl font-bold text-red-600">-{stats.avgLoss.toFixed(2)}%</p>
        </div>
      </div>
      
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">Taxa de Acerto</span>
          <span className="text-sm font-medium text-gray-900">{stats.winRate.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${stats.winRate}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}