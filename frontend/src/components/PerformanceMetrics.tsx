import React, { useState, useEffect } from 'react';
import { gamePerformanceMonitor } from '../utils/gamePerformanceMonitor';

interface PerformanceMetricsProps {
  isVisible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ 
  isVisible = true, 
  position = 'top-right' 
}) => {
  const [metrics, setMetrics] = useState(gamePerformanceMonitor.getSessionSummary());
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      const newMetrics = gamePerformanceMonitor.getSessionSummary();
      setMetrics(newMetrics);
      setLastUpdate(Date.now());
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const getMetricColor = (value: number, threshold: number, inverse = false) => {
    const isGood = inverse ? value <= threshold : value >= threshold;
    return isGood ? 'text-green-400' : 'text-yellow-400';
  };

  const connectionTimeColor = getMetricColor(metrics.connectionTime || 0, 1000, true);
  const latencyColor = getMetricColor(metrics.averageLatency, 200, true);
  const errorRateColor = getMetricColor(metrics.networkErrors, 2, true);

  return (
    <div className={`fixed ${positionClasses[position]} z-50 font-mono text-xs`}>
      <div className="bg-black/80 backdrop-blur-sm border border-gray-600 rounded-lg shadow-lg">
        {/* Header */}
        <div 
          className="px-3 py-2 cursor-pointer flex items-center justify-between bg-gray-800/50 rounded-t-lg"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-white font-semibold">Performance</span>
          </div>
          <span className="text-gray-400">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>

        {/* Quick Stats (always visible) */}
        <div className="px-3 py-2 space-y-1 bg-gray-900/50">
          <div className="flex justify-between text-white">
            <span>Connection:</span>
            <span className={connectionTimeColor}>
              {metrics.connectionTime ? `${metrics.connectionTime}ms` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between text-white">
            <span>States:</span>
            <span className="text-blue-400">{metrics.totalStateUpdates}</span>
          </div>
          <div className="flex justify-between text-white">
            <span>Cache Hits:</span>
            <span className="text-purple-400">
              {metrics.cacheHits + metrics.localStorageHits}
            </span>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="px-3 py-2 space-y-1 border-t border-gray-600 bg-gray-900/30">
            <div className="text-gray-300 font-semibold mb-2">Detailed Metrics</div>
            
            <div className="flex justify-between text-white">
              <span>Avg Latency:</span>
              <span className={latencyColor}>
                {metrics.averageLatency ? `${Math.round(metrics.averageLatency)}ms` : 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between text-white">
              <span>Server Cache:</span>
              <span className="text-purple-400">{metrics.cacheHits}</span>
            </div>
            
            <div className="flex justify-between text-white">
              <span>localStorage:</span>
              <span className="text-blue-400">{metrics.localStorageHits}</span>
            </div>
            
            <div className="flex justify-between text-white">
              <span>Recoveries:</span>
              <span className="text-yellow-400">{metrics.recoveryAttempts}</span>
            </div>
            
            <div className="flex justify-between text-white">
              <span>Errors:</span>
              <span className={errorRateColor}>{metrics.networkErrors}</span>
            </div>
            
            <div className="flex justify-between text-white">
              <span>Session:</span>
              <span className="text-gray-400">
                {Math.round((Date.now() - metrics.startTime) / 60000)}m
              </span>
            </div>

            {/* Status Indicators */}
            <div className="pt-2 border-t border-gray-700 space-y-1">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${navigator.onLine ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-gray-300">
                  {navigator.onLine ? 'Online' : 'Offline'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${!document.hidden ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                <span className="text-gray-300">
                  {!document.hidden ? 'Active' : 'Background'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-1">
              <button
                onClick={() => {
                  const report = gamePerformanceMonitor.getMetricsReport();
                  console.log(report);
                  alert('Performance report logged to console');
                }}
                className="w-full px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Export Report
              </button>
              
              <button
                onClick={() => {
                  const data = gamePerformanceMonitor.exportMetrics();
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `game-metrics-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="w-full px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
              >
                Download JSON
              </button>
            </div>
          </div>
        )}

        {/* Last Update Indicator */}
        <div className="px-3 py-1 text-center bg-gray-800/30 rounded-b-lg">
          <span className="text-gray-500 text-xs">
            Updated {Math.round((Date.now() - lastUpdate) / 1000)}s ago
          </span>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;
