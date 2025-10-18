import { useState, useEffect, useCallback, useRef } from 'react';
import { GazeMetrics } from '../types';

interface GazePoint {
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  timestamp: number;
}

const HISTORY_DURATION = 5000; // 5 seconds
const BLINK_THRESHOLD = 0.2;
const SACCADE_THRESHOLD = 0.1;

/**
 * Custom hook for EyeTrax-based gaze tracking
 * Uses Python backend with machine learning for high accuracy
 */
export const useEyeTraxGazeTracker = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [gazePoint, setGazePoint] = useState<GazePoint | null>(null);
  const [metrics, setMetrics] = useState<GazeMetrics>({
    fixationStability: 0,
    blinkRate: 0,
    saccadeRate: 0,
    pupilVariance: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [isCalibrated, setIsCalibrated] = useState(false);

  // History for metric calculations
  const gazeHistoryRef = useRef<GazePoint[]>([]);
  const blinkHistoryRef = useRef<{ timestamp: number; isBlink: boolean }[]>([]);
  const saccadeHistoryRef = useRef<{ timestamp: number; isSaccade: boolean }[]>([]);
  const lastGazeRef = useRef<GazePoint | null>(null);

  // Screen dimensions for normalization
  const [screenWidth] = useState(window.screen.width);
  const [screenHeight] = useState(window.screen.height);

  // Initialize connection to Python backend
  useEffect(() => {
    const init = async () => {
      console.log('🔵 Initializing EyeTrax...');
      
      // Check if eyetrax API is available
      if (!window.eyetrax) {
        setError('EyeTrax API not available');
        console.error('❌ EyeTrax API not found on window object');
        return;
      }

      // Register gaze update listener
      window.eyetrax.onGazeUpdate((data) => {
        handleGazeUpdate(data);
      });

      setIsInitialized(true);
      console.log('✅ EyeTrax initialized');
    };

    init();

    return () => {
      if (window.eyetrax) {
        window.eyetrax.removeGazeListener();
      }
    };
  }, []);

  // Handle incoming gaze updates from Python
  const handleGazeUpdate = useCallback((data: any) => {
    const now = Date.now();

    // Handle blinks
    if (data.blink) {
      blinkHistoryRef.current.push({ timestamp: now, isBlink: true });
      setGazePoint(null); // Hide cursor during blink
      return;
    }

    // Handle no face / not calibrated
    if (data.no_face || data.not_calibrated || !data.gaze) {
      return;
    }

    // Normalize gaze coordinates (Python returns screen pixels)
    const normalizedGaze: GazePoint = {
      x: Math.max(0, Math.min(1, data.gaze.x / screenWidth)),
      y: Math.max(0, Math.min(1, data.gaze.y / screenHeight)),
      timestamp: now,
    };

    // Update state
    setGazePoint(normalizedGaze);
    gazeHistoryRef.current.push(normalizedGaze);

    // Detect saccades (rapid eye movements)
    if (lastGazeRef.current) {
      const distance = Math.sqrt(
        Math.pow(normalizedGaze.x - lastGazeRef.current.x, 2) +
        Math.pow(normalizedGaze.y - lastGazeRef.current.y, 2)
      );
      
      if (distance > SACCADE_THRESHOLD) {
        saccadeHistoryRef.current.push({ timestamp: now, isSaccade: true });
      }
    }

    lastGazeRef.current = normalizedGaze;

    // Update metrics periodically
    if (now % 500 < 50) {
      calculateMetrics();
    }
  }, [screenWidth, screenHeight]);

  // Calculate gaze metrics
  const calculateMetrics = useCallback(() => {
    const now = Date.now();
    const cutoff = now - HISTORY_DURATION;

    // Filter history
    gazeHistoryRef.current = gazeHistoryRef.current.filter(g => g.timestamp > cutoff);
    blinkHistoryRef.current = blinkHistoryRef.current.filter(b => b.timestamp > cutoff);
    saccadeHistoryRef.current = saccadeHistoryRef.current.filter(s => s.timestamp > cutoff);

    // Fixation stability (variance of gaze points)
    let fixationStability = 0;
    if (gazeHistoryRef.current.length > 1) {
      const avgX = gazeHistoryRef.current.reduce((sum, g) => sum + g.x, 0) / gazeHistoryRef.current.length;
      const avgY = gazeHistoryRef.current.reduce((sum, g) => sum + g.y, 0) / gazeHistoryRef.current.length;
      const variance = gazeHistoryRef.current.reduce(
        (sum, g) => sum + Math.pow(g.x - avgX, 2) + Math.pow(g.y - avgY, 2),
        0
      ) / gazeHistoryRef.current.length;
      fixationStability = Math.max(0, 100 - variance * 5000);
    }

    // Blink rate (blinks per minute)
    const totalBlinks = blinkHistoryRef.current.filter(b => b.isBlink).length;
    const blinkRate = (totalBlinks / (HISTORY_DURATION / 1000)) * 60;

    // Saccade rate (saccades per second)
    const totalSaccades = saccadeHistoryRef.current.filter(s => s.isSaccade).length;
    const saccadeRate = totalSaccades / (HISTORY_DURATION / 1000);

    setMetrics({
      fixationStability: Math.round(fixationStability * 10) / 10,
      blinkRate: Math.round(blinkRate * 10) / 10,
      saccadeRate: Math.round(saccadeRate * 10) / 10,
      pupilVariance: 0, // Not available from EyeTrax
    });
  }, []);

  // Start camera (for calibration)
  const startCamera = useCallback(async () => {
    console.log('🔵 Starting camera for calibration...');
    
    if (!isInitialized) {
      setError('EyeTrax not initialized');
      return;
    }

    try {
      const cameraResult = await window.eyetrax.startCamera(0);
      if (!cameraResult.success) {
        throw new Error(cameraResult.error || 'Failed to start camera');
      }
      console.log('✅ Camera started');
      setError(null);
    } catch (err: any) {
      console.error('❌ Failed to start camera:', err);
      setError(err.message);
      throw err;
    }
  }, [isInitialized]);

  // Start tracking loop (AFTER calibration)
  const startTracking = useCallback(async () => {
    console.log('🔵 Starting EyeTrax tracking loop...');
    
    if (!isInitialized) {
      setError('EyeTrax not initialized');
      return;
    }

    try {
      // Start tracking loop
      const trackingResult = await window.eyetrax.startTracking();
      if (!trackingResult.success) {
        throw new Error(trackingResult.error || 'Failed to start tracking');
      }
      console.log('✅ Tracking loop started');

      setIsTracking(true);
      setError(null);
    } catch (err: any) {
      console.error('❌ Failed to start tracking:', err);
      setError(err.message);
    }
  }, [isInitialized]);

  // Stop tracking
  const stopTracking = useCallback(async () => {
    console.log('🛑 Stopping EyeTrax tracking...');
    
    try {
      await window.eyetrax.stopTracking();
      setIsTracking(false);
      setGazePoint(null);
      setError(null);
      console.log('✅ Tracking stopped');
    } catch (err: any) {
      console.error('❌ Failed to stop tracking:', err);
      setError(err.message);
    }
  }, []);

  // Add calibration point
  const addCalibrationPoint = useCallback(async (screenX: number, screenY: number): Promise<number> => {
    console.log(`📍 Adding calibration point: (${screenX}, ${screenY})`);
    
    try {
      if (!isInitialized) {
        throw new Error('EyeTrax not initialized');
      }
      
      // Ensure camera is started (idempotent - safe to call multiple times)
      await window.eyetrax.startCamera(0);
      
      const result = await window.eyetrax.addCalibrationPoint(screenX, screenY);
      if (!result.success) {
        throw new Error(result.error || 'Failed to add calibration point');
      }
      console.log(`✅ Calibration point added (${result.count} unique points)`);
      return result.count || 0;
    } catch (err: any) {
      console.error('❌ Failed to add calibration point:', err);
      throw err;
    }
  }, [isInitialized]);

  // Train model with calibration data
  const trainModel = useCallback(async (): Promise<void> => {
    console.log('🔵 Training gaze estimation model...');
    
    try {
      const result = await window.eyetrax.trainModel();
      if (!result.success) {
        throw new Error(result.error || 'Failed to train model');
      }
      console.log(`✅ Model trained with ${result.points} points`);
      setIsCalibrated(true);
    } catch (err: any) {
      console.error('❌ Failed to train model:', err);
      throw err;
    }
  }, []);

  // Clear calibration
  const clearCalibration = useCallback(async (): Promise<void> => {
    console.log('🔵 Clearing calibration...');
    
    try {
      await window.eyetrax.clearCalibration();
      setIsCalibrated(false);
      gazeHistoryRef.current = [];
      blinkHistoryRef.current = [];
      saccadeHistoryRef.current = [];
      setMetrics({
        fixationStability: 0,
        blinkRate: 0,
        saccadeRate: 0,
        pupilVariance: 0,
      });
      console.log('✅ Calibration cleared');
    } catch (err: any) {
      console.error('❌ Failed to clear calibration:', err);
      throw err;
    }
  }, []);

  return {
    isInitialized,
    isTracking,
    isCalibrated,
    gazePoint,
    metrics,
    error,
    startCamera,
    startTracking,
    stopTracking,
    addCalibrationPoint,
    trainModel,
    clearCalibration,
  };
};

