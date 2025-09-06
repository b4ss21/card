import React, { useState } from 'react';
import { ImageAnalysisResult } from '../types';
import { Upload, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

interface ImageAnalysisProps {
  onAnalysisResult: (result: ImageAnalysisResult) => void;
}

export function ImageAnalysis({ onAnalysisResult }: ImageAnalysisProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [lastResult, setLastResult] = useState<ImageAnalysisResult | null>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, faça upload apenas de imagens');
      return;
    }

    setAnalyzing(true);
    
    // Simulate AI analysis (in a real app, this would call an AI service)
    setTimeout(() => {
      const mockResult: ImageAnalysisResult = {
        trend: Math.random() > 0.5 ? 'BULLISH' : Math.random() > 0.3 ? 'BEARISH' : 'NEUTRAL',
        confidence: Math.floor(Math.random() * 40) + 60,
        patterns: [
          'Triângulo ascendente detectado',
          'Padrão de rompimento por volume',
          'Nível de suporte em antiga resistência'
        ],
        recommendation: 'A análise técnica sugere possível movimento de alta com base nos padrões do gráfico e análise de volume.'
      };
      
      setLastResult(mockResult);
      onAnalysisResult(mockResult);
      setAnalyzing(false);
    }, 2000);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const getTrendIcon = (trend: ImageAnalysisResult['trend']) => {
    switch (trend) {
      case 'BULLISH': return <TrendingUp className="w-6 h-6 text-green-600" />;
      case 'BEARISH': return <TrendingDown className="w-6 h-6 text-red-600" />;
      default: return <Minus className="w-6 h-6 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: ImageAnalysisResult['trend']) => {
    switch (trend) {
      case 'BULLISH': return 'bg-green-100 border-green-200 text-green-800';
      case 'BEARISH': return 'bg-red-100 border-red-200 text-red-800';
      default: return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Análise de Gráfico por Imagem</h2>
      
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
          dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={analyzing}
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-gray-100 rounded-full">
            <Upload className="w-8 h-8 text-gray-600" />
          </div>
          
          {analyzing ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">Analisando gráfico...</p>
            </>
          ) : (
            <>
              <div>
                <p className="text-lg font-medium text-gray-900">Faça upload de um gráfico</p>
                <p className="text-gray-500">Arraste uma imagem ou clique para selecionar</p>
              </div>
              <p className="text-sm text-gray-400">PNG, JPG até 10MB</p>
            </>
          )}
        </div>
      </div>

      {lastResult && (
        <div className="mt-6">
          <div className={`p-6 rounded-lg border-2 ${getTrendColor(lastResult.trend)}`}>
            <div className="flex items-center gap-3 mb-4">
              {getTrendIcon(lastResult.trend)}
              <div>
                <h3 className="text-lg font-bold">
                  Tendência: {lastResult.trend === 'BULLISH' ? 'ALTA' : lastResult.trend === 'BEARISH' ? 'BAIXA' : 'NEUTRO'}
                </h3>
                <p className="text-sm opacity-80">Confiança: {lastResult.confidence}%</p>
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="font-medium mb-2">Padrões Identificados:</h4>
              <ul className="text-sm space-y-1">
                {lastResult.patterns.map((pattern, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" />
                    {pattern}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Recomendação:</h4>
              <p className="text-sm">{lastResult.recommendation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}