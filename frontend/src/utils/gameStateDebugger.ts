/**
 * Game State Debugger utility
 * Provides debugging functions for tracking and troubleshooting game state in the multiplayer Truco game
 */

// Store debug history for troubleshooting
interface DebugStateEntry {
  timestamp: string;
  type: 'socket' | 'state' | 'error' | 'action' | 'sync';
  data: any;
}

class GameStateDebugger {
  private static instance: GameStateDebugger;
  private debugHistory: DebugStateEntry[] = [];
  private isDebugMode: boolean = false;
  private retryCount: { [key: string]: number } = {};

  private constructor() {
    // Read from localStorage or URL params to determine if debug mode is enabled
    this.isDebugMode = 
      localStorage.getItem('truco_debug_mode') === 'true' ||
      window.location.search.includes('debug=true');
    
    if (this.isDebugMode) {
      console.log('[DEBUG] Game state debugger initialized in DEBUG mode');
      this.exposeToWindow();
    }
  }

  public static getInstance(): GameStateDebugger {
    if (!GameStateDebugger.instance) {
      GameStateDebugger.instance = new GameStateDebugger();
    }
    return GameStateDebugger.instance;
  }

  public logSocketEvent(eventName: string, data: any): void {
    this.addToHistory('socket', { event: eventName, data });
    
    if (this.isDebugMode) {
      console.log(`[SOCKET] ${eventName}`, data);
    }
  }

  public logStateUpdate(label: string, state: any): void {
    this.addToHistory('state', { label, state });
    
    if (this.isDebugMode) {
      console.log(`[STATE] ${label}`, state);
    }
  }

  public logError(message: string, error: any): void {
    this.addToHistory('error', { message, error });
    
    // Always log errors regardless of debug mode
    console.error(`[ERROR] ${message}`, error);
  }

  public logAction(action: string, data: any): void {
    this.addToHistory('action', { action, data });
    
    if (this.isDebugMode) {
      console.log(`[ACTION] ${action}`, data);
    }
  }
  
  public logSync(status: string, data: any): void {
    this.addToHistory('sync', { status, data });
    
    // Always log sync issues regardless of debug mode
    console.log(`[SYNC] ${status}`, data);
  }

  public trackRetry(operation: string): number {
    if (!this.retryCount[operation]) {
      this.retryCount[operation] = 0;
    }
    
    this.retryCount[operation]++;
    
    if (this.isDebugMode) {
      console.log(`[RETRY] ${operation}: Attempt #${this.retryCount[operation]}`);
    }
    
    return this.retryCount[operation];
  }

  public resetRetryCount(operation: string): void {
    this.retryCount[operation] = 0;
  }

  public getRetryCount(operation: string): number {
    return this.retryCount[operation] || 0;
  }

  public getDebugHistory(): DebugStateEntry[] {
    return [...this.debugHistory];
  }

  public clearHistory(): void {
    this.debugHistory = [];
  }

  public toggleDebugMode(): boolean {
    this.isDebugMode = !this.isDebugMode;
    localStorage.setItem('truco_debug_mode', String(this.isDebugMode));
    
    if (this.isDebugMode) {
      this.exposeToWindow();
      console.log('[DEBUG] Debug mode enabled');
    } else {
      console.log('[DEBUG] Debug mode disabled');
    }
    
    return this.isDebugMode;
  }

  public isDebugging(): boolean {
    return this.isDebugMode;
  }

  private addToHistory(type: 'socket' | 'state' | 'error' | 'action' | 'sync', data: any): void {
    this.debugHistory.push({
      timestamp: new Date().toISOString(),
      type,
      data
    });
    
    // Keep history at a reasonable size
    if (this.debugHistory.length > 1000) {
      this.debugHistory.shift();
    }
  }

  private exposeToWindow(): void {
    (window as any).gameDebugger = {
      getHistory: () => this.getDebugHistory(),
      toggle: () => this.toggleDebugMode(),
      clear: () => this.clearHistory(),
      printSocketEvents: () => {
        return this.debugHistory
          .filter(entry => entry.type === 'socket')
          .map(entry => `${entry.timestamp} - ${entry.data.event}`);
      },
      getConnectionStatus: () => {
        const socketEntries = this.debugHistory.filter(entry => 
          entry.type === 'socket' && 
          ['connect', 'disconnect', 'connect_error', 'reconnect', 'reconnect_attempt']
            .includes(entry.data.event)
        );
        return socketEntries;
      }
    };
    
    console.log('Debug utilities available as window.gameDebugger');
  }
}

export default GameStateDebugger.getInstance();
