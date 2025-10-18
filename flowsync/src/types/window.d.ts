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

declare global {
  interface Window {
    eyetrax: EyeTraxAPI;
  }
}
