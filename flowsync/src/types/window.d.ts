// Type definitions for window.eyetrax API

export interface EyeTraxAPI {
  // Native EyeTrax calibration (fullscreen UI, handles everything)
  runCalibration: (cameraId?: number) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
    model?: string;
    kalman_enabled?: boolean;
  }>;
  
  // Tracking control
  startTracking: () => Promise<{ success: boolean; error?: string }>;
  stopTracking: () => Promise<{ success: boolean }>;
  
  // Model persistence
  saveModel: (filepath?: string) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }>;
  loadModel: (filepath?: string) => Promise<{
    success: boolean;
    path?: string;
    message?: string;
    error?: string;
  }>;
  
  // Calibration management
  clearCalibration: () => Promise<{ success: boolean }>;
  
  // Gaze updates (streaming)
  onGazeUpdate: (callback: (data: GazeUpdate) => void) => void;
  removeGazeListener: () => void;
}

export interface GazeUpdate {
  success: boolean;
  gaze: { x: number; y: number } | null;
  raw_gaze?: { x: number; y: number } | null;
  blink: boolean;
  no_face: boolean;
  not_calibrated?: boolean;
  error?: string;
}

// Chrome Monitor API types
export interface ChromeTab {
  metadata: {
    id: string;
    title: string;
    url: string;
    type: string;
    faviconUrl?: string;
  };
  content?: {
    text: string;
    headings: string[];
    codeBlocks: number;
    scrollPosition: number;
    scrollHeight: number;
    visibleText: string;
  };
  activity: {
    timeSpent: number;
    lastActive: number;
    isActive: boolean;
    networkActive: boolean;
  };
}

export interface ChromeSnapshot {
  timestamp: number;
  tabs: ChromeTab[];
  activeTabs: ChromeTab[];
  totalTabs: number;
}

export interface ChromeAPI {
  checkAvailable: () => Promise<{
    success: boolean;
    available: boolean;
    error?: string;
  }>;
  getSnapshot: (options?: { extractContent: boolean }) => Promise<{
    success: boolean;
    snapshot?: ChromeSnapshot;
    error?: string;
  }>;
  listTabs: () => Promise<{
    success: boolean;
    tabs?: Array<{
      id: string;
      title: string;
      url: string;
      type: string;
      faviconUrl?: string;
    }>;
    error?: string;
  }>;
  getRichContext: () => Promise<{ success: boolean; context?: any; error?: string }>;
  getContentSummary: () => Promise<{ success: boolean; summary?: any; error?: string }>;
  closeTabs: (urlsToClose: string[]) => Promise<{ success: boolean; closedCount: number; error?: string }>;
  cleanup: () => Promise<{ success: boolean; error?: string }>;
}

// Window Monitor API types
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
  url?: string;
  memoryUsage?: number;
}

export interface WindowHistoryEntry {
  window: WindowInfo;
  timestamp: number;
  duration: number;
}

export interface WindowSnapshot {
  timestamp: number;
  activeWindow: WindowInfo | null;
  recentHistory: WindowHistoryEntry[];
  appTimeSpent: Record<string, number>;
}

export interface WindowAPI {
  startTracking: () => Promise<{ success: boolean; error?: string }>;
  stopTracking: () => Promise<{ success: boolean; error?: string }>;
  getSnapshot: () => Promise<{ success: boolean; snapshot?: WindowSnapshot; error?: string }>;
  getAppTime: () => Promise<{ success: boolean; appTime?: Record<string, number>; error?: string }>;
  getHistory: () => Promise<{ success: boolean; history?: WindowHistoryEntry[]; error?: string }>;
  isAppActive: (appName: string) => Promise<{ success: boolean; isActive?: boolean; error?: string }>;
  getCurrentTitle: () => Promise<{ success: boolean; title?: string | null; error?: string }>;
  getRichContext: () => Promise<{ success: boolean; context?: any; error?: string }>;
  cleanup: () => Promise<{ success: boolean; error?: string }>;
}

interface LLMReasoningAPI {
  analyzeFlowState: () => Promise<{ success: boolean; flowState?: any; error?: string }>;
  generateWorkspaceOptimization: () => Promise<{ success: boolean; optimization?: any; error?: string }>;
  generateSessionInsights: () => Promise<{ success: boolean; insights?: any; error?: string }>;
  getComprehensiveAnalysis: () => Promise<{ success: boolean; flowState?: any; optimization?: any; insights?: any; error?: string }>;
}

declare global {
  interface Window {
    eyetrax: EyeTraxAPI;
    chromeMonitor: ChromeAPI;
    flowsyncWindowAPI: WindowAPI;
    llmReasoning: LLMReasoningAPI;
    electronAPI: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}
