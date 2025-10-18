import { app, BrowserWindow, ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Declare Vite environment variables
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// ============================================================================
// EyeTrax Service (inlined to avoid build issues)
// ============================================================================

interface GazeData {
  x: number;
  y: number;
}

interface GazeUpdate {
  gaze: GazeData | null;
  blink: boolean;
  no_face?: boolean;
  not_calibrated?: boolean;
}

type ResponseCallback = (response: any) => void;

class EyeTraxService {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private callbacks = new Map<number, ResponseCallback>();
  private gazeUpdateCallback: ((data: GazeUpdate) => void) | null = null;
  private isReady = false;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;

  constructor() {
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });
  }

  async start(): Promise<void> {
    if (this.process) {
      console.warn('EyeTrax service already running');
      return;
    }

    // In development: __dirname is .vite/build/
    // In production: __dirname is inside the asar
    // Python script is in project root/python/
    const isDev = MAIN_WINDOW_VITE_DEV_SERVER_URL !== undefined;
    const scriptPath = isDev
      ? path.join(__dirname, '../../python/eyetrax_service.py')
      : path.join(process.resourcesPath, 'python/eyetrax_service.py');
    
    // Determine Python interpreter (use venv in dev, system python in prod)
    const pythonPath = isDev 
      ? path.join(scriptPath, '..', '..', 'venv', 'bin', 'python')
      : 'python3';

    console.log('🐍 Starting EyeTrax Python service...');
    console.log('Script path:', scriptPath);
    console.log('Python path:', pythonPath);
    console.log('__dirname:', __dirname);
    console.log('isDev:', isDev);

    this.process = spawn(pythonPath, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.process.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          this.handleMessage(msg);
        } catch (e) {
          console.error('Failed to parse JSON from Python:', line, e);
        }
      }
    });

    this.process.stderr?.on('data', (data) => {
      console.log('[Python]', data.toString().trim());
    });

    this.process.on('exit', (code) => {
      console.log(`Python process exited with code ${code}`);
      this.process = null;
      this.isReady = false;
    });

    this.process.on('error', (error) => {
      console.error('Python process error:', error);
    });

    await this.readyPromise;
    console.log('✅ EyeTrax service ready');
  }

  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.isReady = false;
    }
  }

  private handleMessage(msg: any): void {
    if (msg.type === 'ready') {
      this.isReady = true;
      this.readyResolve();
    } else if (msg.type === 'response') {
      const callback = this.callbacks.get(msg.request_id);
      if (callback) {
        callback(msg);
        this.callbacks.delete(msg.request_id);
      }
    } else if (msg.type === 'gaze_update') {
      if (this.gazeUpdateCallback) {
        this.gazeUpdateCallback(msg.data);
      }
    } else if (msg.type === 'error') {
      console.error('[Python Error]', msg.error);
    }
  }

  private async sendCommand(command: string, params: any = {}): Promise<any> {
    if (!this.process || !this.isReady) {
      throw new Error('EyeTrax service not ready');
    }

    const requestId = this.requestId++;
    const cmd = { command, request_id: requestId, ...params };

    return new Promise((resolve, reject) => {
      this.callbacks.set(requestId, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Unknown error'));
        }
      });

      setTimeout(() => {
        if (this.callbacks.has(requestId)) {
          this.callbacks.delete(requestId);
          reject(new Error('Command timeout'));
        }
      }, 10000);

      this.process?.stdin?.write(JSON.stringify(cmd) + '\n');
    });
  }

  onGazeUpdate(callback: (data: GazeUpdate) => void): void {
    this.gazeUpdateCallback = callback;
  }

  async startCamera(cameraId = 0): Promise<void> {
    await this.sendCommand('start_camera', { camera_id: cameraId });
  }

  async startTracking(): Promise<void> {
    await this.sendCommand('start_tracking');
  }

  async stopTracking(): Promise<void> {
    await this.sendCommand('stop_tracking');
  }

  async addCalibrationPoint(screenX: number, screenY: number): Promise<number> {
    const response = await this.sendCommand('add_calibration_point', {
      screen_x: screenX,
      screen_y: screenY,
    });
    return response.count;
  }

  async trainModel(): Promise<number> {
    const response = await this.sendCommand('train_model');
    return response.points;
  }

  async clearCalibration(): Promise<void> {
    await this.sendCommand('clear_calibration');
  }
}

let eyeTraxService: EyeTraxService | null = null;

function getEyeTraxService(): EyeTraxService {
  if (!eyeTraxService) {
    eyeTraxService = new EyeTraxService();
  }
  return eyeTraxService;
}

// ============================================================================
// End EyeTrax Service
// ============================================================================

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    center: true,
    backgroundColor: '#0D0D0D',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Handle camera permission requests
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true); // Allow camera access
    } else {
      callback(false);
    }
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // Wait a bit for Vite to be fully ready before loading
    setTimeout(() => {
      mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    }, 2000);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
  
  return mainWindow;
};


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// Initialize EyeTrax service
let mainWindow: BrowserWindow | null = null;

// Set up IPC handlers BEFORE app is ready
function setupEyeTraxHandlers() {
  const eyetrax = getEyeTraxService();
  
  ipcMain.handle('eyetrax:start-camera', async (_event, cameraId) => {
    try {
      await eyetrax.startCamera(cameraId);
      return { success: true };
    } catch (error: any) {
      console.error('Error starting camera:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('eyetrax:start-tracking', async () => {
    try {
      await eyetrax.startTracking();
      return { success: true };
    } catch (error: any) {
      console.error('Error starting tracking:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('eyetrax:stop-tracking', async () => {
    try {
      await eyetrax.stopTracking();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('eyetrax:add-calibration-point', async (_event, x, y) => {
    try {
      const count = await eyetrax.addCalibrationPoint(x, y);
      return { success: true, count };
    } catch (error: any) {
      console.error('Error adding calibration point:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('eyetrax:train-model', async () => {
    try {
      const points = await eyetrax.trainModel();
      return { success: true, points };
    } catch (error: any) {
      console.error('Error training model:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('eyetrax:clear-calibration', async () => {
    try {
      await eyetrax.clearCalibration();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('eyetrax:get-gaze', async () => {
    try {
      // Not used in streaming mode, but available if needed
      return { success: true, data: null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}

// Register handlers immediately
setupEyeTraxHandlers();

app.on('ready', async () => {
  // Start EyeTrax Python service FIRST
  const eyetrax = getEyeTraxService();
  try {
    await eyetrax.start();
    
    // Register gaze update callback
    eyetrax.onGazeUpdate((data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('eyetrax:gaze-update', data);
      }
    });
    
    console.log('✅ EyeTrax service started successfully');
  } catch (error) {
    console.error('❌ Failed to start EyeTrax service:', error);
  }
  
  // Now create the window
  mainWindow = createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // Stop EyeTrax service
  const eyetrax = getEyeTraxService();
  eyetrax.stop();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
