/**
 * Performance monitoring utilities for the frontend application.
 * Provides performance metrics collection and reporting.
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
    this.isMonitoring = false;
    this.performanceObserver = null;
    this.navigationObserver = null;
  }

  /**
   * Start performance monitoring
   */
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.setupObservers();
    this.collectInitialMetrics();
    
    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stop() {
    if (!this.isMonitoring) return;
    
    this.disconnectObservers();
    this.isMonitoring = false;
    
    console.log('Performance monitoring stopped');
  }

  /**
   * Setup performance observers
   */
  setupObservers() {
    // Performance Observer for timing metrics
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric(entry.name, {
            duration: entry.duration,
            startTime: entry.startTime,
            type: entry.entryType,
            timestamp: Date.now()
          });
        });
      });

      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
    }

    // Navigation Observer for page load metrics
    if ('PerformanceObserver' in window) {
      this.navigationObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            this.recordNavigationMetrics(entry);
          }
        });
      });

      this.navigationObserver.observe({ entryTypes: ['navigation'] });
    }
  }

  /**
   * Disconnect observers
   */
  disconnectObservers() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    if (this.navigationObserver) {
      this.navigationObserver.disconnect();
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(name, data) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        samples: []
      });
    }

    const metric = this.metrics.get(name);
    metric.count += 1;
    metric.totalDuration += data.duration || 0;
    metric.minDuration = Math.min(metric.minDuration, data.duration || 0);
    metric.maxDuration = Math.max(metric.maxDuration, data.duration || 0);
    metric.samples.push({ ...data, timestamp: Date.now() });

    // Keep only last 100 samples
    if (metric.samples.length > 100) {
      metric.samples = metric.samples.slice(-100);
    }

    // Notify observers
    this.notifyObservers(name, data);
  }

  /**
   * Record navigation metrics
   */
  recordNavigationMetrics(entry) {
    const navigationMetrics = {
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      ssl: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
      ttfb: entry.responseStart - entry.requestStart,
      download: entry.responseEnd - entry.responseStart,
      domInteractive: entry.domInteractive - entry.navigationStart,
      loadComplete: entry.loadEventEnd - entry.navigationStart,
      total: entry.loadEventEnd - entry.navigationStart
    };

    this.recordMetric('navigation', navigationMetrics);
  }

  /**
   * Measure a function performance
   */
  measure(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    this.recordMetric(name, {
      duration: end - start,
      type: 'function'
    });
    
    return result;
  }

  /**
   * Measure an async function performance
   */
  async measureAsync(name, fn) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    this.recordMetric(name, {
      duration: end - start,
      type: 'async_function'
    });
    
    return result;
  }

  /**
   * Mark a performance point
   */
  mark(name) {
    performance.mark(name);
  }

  /**
   * Measure between two marks
   */
  measureBetween(name, startMark, endMark) {
    performance.measure(name, startMark, endMark);
  }

  /**
   * Collect initial metrics
   */
  collectInitialMetrics() {
    // Collect navigation timing if available
    if (performance.getEntriesByType) {
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        this.recordNavigationMetrics(navigationEntries[0]);
      }
    }

    // Collect paint timing
    if (performance.getEntriesByType) {
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach(entry => {
        this.recordMetric(entry.name, {
          duration: entry.duration,
          type: 'paint'
        });
      });
    }
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const stats = {};
    
    this.metrics.forEach((metric, name) => {
      stats[name] = {
        count: metric.count,
        avgDuration: metric.count > 0 ? metric.totalDuration / metric.count : 0,
        minDuration: metric.minDuration === Infinity ? 0 : metric.minDuration,
        maxDuration: metric.maxDuration,
        samples: metric.samples.slice(-10) // Last 10 samples
      };
    });
    
    return stats;
  }

  /**
   * Get performance report
   */
  getReport() {
    const stats = this.getStats();
    const report = {
      timestamp: Date.now(),
      metrics: stats,
      summary: this.generateSummary(stats)
    };
    
    return report;
  }

  /**
   * Generate performance summary
   */
  generateSummary(stats) {
    const summary = {
      totalMetrics: Object.keys(stats).length,
      slowOperations: [],
      fastOperations: [],
      recommendations: []
    };

    Object.entries(stats).forEach(([name, metric]) => {
      if (metric.avgDuration > 100) { // Slow operations (>100ms)
        summary.slowOperations.push({
          name,
          avgDuration: metric.avgDuration,
          count: metric.count
        });
      } else if (metric.avgDuration < 10) { // Fast operations (<10ms)
        summary.fastOperations.push({
          name,
          avgDuration: metric.avgDuration,
          count: metric.count
        });
      }
    });

    // Generate recommendations
    if (summary.slowOperations.length > 0) {
      summary.recommendations.push(
        `${summary.slowOperations.length} operations are performing slowly (>100ms average)`
      );
    }

    if (stats.navigation && stats.navigation.avgDuration > 3000) {
      summary.recommendations.push('Page load time is above 3 seconds - consider optimization');
    }

    return summary;
  }

  /**
   * Add performance observer
   */
  addObserver(callback) {
    this.observers.push(callback);
  }

  /**
   * Remove performance observer
   */
  removeObserver(callback) {
    const index = this.observers.indexOf(callback);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  /**
   * Notify all observers
   */
  notifyObservers(metricName, data) {
    this.observers.forEach(callback => {
      try {
        callback(metricName, data);
      } catch (error) {
        console.error('Error in performance observer:', error);
      }
    });
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics.clear();
    console.log('Performance metrics cleared');
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics() {
    return JSON.stringify(this.getReport(), null, 2);
  }

  /**
   * Send metrics to analytics service
   */
  async sendToAnalytics(endpoint = '/api/analytics/performance') {
    try {
      const report = this.getReport();
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log('Performance metrics sent to analytics');
      return await response.json();
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
      throw error;
    }
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Auto-start monitoring in development mode
if (process.env.NODE_ENV === 'development') {
  performanceMonitor.start();
}

// Hook for performance monitoring in React components
export function usePerformanceMonitor() {
  return {
    measure: performanceMonitor.measure.bind(performanceMonitor),
    measureAsync: performanceMonitor.measureAsync.bind(performanceMonitor),
    mark: performanceMonitor.mark.bind(performanceMonitor),
    measureBetween: performanceMonitor.measureBetween.bind(performanceMonitor),
    getStats: performanceMonitor.getStats.bind(performanceMonitor),
    getReport: performanceMonitor.getReport.bind(performanceMonitor)
  };
}

// Higher-order component for performance monitoring
export function withPerformanceMonitoring(WrappedComponent) {
  return function WithPerformanceMonitoring(props) {
    const { measure } = usePerformanceMonitor();
    
    const renderStartTime = performance.now();
    
    return (
      <>
        <WrappedComponent {...props} />
        {/* Performance monitoring can be added here if needed */}
      </>
    );
  };
}

// Performance monitoring utilities
export const performance = {
  monitor: performanceMonitor,
  measure: (name, fn) => performanceMonitor.measure(name, fn),
  measureAsync: (name, fn) => performanceMonitor.measureAsync(name, fn),
  mark: (name) => performanceMonitor.mark(name),
  measureBetween: (name, start, end) => performanceMonitor.measureBetween(name, start, end),
  getStats: () => performanceMonitor.getStats(),
  getReport: () => performanceMonitor.getReport(),
  start: () => performanceMonitor.start(),
  stop: () => performanceMonitor.stop()
};

export default performanceMonitor;
