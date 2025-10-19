import { app, BrowserWindow, ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
import { getChromeMonitor, ChromeSnapshot } from './services/ChromeMonitor';
import { getWindowMonitor, WindowSnapshot } from './services/WindowMonitor';
import { getLLMReasoningEngine } from './services/LLMReasoningEngine';

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

    // Handle stdout data
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

    // Handle stderr data
    this.process.stderr?.on('data', (data) => {
      try {
        console.log('[Python]', data.toString().trim());
      } catch (e) {
        // Ignore EPIPE errors when logging
      }
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      console.log(`Python process exited with code ${code} and signal ${signal}`);
      this.cleanup();
    });

    // Handle process errors
    this.process.on('error', (error) => {
      console.error('Python process error:', error);
      this.cleanup();
    });

    // Handle broken pipe errors
    this.process.stdin?.on('error', (error: any) => {
      if (error.code === 'EPIPE') {
        console.warn('Python process stdin pipe broken (process may have exited)');
        this.cleanup();
      } else {
        console.error('Python stdin error:', error);
      }
    });

    this.process.stdout?.on('error', (error: any) => {
      if (error.code !== 'EPIPE') {
        console.error('Python stdout error:', error);
      }
    });

    this.process.stderr?.on('error', (error: any) => {
      if (error.code !== 'EPIPE') {
        console.error('Python stderr error:', error);
      }
    });

    await this.readyPromise;
    console.log('✅ EyeTrax service ready');
  }

  private cleanup(): void {
    if (this.process) {
      // Remove all listeners to prevent memory leaks
      this.process.removeAllListeners();
      this.process.stdout?.removeAllListeners();
      this.process.stderr?.removeAllListeners();
      this.process.stdin?.removeAllListeners();
      
      this.process = null;
      this.isReady = false;
      this.callbacks.clear();
    }
  }

  stop(): void {
    if (this.process) {
      this.process.kill();
      this.cleanup();
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

  async sendCommand(command: string, params: any = {}, timeoutMs: number = 10000): Promise<any> {
    if (!this.process || !this.isReady) {
      throw new Error('EyeTrax service not ready');
    }

    // Check if process is still alive and stdin is writable
    if (this.process.killed || !this.process.stdin?.writable) {
      throw new Error('EyeTrax process has exited');
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

      // Set timeout (60 seconds for calibration, 10 seconds for other commands)
      const timeout = setTimeout(() => {
        if (this.callbacks.has(requestId)) {
          this.callbacks.delete(requestId);
          reject(new Error(`Command timeout after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      try {
        this.process!.stdin!.write(JSON.stringify(cmd) + '\n', (error) => {
          if (error) {
            clearTimeout(timeout);
            this.callbacks.delete(requestId);
            // Check if it's an EPIPE error (process died)
            if ((error as any).code === 'EPIPE') {
              reject(new Error('EyeTrax process has exited unexpectedly'));
              this.cleanup();
            } else {
              reject(error);
            }
          }
        });
      } catch (error: any) {
        clearTimeout(timeout);
        this.callbacks.delete(requestId);
        reject(error);
      }
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

// Set up IPC handlers BEFORE app is ready (using native EyeTrax calibration)
function setupEyeTraxHandlers() {
  const service = getEyeTraxService();
  
  // Native EyeTrax calibration (fullscreen UI) - needs longer timeout!
  ipcMain.handle('eyetrax:run-calibration', async (_event, cameraId: number = 0) => {
    try {
      console.log('[Electron] Running native EyeTrax calibration...');
      // Calibration takes ~20-30 seconds (2s per point × 9 points + setup time)
      // Use 60 second timeout to be safe
      const response = await service.sendCommand('run_calibration', { camera_id: cameraId }, 60000);
      return response;
    } catch (error: any) {
      console.error('Error running calibration:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('eyetrax:start-tracking', async () => {
    try {
      const response = await service.sendCommand('start_tracking', {});
      return response;
    } catch (error: any) {
      console.error('Error starting tracking:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('eyetrax:stop-tracking', async () => {
    try {
      const response = await service.sendCommand('stop_tracking', {});
      return response;
    } catch (error: any) {
      console.error('Error stopping tracking:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('eyetrax:save-model', async (_event, filepath?: string) => {
    try {
      const response = await service.sendCommand('save_model', { 
        filepath: filepath || 'flowsync_gaze_model.pkl' 
      });
      return response;
    } catch (error: any) {
      console.error('Error saving model:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('eyetrax:load-model', async (_event, filepath?: string) => {
    try {
      const response = await service.sendCommand('load_model', { 
        filepath: filepath || 'flowsync_gaze_model.pkl' 
      });
      return response;
    } catch (error: any) {
      console.error('Error loading model:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('eyetrax:clear-calibration', async () => {
    try {
      const response = await service.sendCommand('clear_calibration', {});
      return response;
    } catch (error: any) {
      console.error('Error clearing calibration:', error);
      return { success: false, error: error.message };
    }
  });
}

// ============================================================================
// Window Monitor Setup
// ============================================================================

function setupWindowMonitorHandlers() {
  const monitor = getWindowMonitor(2000); // Poll every 2 seconds

  // Start window tracking
  ipcMain.handle('window:start-tracking', async () => {
    try {
      monitor.startPolling();
      return { success: true };
    } catch (error: any) {
      console.error('[Window] Failed to start tracking:', error);
      return { success: false, error: error.message };
    }
  });

  // Stop window tracking
  ipcMain.handle('window:stop-tracking', async () => {
    try {
      monitor.stopPolling();
      return { success: true };
    } catch (error: any) {
      console.error('[Window] Failed to stop tracking:', error);
      return { success: false, error: error.message };
    }
  });

  // Get current window snapshot
  ipcMain.handle('window:get-snapshot', async () => {
    try {
      const snapshot: WindowSnapshot = monitor.getSnapshot();
      return { success: true, snapshot };
    } catch (error: any) {
      console.error('[Window] Failed to get snapshot:', error);
      return { success: false, error: error.message };
    }
  });

  // Get app time spent
  ipcMain.handle('window:get-app-time', async () => {
    try {
      const appTime = monitor.getAppTimeSpent();
      return { success: true, appTime };
    } catch (error: any) {
      console.error('[Window] Failed to get app time:', error);
      return { success: false, error: error.message };
    }
  });

  // Get window history
  ipcMain.handle('window:get-history', async () => {
    try {
      const history = monitor.getHistory();
      return { success: true, history };
    } catch (error: any) {
      console.error('[Window] Failed to get history:', error);
      return { success: false, error: error.message };
    }
  });

  // Check if specific app is active
  ipcMain.handle('window:is-app-active', async (_event, appName: string) => {
    try {
      const isActive = monitor.isAppActive(appName);
      return { success: true, isActive };
    } catch (error: any) {
      console.error('[Window] Failed to check app status:', error);
      return { success: false, error: error.message };
    }
  });

  // Get current window title
  ipcMain.handle('window:get-current-title', async () => {
    try {
      const title = monitor.getCurrentWindowTitle();
      return { success: true, title };
    } catch (error: any) {
      console.error('[Window] Failed to get current title:', error);
      return { success: false, error: error.message };
    }
  });

  // Get rich context data for LLM reasoning
  ipcMain.handle('window:get-rich-context', async () => {
    try {
      const richContext = monitor.getRichContext();
      return { success: true, context: richContext };
    } catch (error: any) {
      console.error('[Window] Failed to get rich context:', error);
      return { success: false, error: error.message };
    }
  });

  // Cleanup window monitor
  ipcMain.handle('window:cleanup', async () => {
    try {
      monitor.cleanup();
      return { success: true };
    } catch (error: any) {
      console.error('[Window] Cleanup failed:', error);
      return { success: false, error: error.message };
    }
  });
}

// ============================================================================
// Chrome Monitor Setup
// ============================================================================

function setupChromeMonitorHandlers() {
  console.log('[Chrome] Setting up Chrome monitor handlers...');
  const monitor = getChromeMonitor(9222);
  console.log('[Chrome] Chrome monitor initialized');

  // Check if Chrome with remote debugging is available
  ipcMain.handle('chrome:check-available', async () => {
    try {
      const available = await monitor.isAvailable();
      return { success: true, available };
    } catch (error: any) {
      console.error('[Chrome] Availability check failed:', error);
      return { success: false, available: false, error: error.message };
    }
  });

  // Get full Chrome snapshot with tab metadata and content
  ipcMain.handle('chrome:get-snapshot', async (_event, options?: { extractContent: boolean }) => {
    try {
      const snapshot: ChromeSnapshot = await monitor.getSnapshot(
        options || { extractContent: true }
      );
      return { success: true, snapshot };
    } catch (error: any) {
      console.error('[Chrome] Failed to get snapshot:', error);
      return { success: false, error: error.message };
    }
  });

  // Get just tab metadata (faster, no content extraction)
  ipcMain.handle('chrome:list-tabs', async () => {
    try {
      const tabs = await monitor.listTabs();
      return { success: true, tabs };
    } catch (error: any) {
      console.error('[Chrome] Failed to list tabs:', error);
      return { success: false, error: error.message };
    }
  });

  // Get rich context data for LLM reasoning
  ipcMain.handle('chrome:get-rich-context', async () => {
    try {
      console.log('[Chrome] Getting rich context...');
      const richContext = await monitor.getRichContext();
      console.log('[Chrome] Rich context retrieved successfully');
      return { success: true, context: richContext };
    } catch (error: any) {
      console.error('[Chrome] Failed to get rich context:', error);
      return { success: false, error: error.message };
    }
  });

  // Get comprehensive content summary for LLM analysis
  ipcMain.handle('chrome:get-content-summary', async () => {
    try {
      console.log('[Chrome] Getting content summary...');
      const contentSummary = await monitor.getContentSummary();
      console.log('[Chrome] Content summary retrieved successfully');
      return { success: true, summary: contentSummary };
    } catch (error: any) {
      console.error('[Chrome] Failed to get content summary:', error);
      return { success: false, error: error.message };
    }
  });
  
  console.log('[Chrome] All Chrome monitor handlers registered');

  // Cleanup old activity data
  ipcMain.handle('chrome:cleanup', async () => {
    try {
      monitor.cleanup();
      return { success: true };
    } catch (error: any) {
      console.error('[Chrome] Cleanup failed:', error);
      return { success: false, error: error.message };
    }
  });
}

// ============================================================================
// LLM Reasoning Engine Setup
// ============================================================================

function setupLLMReasoningHandlers() {
  const llmEngine = getLLMReasoningEngine();

  // Analyze flow state
  ipcMain.handle('llm:analyze-flow-state', async () => {
    try {
      console.log('[LLM] Analyzing flow state...');
      const flowState = await llmEngine.analyzeFlowState();
      console.log('[LLM] Flow state analysis complete');
      return { success: true, flowState };
    } catch (error: any) {
      console.error('[LLM] Failed to analyze flow state:', error);
      return { success: false, error: error.message };
    }
  });

  // Generate workspace optimization
  ipcMain.handle('llm:generate-workspace-optimization', async () => {
    try {
      console.log('[LLM] Generating workspace optimization...');
      const optimization = await llmEngine.generateWorkspaceOptimization();
      console.log('[LLM] Workspace optimization generated');
      return { success: true, optimization };
    } catch (error: any) {
      console.error('[LLM] Failed to generate workspace optimization:', error);
      return { success: false, error: error.message };
    }
  });

  // Generate session insights
  ipcMain.handle('llm:generate-session-insights', async () => {
    try {
      console.log('[LLM] Generating session insights...');
      const insights = await llmEngine.generateSessionInsights();
      console.log('[LLM] Session insights generated');
      return { success: true, insights };
    } catch (error: any) {
      console.error('[LLM] Failed to generate session insights:', error);
      return { success: false, error: error.message };
    }
  });

  // Get comprehensive analysis (all three in one call)
  ipcMain.handle('llm:get-comprehensive-analysis', async () => {
    try {
      console.log('[LLM] Getting comprehensive analysis...');
      const analysis = await llmEngine.getComprehensiveAnalysis();
      console.log('[LLM] Comprehensive analysis complete');
      return { success: true, ...analysis };
    } catch (error: any) {
      console.error('[LLM] Failed to get comprehensive analysis:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[LLM] All LLM reasoning handlers registered');
}

// Register handlers immediately
setupEyeTraxHandlers();
setupWindowMonitorHandlers();
setupChromeMonitorHandlers();
setupLLMReasoningHandlers();

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
