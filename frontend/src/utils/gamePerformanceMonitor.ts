/**
 * Game Performance Monitor - Telemetry system for tracking game performance metrics
 * Implements next step recommendation from RACE_CONDITION_FIX_REPORT.md
 */

interface PerformanceMetric {
  timestamp: number;
  metric: string;
  value: number;
  metadata?: Record<string, any>;
}

interface GameSessionMetrics {
  sessionId: string;
  startTime: number;
  gameStartTime?: number;
  connectionTime?: number;
  stateReceivedTime?: number;
  recoveryAttempts: number;
  cacheHits: number;
  localStorageHits: number;
  networkErrors: number;
  totalStateUpdates: number;
  averageLatency: number;
  userAgent: string;
}

class GamePerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private sessionMetrics: GameSessionMetrics;
  private isEnabled: boolean = true;
  private latencyMeasurements: number[] = [];

  constructor() {
    this.sessionMetrics = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      recoveryAttempts: 0,
      cacheHits: 0,
      localStorageHits: 0,
      networkErrors: 0,
      totalStateUpdates: 0,
      averageLatency: 0,
      userAgent: navigator.userAgent
    };

    // Start collecting baseline metrics
    this.collectBrowserMetrics();
    this.startPeriodicCollection();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private collectBrowserMetrics(): void {
    // Collect browser and device information
    this.recordMetric('device_memory', (navigator as any).deviceMemory || 0);
    this.recordMetric('hardware_concurrency', navigator.hardwareConcurrency || 0);
    this.recordMetric('connection_type', (navigator as any).connection?.effectiveType || 'unknown');
    this.recordMetric('online_status', navigator.onLine ? 1 : 0);
  }

  private startPeriodicCollection(): void {
    // Collect metrics every 30 seconds
    setInterval(() => {
      if (this.isEnabled) {
        this.collectPerformanceMetrics();
        this.cleanOldMetrics();
      }
    }, 30000);
  }

  private collectPerformanceMetrics(): void {
    // Memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.recordMetric('heap_used', memory.usedJSHeapSize);
      this.recordMetric('heap_total', memory.totalJSHeapSize);
      this.recordMetric('heap_limit', memory.jsHeapSizeLimit);
    }

    // Connection status
    this.recordMetric('online_status', navigator.onLine ? 1 : 0);
    
    // Page visibility
    this.recordMetric('page_visible', document.hidden ? 0 : 1);
  }

  private cleanOldMetrics(): void {
    // Keep only last 1000 metrics or last hour of data
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.metrics = this.metrics
      .filter(metric => metric.timestamp > oneHourAgo)
      .slice(-1000);
  }

  // Game-specific tracking methods
  public trackGameStart(): void {
    this.sessionMetrics.gameStartTime = Date.now();
    this.recordMetric('game_start', 1);
    console.log('🎮 [Performance] Game started');
  }

  public trackConnectionTime(duration: number): void {
    this.sessionMetrics.connectionTime = duration;
    this.recordMetric('connection_time', duration);
    console.log(`🔗 [Performance] Connection established in ${duration}ms`);
  }

  public trackStateReceived(latency?: number): void {
    this.sessionMetrics.stateReceivedTime = Date.now();
    this.sessionMetrics.totalStateUpdates++;
    
    if (latency !== undefined) {
      this.latencyMeasurements.push(latency);
      this.updateAverageLatency();
      this.recordMetric('state_latency', latency);
    }
    
    this.recordMetric('state_received', 1);
    console.log(`📊 [Performance] State received (latency: ${latency || 'unknown'}ms)`);
  }

  public trackCacheHit(source: 'server' | 'localStorage'): void {
    if (source === 'server') {
      this.sessionMetrics.cacheHits++;
    } else {
      this.sessionMetrics.localStorageHits++;
    }
    
    this.recordMetric(`cache_hit_${source}`, 1);
    console.log(`💾 [Performance] Cache hit from ${source}`);
  }

  public trackRecoveryAttempt(reason: string): void {
    this.sessionMetrics.recoveryAttempts++;
    this.recordMetric('recovery_attempt', 1, { reason });
    console.log(`🔄 [Performance] Recovery attempt: ${reason}`);
  }

  public trackNetworkError(error: string): void {
    this.sessionMetrics.networkErrors++;
    this.recordMetric('network_error', 1, { error });
    console.log(`❌ [Performance] Network error: ${error}`);
  }

  public trackInfiniteLoadingPrevented(): void {
    this.recordMetric('infinite_loading_prevented', 1);
    console.log('🛡️ [Performance] Infinite loading prevented by solution');
  }

  public trackLoadingTimeout(timeoutDuration: number): void {
    this.recordMetric('loading_timeout', timeoutDuration);
    console.log(`⏰ [Performance] Loading timeout after ${timeoutDuration}ms`);
  }

  private updateAverageLatency(): void {
    if (this.latencyMeasurements.length > 0) {
      const sum = this.latencyMeasurements.reduce((a, b) => a + b, 0);
      this.sessionMetrics.averageLatency = sum / this.latencyMeasurements.length;
      
      // Keep only last 50 measurements
      if (this.latencyMeasurements.length > 50) {
        this.latencyMeasurements = this.latencyMeasurements.slice(-50);
      }
    }
  }

  private recordMetric(metric: string, value: number, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    this.metrics.push({
      timestamp: Date.now(),
      metric,
      value,
      metadata
    });
  }

  // Analysis and reporting methods
  public getSessionSummary(): GameSessionMetrics {
    return { ...this.sessionMetrics };
  }

  public getMetricsReport(): string {
    const duration = Date.now() - this.sessionMetrics.startTime;
    const durationMinutes = Math.round(duration / 60000);
    
    return `
🎮 GAME PERFORMANCE REPORT
========================
Session ID: ${this.sessionMetrics.sessionId}
Duration: ${durationMinutes} minutes

📊 CONNECTION METRICS
- Connection Time: ${this.sessionMetrics.connectionTime || 'N/A'}ms
- Average Latency: ${Math.round(this.sessionMetrics.averageLatency)}ms
- State Updates: ${this.sessionMetrics.totalStateUpdates}

💾 CACHE PERFORMANCE
- Server Cache Hits: ${this.sessionMetrics.cacheHits}
- LocalStorage Hits: ${this.sessionMetrics.localStorageHits}
- Recovery Attempts: ${this.sessionMetrics.recoveryAttempts}

⚡ RELIABILITY
- Network Errors: ${this.sessionMetrics.networkErrors}
- Error Rate: ${((this.sessionMetrics.networkErrors / Math.max(this.sessionMetrics.totalStateUpdates, 1)) * 100).toFixed(1)}%

🔧 BROWSER INFO
- User Agent: ${this.sessionMetrics.userAgent.split(' ').slice(0, 3).join(' ')}...
- Online: ${navigator.onLine ? 'Yes' : 'No'}
    `.trim();
  }

  public exportMetrics(): { session: GameSessionMetrics; metrics: PerformanceMetric[] } {
    return {
      session: this.getSessionSummary(),
      metrics: [...this.metrics]
    };
  }

  public enable(): void {
    this.isEnabled = true;
    console.log('📈 [Performance] Monitoring enabled');
  }

  public disable(): void {
    this.isEnabled = false;
    console.log('📈 [Performance] Monitoring disabled');
  }

  // Static method to create and access global instance
  private static instance: GamePerformanceMonitor | null = null;

  public static getInstance(): GamePerformanceMonitor {
    if (!GamePerformanceMonitor.instance) {
      GamePerformanceMonitor.instance = new GamePerformanceMonitor();
    }
    return GamePerformanceMonitor.instance;
  }
}

// Export singleton instance
export const gamePerformanceMonitor = GamePerformanceMonitor.getInstance();
export default gamePerformanceMonitor;
