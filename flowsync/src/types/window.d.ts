export interface GazeData {
  x: number;
  y: number;
}

export interface GazeUpdate {
  gaze: GazeData | null;
  blink: boolean;
  no_face?: boolean;
  not_calibrated?: boolean;
}

export interface EyeTraxAPI {
  startCamera: (cameraId: number) => Promise<{ success: boolean; error?: string }>;
  startTracking: () => Promise<{ success: boolean; error?: string }>;
  stopTracking: () => Promise<{ success: boolean; error?: string }>;
  addCalibrationPoint: (x: number, y: number) => Promise<{ success: boolean; count?: number; error?: string }>;
  trainModel: () => Promise<{ success: boolean; points?: number; error?: string }>;
  clearCalibration: () => Promise<{ success: boolean; error?: string }>;
  getGaze: () => Promise<{ success: boolean; data?: GazeUpdate; error?: string }>;
  onGazeUpdate: (callback: (data: GazeUpdate) => void) => void;
  removeGazeListener: () => void;
}

declare global {
  interface Window {
    eyetrax: EyeTraxAPI;
  }
}


