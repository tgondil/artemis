// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// Expose EyeTrax API to renderer
contextBridge.exposeInMainWorld('eyetrax', {
  startCamera: (cameraId: number) => ipcRenderer.invoke('eyetrax:start-camera', cameraId),
  startTracking: () => ipcRenderer.invoke('eyetrax:start-tracking'),
  stopTracking: () => ipcRenderer.invoke('eyetrax:stop-tracking'),
  addCalibrationPoint: (x: number, y: number) => ipcRenderer.invoke('eyetrax:add-calibration-point', x, y),
  trainModel: () => ipcRenderer.invoke('eyetrax:train-model'),
  clearCalibration: () => ipcRenderer.invoke('eyetrax:clear-calibration'),
  getGaze: () => ipcRenderer.invoke('eyetrax:get-gaze'),
  onGazeUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on('eyetrax:gaze-update', (_event, data) => callback(data));
  },
  removeGazeListener: () => {
    ipcRenderer.removeAllListeners('eyetrax:gaze-update');
  },
});
