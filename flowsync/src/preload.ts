import { contextBridge, ipcRenderer } from 'electron';

// Expose EyeTrax API to renderer (using native EyeTrax calibration)
contextBridge.exposeInMainWorld('eyetrax', {
  // Native EyeTrax 9-point calibration (fullscreen UI)
  runCalibration: (cameraId: number) => ipcRenderer.invoke('eyetrax:run-calibration', cameraId),
  
  // Tracking control
  startTracking: () => ipcRenderer.invoke('eyetrax:start-tracking'),
  stopTracking: () => ipcRenderer.invoke('eyetrax:stop-tracking'),
  
  // Model persistence
  saveModel: (filepath?: string) => ipcRenderer.invoke('eyetrax:save-model', filepath),
  loadModel: (filepath?: string) => ipcRenderer.invoke('eyetrax:load-model', filepath),
  
  // Calibration management
  clearCalibration: () => ipcRenderer.invoke('eyetrax:clear-calibration'),
  
  // Gaze updates (streaming)
  onGazeUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on('eyetrax:gaze-update', (_event, data) => callback(data));
  },
  removeGazeListener: () => {
    ipcRenderer.removeAllListeners('eyetrax:gaze-update');
  },
});
