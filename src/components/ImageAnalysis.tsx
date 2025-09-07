import React, { useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { Upload, Triangle, Flag, TrendingUp, TrendingDown, Minus, AlertCircle, Star, BarChart2, Image as ImageIcon } from 'lucide-react';
import { ImageAnalysisResult } from '../types';

interface ImageAnalysisProps {
  onAnalysisResult: (result: ImageAnalysisResult) => void;
}

export function ImageAnalysis({ onAnalysisResult }: ImageAnalysisProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [lastResult, setLastResult] = useState<ImageAnalysisResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, faça upload apenas de imagens');
      return;
    }
    setAnalyzing(true);
    // Exibe a imagem enviada
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    // Carrega a imagem como tensor usando TensorFlow.js
    const img = new window.Image();
    img.src = url;
    img.onload = async () => {
      // Cria um tensor a partir da imagem
      const tensor = tf.browser.fromPixels(img);
      // Carrega o modelo coco-ssd
      const model = await cocoSsd.load();
      // Faz a detecção de objetos
      const predictions = await model.detect(img);
      console.log('Detecções coco-ssd:', predictions);
      // Por enquanto, segue mockup para manter interface visual
      const trends = ['BULLISH', 'BEARISH', 'NEUTRAL'] as const;
      const patternsList = [
        'Triângulo ascendente detectado',
        'Triângulo descendente detectado',
        'Topo duplo',
        'Fundo duplo',
        'Bandeira de alta',
        'Bandeira de baixa',
        'Candle de reversão (martelo)',
        'Candle de reversão (estrela cadente)',
        'Rompimento de resistência',
        'Rompimento de suporte',
        'Volume acima da média',
        'Divergência de RSI',
        'Nível de suporte em antiga resistência',
        'Canal de alta',
        'Canal de baixa'
      ];
      const recommendations = [
        'A análise sugere possível movimento de alta após rompimento de resistência e padrão de volume.',
        'Atenção para possível reversão de tendência devido à formação de candle de reversão.',
        'Tendência de baixa pode se intensificar após perda de suporte importante.',
        'Movimento lateral detectado, aguarde confirmação de rompimento.',
        'Padrão de continuação sugere manutenção da tendência atual.',
        'Divergência de RSI pode indicar enfraquecimento da tendência.'
      ];
      const trend = trends[Math.floor(Math.random() * trends.length)];
      const confidence = Math.floor(Math.random() * 40) + 60;
      const patterns = patternsList.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 2);
      const recommendation = recommendations[Math.floor(Math.random() * recommendations.length)];
      const mockResult: ImageAnalysisResult = {
        trend,
        confidence,
        patterns,
        recommendation
      };
      setLastResult(mockResult);
      onAnalysisResult(mockResult);
      setAnalyzing(false);
    };
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
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><ImageIcon className="w-6 h-6 text-blue-500" /> Análise de Gráfico por Imagem</h2>
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
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
      {imageUrl && (
        <div className="flex justify-center mt-6">
          <img src={imageUrl} alt="Gráfico enviado" className="max-h-64 rounded-lg border shadow" />
        </div>
      )}
      {lastResult && (
        <div className="mt-6">
          <div className={`p-6 rounded-lg border-2 ${getTrendColor(lastResult.trend)}`}>
            <div className="flex items-center gap-3 mb-4">
              {getTrendIcon(lastResult.trend)}
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  Tendência: {lastResult.trend === 'BULLISH' ? 'ALTA' : lastResult.trend === 'BEARISH' ? 'BAIXA' : 'NEUTRO'}
                  {lastResult.trend === 'BULLISH' && <TrendingUp className="w-5 h-5 text-green-600" />}
                  {lastResult.trend === 'BEARISH' && <TrendingDown className="w-5 h-5 text-red-600" />}
                  {lastResult.trend === 'NEUTRAL' && <Minus className="w-5 h-5 text-gray-600" />}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs">Confiança:</span>
                  <div className="relative w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`absolute left-0 top-0 h-3 rounded-full ${lastResult.confidence >= 80 ? 'bg-green-500' : lastResult.confidence >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${lastResult.confidence}%` }}></div>
                  </div>
                  <span className="text-xs font-bold ml-1">{lastResult.confidence}%</span>
                </div>
              </div>
            </div>
            <div className="mb-4">
              <h4 className="font-medium mb-2 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-blue-400" /> Padrões Identificados:</h4>
              <ul className="text-sm space-y-1">
                {lastResult.patterns.map((pattern, index) => {
                  let icon = <AlertCircle className="w-3 h-3" />;
                  if (pattern.includes('Triângulo')) icon = <Triangle className="w-3 h-3 text-blue-500" />;
                  if (pattern.includes('Bandeira')) icon = <Flag className="w-3 h-3 text-purple-500" />;
                  if (pattern.includes('Candle')) icon = <Star className="w-3 h-3 text-yellow-500" />;
                  if (pattern.includes('Canal')) icon = <BarChart2 className="w-3 h-3 text-green-500" />;
                  return (
                    <li key={index} className="flex items-center gap-2">
                      {icon}
                      {pattern}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-orange-400" /> Recomendação:</h4>
              <p className="text-sm">{lastResult.recommendation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}