import { spawn, ChildProcess } from 'child_process';
import path from 'path';

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

type ResponseCallback = (response: any) => void;

export class EyeTraxService {
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

  /**
   * Start the Python EyeTrax service
   */
  async start(): Promise<void> {
    if (this.process) {
      console.warn('EyeTrax service already running');
      return;
    }

    // Get the path to the Python script
    const scriptPath = path.join(__dirname, '../../python/eyetrax_service.py');
    
    console.log('🐍 Starting EyeTrax Python service...');
    console.log('Script path:', scriptPath);

    // Spawn Python process
    this.process = spawn('python3', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
    });

    // Handle stdout (JSON responses)
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

    // Handle stderr (logs)
    this.process.stderr?.on('data', (data) => {
      console.log('[Python]', data.toString().trim());
    });

    // Handle process exit
    this.process.on('exit', (code) => {
      console.log(`Python process exited with code ${code}`);
      this.process = null;
      this.isReady = false;
    });

    this.process.on('error', (error) => {
      console.error('Python process error:', error);
    });

    // Wait for ready message
    await this.readyPromise;
    console.log('✅ EyeTrax service ready');
  }

  /**
   * Stop the Python service
   */
  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.isReady = false;
    }
  }

  /**
   * Handle incoming messages from Python
   */
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

  /**
   * Send a command to Python and get response
   */
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

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.callbacks.has(requestId)) {
          this.callbacks.delete(requestId);
          reject(new Error('Command timeout'));
        }
      }, 10000);

      // Send command
      this.process?.stdin?.write(JSON.stringify(cmd) + '\n');
    });
  }

  /**
   * Register callback for continuous gaze updates
   */
  onGazeUpdate(callback: (data: GazeUpdate) => void): void {
    this.gazeUpdateCallback = callback;
  }

  /**
   * Start camera
   */
  async startCamera(cameraId = 0): Promise<void> {
    await this.sendCommand('start_camera', { camera_id: cameraId });
  }

  /**
   * Start tracking (begins continuous gaze updates)
   */
  async startTracking(): Promise<void> {
    await this.sendCommand('start_tracking');
  }

  /**
   * Stop tracking
   */
  async stopTracking(): Promise<void> {
    await this.sendCommand('stop_tracking');
  }

  /**
   * Add a calibration point
   */
  async addCalibrationPoint(screenX: number, screenY: number): Promise<number> {
    const response = await this.sendCommand('add_calibration_point', {
      screen_x: screenX,
      screen_y: screenY,
    });
    return response.count;
  }

  /**
   * Train the gaze estimation model
   */
  async trainModel(): Promise<number> {
    const response = await this.sendCommand('train_model');
    return response.points;
  }

  /**
   * Clear calibration data
   */
  async clearCalibration(): Promise<void> {
    await this.sendCommand('clear_calibration');
  }

  /**
   * Get single gaze reading (use onGazeUpdate for continuous tracking)
   */
  async getGaze(): Promise<GazeUpdate> {
    const response = await this.sendCommand('get_gaze');
    return response;
  }

  /**
   * Ping the service
   */
  async ping(): Promise<boolean> {
    try {
      await this.sendCommand('ping');
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let eyeTraxService: EyeTraxService | null = null;

export function getEyeTraxService(): EyeTraxService {
  if (!eyeTraxService) {
    eyeTraxService = new EyeTraxService();
  }
  return eyeTraxService;
}


