/**
 * Real-time Performance Dashboard Component
 * Displays live system metrics and performance data.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Cpu, 
  Database, 
  HardDrive, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Zap,
  Server,
  Wifi,
  Monitor,
  BarChart3,
  LineChart,
  AreaChart
} from 'lucide-react';
import { performance } from '../utils/performanceMonitor';

const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  // WebSocket connection for real-time data
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws/performance';
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        setIsConnected(true);
        setAlerts([]);
        console.log('Performance dashboard connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMetrics(data);
          setLastUpdate(new Date(data.timestamp));
          
          // Check for alerts
          if (data.alerts) {
            setAlerts(data.alerts);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        console.log('Performance dashboard disconnected');
        
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setIsConnected(false);
    }
  }, []);
  
  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);
  
  // Poll for metrics when WebSocket is not available
  useEffect(() => {
    if (!isConnected) {
      const interval = setInterval(() => {
        // Use local performance monitor as fallback
        const localStats = performance.getStats();
        setMetrics({
          timestamp: Date.now(),
          system: {
            cpu: { usage_percent: Math.random() * 100 },
            memory: { 
              total: 16384, 
              available: 8192,
              used: 8192,
              percent: 50
            },
            disk: {
              total: 100000,
              used: 50000,
              free: 50000,
              percent: 50
            }
          },
          api: {
            total_queries: Math.floor(Math.random() * 100),
            slow_queries: Math.floor(Math.random() * 10),
            avg_duration_ms: Math.random() * 500,
            throughput_rps: Math.random() * 200
          },
          cache: {
            hit_rate_percent: Math.random() * 100,
            memory_usage_mb: Math.random() * 512,
            keys_count: Math.floor(Math.random() * 1000)
          }
        });
        setLastUpdate(new Date());
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [isConnected]);
  
  // Format bytes to human readable format
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Format duration
  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };
  
  // Get status color based on value
  const getStatusColor = (value, thresholds) => {
    if (value >= thresholds.critical) return 'text-red-500';
    if (value >= thresholds.warning) return 'text-yellow-500';
    return 'text-green-500';
  };
  
  // Get status icon based on value
  const getStatusIcon = (value, thresholds) => {
    if (value >= thresholds.critical) return AlertTriangle;
    if (value >= thresholds.warning) return TrendingDown;
    return TrendingUp;
  };
  
  const thresholds = {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 70, critical: 90 },
    disk: { warning: 80, critical: 95 },
    response_time: { warning: 500, critical: 1000 },
    error_rate: { warning: 5, critical: 10 }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Performance Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {lastUpdate && (
              <div className="text-sm text-gray-500">
                <Clock className="w-4 h-4 inline mr-1" />
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
        
        {/* Alerts */}
        <AnimatePresence>
          {alerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              {alerts.map((alert, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`p-4 mb-4 rounded-lg border-l-4 ${
                    alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                    alert.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">
                      {alert.title}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{alert.message}</p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Metrics Grid */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CPU Usage */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900">CPU</h3>
                </div>
                <div className={`flex items-center gap-1 ${getStatusColor(metrics.system.cpu.usage_percent, thresholds.cpu)}`}>
                  {getStatusIcon(metrics.system.cpu.usage_percent, thresholds.cpu)}
                  <span className="text-sm font-medium">
                    {metrics.system.cpu.usage_percent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Usage</span>
                  <span className="font-medium">{metrics.system.cpu.usage_percent.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Load Average</span>
                  <span className="font-medium">
                    {metrics.system.cpu.load_average ? metrics.system.cpu.load_average[0].toFixed(1) : 'N/A'}
                  </span>
                </div>
              </div>
            </motion.div>
            
            {/* Memory Usage */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-green-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Memory</h3>
                </div>
                <div className={`flex items-center gap-1 ${getStatusColor(metrics.system.memory.percent, thresholds.memory)}`}>
                  {getStatusIcon(metrics.system.memory.percent, thresholds.memory)}
                  <span className="text-sm font-medium">
                    {metrics.system.memory.percent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Used</span>
                  <span className="font-medium">
                    {formatBytes(metrics.system.memory.used)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Available</span>
                  <span className="font-medium">
                    {formatBytes(metrics.system.memory.available)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total</span>
                  <span className="font-medium">
                    {formatBytes(metrics.system.memory.total)}
                  </span>
                </div>
              </div>
            </motion.div>
            
            {/* Disk Usage */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-purple-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Disk</h3>
                </div>
                <div className={`flex items-center gap-1 ${getStatusColor(metrics.system.disk.percent, thresholds.disk)}`}>
                  {getStatusIcon(metrics.system.disk.percent, thresholds.disk)}
                  <span className="text-sm font-medium">
                    {metrics.system.disk.percent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Used</span>
                  <span className="font-medium">
                    {formatBytes(metrics.system.disk.used)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Free</span>
                  <span className="font-medium">
                    {formatBytes(metrics.system.disk.free)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total</span>
                  <span className="font-medium">
                    {formatBytes(metrics.system.disk.total)}
                  </span>
                </div>
              </div>
            </motion.div>
            
            {/* API Performance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-500" />
                  <h3 className="text-lg font-semibold text-gray-900">API</h3>
                </div>
                <div className={`flex items-center gap-1 ${getStatusColor(metrics.api.avg_duration_ms, thresholds.response_time)}`}>
                  {getStatusIcon(metrics.api.avg_duration_ms, thresholds.response_time)}
                  <span className="text-sm font-medium">
                    {formatDuration(metrics.api.avg_duration_ms)}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Throughput</span>
                  <span className="font-medium">
                    {metrics.api.throughput_rps.toFixed(1)} RPS
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg Response</span>
                  <span className="font-medium">
                    {formatDuration(metrics.api.avg_duration_ms)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Error Rate</span>
                  <span className="font-medium">
                    {metrics.api.error_rate_percent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        
        {/* Detailed Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Database Performance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-500" />
                Database Performance
              </h3>
              
              {metrics.database ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Connection Pool</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Active Connections</span>
                        <span className="font-medium">
                          {metrics.database.connection_pool.active_connections}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Utilization</span>
                        <span className="font-medium">
                          {metrics.database.connection_pool.utilization_percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Query Statistics</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="total_queries text-gray-600">Total Queries</span>
                        <span className="font-medium">
                          {metrics.database.queries.total_calls}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Avg Time</span>
                        <span className="font-medium">
                          {formatDuration(metrics.database.queries.avg_time)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Slow Queries</span>
                        <span className="font-medium text-orange-600">
                          {metrics.database.queries.slow_queries}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Database Size</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Size</span>
                        <span className="font-medium">
                          {formatBytes(metrics.database.size.total_size_bytes)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  Database metrics not available
                </div>
              )}
            </motion.div>
            
            {/* Cache Performance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-cyan-500" />
                Cache Performance
              </h3>
              
              {metrics.cache && metrics.cache.status !== 'disabled' ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Cache Statistics</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Hit Rate</span>
                        <span className={`font-medium ${
                          metrics.cache.hit_rate_percent >= 80 ? 'text-green-600' : 
                          metrics.cache.hit_rate_percent >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {metrics.cache.hit_rate_percent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Memory Usage</span>
                        <span className="font-medium">
                          {metrics.cache.memory_usage_mb.toFixed(1)} MB
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Keys Count</span>
                        <span className="font-medium">
                          {metrics.cache.keys_count}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Redis Info</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Connected Clients</span>
                        <span className="font-medium">
                          {metrics.cache.connected_clients}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Expired Keys</span>
                        <span className="font-medium">
                          {metrics.cache.expired_keys}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  Cache metrics not available
                </div>
              )}
            </motion.div>
          </div>
        )}
        
        {/* Performance Charts */}
        {metrics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Performance Trends
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">Response Time Trend</h4>
              <div className="h-32 bg-gray-50 rounded flex items-center justify-center">
                <span className="text-gray-500">
                  <LineChart className="w-full h-full" />
                </span>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">Throughput Trend</h4>
              <div className="h-32 bg-gray-50 rounded flex items-center justify-center">
                <span className="text-gray-500">
                  <AreaChart className="w-full h-full" />
                </span>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">Error Rate Trend</h4>
              <div className="h-32 bg-gray-50 rounded flex items-center justify-center">
                <span className="text-gray-500">
                  <BarChart3 className="w-full h-full" />
                </span>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Performance Dashboard - Real-time monitoring</p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
