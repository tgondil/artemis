import { activeWindow } from 'get-windows';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Helper function to analyze window context and extract rich information
function analyzeWindowContext(win: any): Partial<WindowInfo> {
  const now = Date.now();
  
  // Extract file path from title (common patterns)
  let filePath: string | undefined;
  let projectContext: string | undefined;
  let windowType: WindowInfo['windowType'] = 'other';
  
  // Analyze title for context clues
  const title = win.title || '';
  const appName = win.owner?.name || '';
  
  // File path extraction (VS Code, editors, etc.)
  if (title.includes(' — ') || title.includes(' - ')) {
    const parts = title.split(/[—\-]/);
    if (parts.length > 1) {
      filePath = parts[1].trim();
    }
  }
  
  // Project context extraction
  if (filePath) {
    const pathParts = filePath.split('/');
    if (pathParts.length > 1) {
      projectContext = pathParts[pathParts.length - 2]; // Parent directory
    }
  }
  
  // Window type classification
  if (appName.toLowerCase().includes('code') || 
      appName.toLowerCase().includes('cursor') ||
      appName.toLowerCase().includes('sublime') ||
      appName.toLowerCase().includes('atom')) {
    windowType = 'coding';
  } else if (appName.toLowerCase().includes('chrome') ||
             appName.toLowerCase().includes('firefox') ||
             appName.toLowerCase().includes('safari')) {
    windowType = 'research';
  } else if (appName.toLowerCase().includes('slack') ||
             appName.toLowerCase().includes('discord') ||
             appName.toLowerCase().includes('teams')) {
    windowType = 'communication';
  } else if (appName.toLowerCase().includes('spotify') ||
             appName.toLowerCase().includes('youtube') ||
             appName.toLowerCase().includes('netflix')) {
    windowType = 'entertainment';
  } else if (appName.toLowerCase().includes('notion') ||
             appName.toLowerCase().includes('obsidian') ||
             appName.toLowerCase().includes('todo')) {
    windowType = 'productivity';
  }
  
  return {
    filePath,
    projectContext,
    focusDuration: 0, // Will be calculated by the monitor
    lastActivity: now,
    windowType
  };
}

// Custom activeWindow function that uses the correct binary path
async function getActiveWindowWithCorrectPath(): Promise<any> {
  try {
    // Use the correct path to the get-windows binary
    const binaryPath = path.join(process.cwd(), 'node_modules', 'get-windows', 'main');
    const { stdout } = await execFileAsync(binaryPath);
    return JSON.parse(stdout);
  } catch (error) {
    console.error('[WindowMonitor] Custom activeWindow failed:', error);
    return null;
  }
}

export interface WindowInfo {
  title: string;
  owner: {
    name: string;
    processId: number;
    path: string;
  };
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  url?: string; // Available for browsers
  memoryUsage?: number;
  // Enhanced context fields
  filePath?: string;
  projectContext?: string;
  focusDuration: number;
  lastActivity: number;
  windowType: 'coding' | 'research' | 'communication' | 'entertainment' | 'productivity' | 'other';
}

export interface WindowHistoryEntry {
  window: WindowInfo;
  timestamp: number;
  duration: number; // milliseconds spent in this window
}

export interface WindowSnapshot {
  timestamp: number;
  activeWindow: WindowInfo | null;
  recentHistory: WindowHistoryEntry[]; // Last 10 minutes
  appTimeSpent: Record<string, number>; // milliseconds per app
}

export class WindowMonitor {
  private pollInterval: NodeJS.Timeout | null = null;
  private pollIntervalMs: number = 2000; // Poll every 2 seconds
  private history: WindowHistoryEntry[] = [];
  private currentWindow: WindowInfo | null = null;
  private lastPollTime: number = Date.now();
  private maxHistoryDuration: number = 10 * 60 * 1000; // 10 minutes
  private isPolling: boolean = false;

  constructor(pollIntervalMs: number = 2000) {
    this.pollIntervalMs = pollIntervalMs;
  }

  /**
   * Get the currently active window
   */
  async getActiveWindow(): Promise<WindowInfo | null> {
    try {
      console.log('[WindowMonitor] Getting active window...');
      // Use our custom function that fixes the path issue
      const win = await getActiveWindowWithCorrectPath();
      console.log('[WindowMonitor] Active window result:', win);
      if (!win) {
        console.log('[WindowMonitor] No active window found');
        return null;
      }

      // Analyze window context for rich information
      const context = analyzeWindowContext(win);
      
      // Calculate focus duration if this is the same window
      const now = Date.now();
      let focusDuration = 0;
      if (this.currentWindow && 
          this.currentWindow.owner.processId === win.owner.processId &&
          this.currentWindow.title === win.title) {
        focusDuration = this.currentWindow.focusDuration + (now - this.lastPollTime);
      }

      return {
        title: win.title,
        owner: {
          name: win.owner.name,
          processId: win.owner.processId,
          path: win.owner.path,
        },
        bounds: {
          x: win.bounds.x,
          y: win.bounds.y,
          width: win.bounds.width,
          height: win.bounds.height,
        },
        url: 'url' in win ? win.url : undefined,
        memoryUsage: 'memoryUsage' in win ? win.memoryUsage : undefined,
        // Enhanced context
        filePath: context.filePath,
        projectContext: context.projectContext,
        focusDuration,
        lastActivity: now,
        windowType: context.windowType || 'other',
      };
    } catch (error: any) {
      const errorMessage = error.message || error.toString();
      console.error('[WindowMonitor] Failed to get active window:', errorMessage);
      
      // Check for common permission errors
      if (errorMessage.includes('screen recording permission') || 
          errorMessage.includes('Screen Recording') ||
          errorMessage.includes('Command failed')) {
        console.error('[WindowMonitor] ⚠️  Screen Recording permission required!');
        console.error('[WindowMonitor] Please grant permission in: System Settings › Privacy & Security › Screen Recording');
        console.error('[WindowMonitor] Look for "Electron" in the list and enable it');
        console.error('[WindowMonitor] If you don\'t see "Electron", add this path:');
        console.error('[WindowMonitor] /Users/tanay/artemis/flowsync/node_modules/electron/dist/Electron.app');
      }
      
      return null;
    }
  }

  /**
   * Check if a point (x, y) is inside a window's bounds
   */
  isPointInWindow(x: number, y: number, window: WindowInfo): boolean {
    const { bounds } = window;
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }

  /**
   * Determine which window the user is looking at based on gaze position
   */
  getGazedWindow(gazeX: number, gazeY: number): WindowInfo | null {
    // For now, we only track the active window
    // To track all windows, we'd need additional APIs
    if (this.currentWindow && this.isPointInWindow(gazeX, gazeY, this.currentWindow)) {
      return this.currentWindow;
    }
    return null;
  }

  /**
   * Start polling for active window changes
   */
  startPolling(): void {
    if (this.isPolling) {
      console.warn('[WindowMonitor] Already polling');
      return;
    }

    this.isPolling = true;
    this.lastPollTime = Date.now();

    // Do initial poll
    this.poll();

    // Set up interval
    this.pollInterval = setInterval(() => {
      this.poll();
    }, this.pollIntervalMs);
  }

  /**
   * Stop polling for active window changes
   */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      this.isPolling = false;
      console.log('[WindowMonitor] Stopped window tracking');
    }
  }

  /**
   * Internal poll method
   */
  private async poll(): Promise<void> {
    const now = Date.now();
    const newWindow = await this.getActiveWindow();

    if (!newWindow) {
      this.lastPollTime = now;
      return;
    }

    // Check if window changed
    const windowChanged = !this.currentWindow || 
      this.currentWindow.owner.processId !== newWindow.owner.processId ||
      this.currentWindow.title !== newWindow.title;

    if (windowChanged && this.currentWindow) {
      // Save previous window to history
      const duration = now - this.lastPollTime;
      this.history.push({
        window: this.currentWindow,
        timestamp: this.lastPollTime,
        duration,
      });

      // Clean old history (keep only last 10 minutes)
      this.cleanHistory(now);
    }

    this.currentWindow = newWindow;
    this.lastPollTime = now;
  }

  /**
   * Remove history entries older than maxHistoryDuration
   */
  private cleanHistory(now: number): void {
    const cutoff = now - this.maxHistoryDuration;
    this.history = this.history.filter(entry => entry.timestamp > cutoff);
  }

  /**
   * Get window history (last 10 minutes)
   */
  getHistory(): WindowHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Calculate time spent per application
   */
  getAppTimeSpent(): Record<string, number> {
    const appTime: Record<string, number> = {};

    // Add current window time if active
    if (this.currentWindow) {
      const currentDuration = Date.now() - this.lastPollTime;
      const appName = this.currentWindow.owner.name;
      appTime[appName] = currentDuration;
    }

    // Add historical time
    for (const entry of this.history) {
      const appName = entry.window.owner.name;
      appTime[appName] = (appTime[appName] || 0) + entry.duration;
    }

    return appTime;
  }

  /**
   * Get a complete snapshot of window activity
   */
  getSnapshot(): WindowSnapshot {
    return {
      timestamp: Date.now(),
      activeWindow: this.currentWindow,
      recentHistory: this.getHistory(),
      appTimeSpent: this.getAppTimeSpent(),
    };
  }

  /**
   * Get comprehensive context data for LLM reasoning
   */
  getRichContext(): {
    currentTask: {
      app: string;
      filePath?: string;
      project?: string;
      windowType: string;
      focusDuration: number;
    };
    sessionContext: {
      totalSessionTime: number;
      primaryActivity: string;
      focusStability: number;
      taskSwitches: number;
    };
    behavioralPatterns: {
      averageFocusDuration: number;
      mostUsedApps: Array<{app: string, time: number}>;
      windowTypeDistribution: Record<string, number>;
    };
  } {
    console.log('[WindowMonitor] Getting rich context...');
    console.log('[WindowMonitor] Current window:', this.currentWindow);
    console.log('[WindowMonitor] History length:', this.history.length);
    const now = Date.now();
    const sessionStart = this.history.length > 0 ? this.history[0].timestamp : now;
    const totalSessionTime = now - sessionStart;
    
    // Calculate focus stability (percentage of time in same window)
    const recentHistory = this.getHistory();
    const sameWindowTime = this.currentWindow ? this.currentWindow.focusDuration : 0;
    const focusStability = totalSessionTime > 0 ? (sameWindowTime / totalSessionTime) * 100 : 0;
    
    // Count task switches
    const taskSwitches = recentHistory.filter((entry, index) => 
      index > 0 && entry.window.owner.processId !== recentHistory[index - 1].window.owner.processId
    ).length;
    
    // Calculate average focus duration
    const focusDurations = recentHistory.map(entry => entry.duration);
    const averageFocusDuration = focusDurations.length > 0 
      ? focusDurations.reduce((a, b) => a + b, 0) / focusDurations.length 
      : 0;
    
    // Get most used apps
    const appTimeSpent = this.getAppTimeSpent();
    const mostUsedApps = Object.entries(appTimeSpent)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([app, time]) => ({ app, time }));
    
    // Window type distribution
    const windowTypeDistribution: Record<string, number> = {};
    recentHistory.forEach(entry => {
      const type = entry.window.windowType;
      windowTypeDistribution[type] = (windowTypeDistribution[type] || 0) + entry.duration;
    });
    
    return {
      currentTask: {
        app: this.currentWindow?.owner.name || 'Unknown',
        filePath: this.currentWindow?.filePath,
        project: this.currentWindow?.projectContext,
        windowType: this.currentWindow?.windowType || 'other',
        focusDuration: this.currentWindow?.focusDuration || 0,
      },
      sessionContext: {
        totalSessionTime,
        primaryActivity: this.getPrimaryActivity(),
        focusStability,
        taskSwitches,
      },
      behavioralPatterns: {
        averageFocusDuration,
        mostUsedApps,
        windowTypeDistribution,
      },
    };
  }

  /**
   * Determine the primary activity based on time spent
   */
  private getPrimaryActivity(): string {
    const appTimeSpent = this.getAppTimeSpent();
    const sortedApps = Object.entries(appTimeSpent).sort(([,a], [,b]) => b - a);
    return sortedApps.length > 0 ? sortedApps[0][0] : 'Unknown';
  }

  /**
   * Check if user is focused on a specific app
   */
  isAppActive(appName: string): boolean {
    return this.currentWindow?.owner.name.toLowerCase().includes(appName.toLowerCase()) || false;
  }

  /**
   * Get the current window title (useful for quick checks)
   */
  getCurrentWindowTitle(): string | null {
    return this.currentWindow?.title || null;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stopPolling();
    this.history = [];
    this.currentWindow = null;
  }
}

// Singleton instance
let monitorInstance: WindowMonitor | null = null;

export function getWindowMonitor(pollIntervalMs: number = 2000): WindowMonitor {
  if (!monitorInstance) {
    monitorInstance = new WindowMonitor(pollIntervalMs);
  }
  return monitorInstance;
}