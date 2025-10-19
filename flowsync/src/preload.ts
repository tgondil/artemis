import { contextBridge, ipcRenderer } from 'electron';

console.log('[Preload] Loading preload script...');

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

// Expose Chrome Monitor API to renderer
contextBridge.exposeInMainWorld('chromeMonitor', {
  // Check if Chrome with remote debugging is available
  checkAvailable: () => ipcRenderer.invoke('chrome:check-available'),
  
  // Get full snapshot with tab content
  getSnapshot: (options?: { extractContent: boolean }) => 
    ipcRenderer.invoke('chrome:get-snapshot', options),
  
  // Get just tab metadata (faster)
  listTabs: () => ipcRenderer.invoke('chrome:list-tabs'),
  
  // Cleanup old activity data
  cleanup: () => ipcRenderer.invoke('chrome:cleanup'),
});

// Expose Window Monitor API to renderer
contextBridge.exposeInMainWorld('flowsyncWindowAPI', {
  // Start/stop window tracking
  startTracking: () => ipcRenderer.invoke('window:start-tracking'),
  stopTracking: () => ipcRenderer.invoke('window:stop-tracking'),
  
  // Get window data
  getSnapshot: () => ipcRenderer.invoke('window:get-snapshot'),
  getAppTime: () => ipcRenderer.invoke('window:get-app-time'),
  getHistory: () => ipcRenderer.invoke('window:get-history'),
  
  // Check app status
  isAppActive: (appName: string) => ipcRenderer.invoke('window:is-app-active', appName),
  getCurrentTitle: () => ipcRenderer.invoke('window:get-current-title'),
  
  // Cleanup
  cleanup: () => ipcRenderer.invoke('window:cleanup'),
});
