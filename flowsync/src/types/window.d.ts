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
  cleanup: () => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    eyetrax: EyeTraxAPI;
    chrome: ChromeAPI;
  }
}
