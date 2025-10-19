import { activeWindow } from 'get-windows';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

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
      // Use our custom function that fixes the path issue
      const win = await getActiveWindowWithCorrectPath();
      if (!win) {
        return null;
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