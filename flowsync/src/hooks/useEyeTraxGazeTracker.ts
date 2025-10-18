import { useState, useEffect, useCallback, useRef } from 'react';
import { GazeMetrics } from '../types';

interface GazePoint {
  x: number;
  y: number;
}

/**
 * Hook for EyeTrax gaze tracking (native calibration version)
 * Uses EyeTrax's built-in 9-point calibration UI
 */
export function useEyeTraxGazeTracker() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [gazePoint, setGazePoint] = useState<GazePoint | null>(null);
  const [metrics, setMetrics] = useState<GazeMetrics>({
    fixationStability: 0,
    blinkRate: 0,
    saccadeVelocity: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const lastGazePointRef = useRef<GazePoint | null>(null);
  const gazeHistoryRef = useRef<GazePoint[]>([]);
  const blinkCountRef = useRef(0);
  const frameCountRef = useRef(0);

  // Initialize on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.eyetrax) {
      console.log('✅ EyeTrax API available');
      setIsInitialized(true);
    } else {
      console.error('❌ EyeTrax API not available');
      setError('EyeTrax API not available');
    }
  }, []);

  // Subscribe to gaze updates
  useEffect(() => {
    if (!window.eyetrax) return;

    const handleGazeUpdate = (data: any) => {
      frameCountRef.current++;

      if (data.blink) {
        blinkCountRef.current++;
        setGazePoint(null);
        return;
      }

      if (data.no_face) {
        setGazePoint(null);
        return;
      }

      if (data.gaze) {
        // Python returns screen pixels, we need to normalize to 0-1 for the cursor
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        
        const normalizedPoint = {
          x: data.gaze.x / screenWidth,
          y: data.gaze.y / screenHeight,
        };
        
        // Throttle updates (max 20fps to avoid overwhelming React)
        if (frameCountRef.current % 3 === 0) {
          setGazePoint(normalizedPoint);
        }

        // Track history for metrics (use raw pixels for variance calculation)
        const rawPoint = { x: data.gaze.x, y: data.gaze.y };
        gazeHistoryRef.current.push(rawPoint);
        if (gazeHistoryRef.current.length > 30) {
          gazeHistoryRef.current.shift();
        }

        // Calculate metrics
        if (gazeHistoryRef.current.length >= 10) {
          const history = gazeHistoryRef.current;
          
          // Fixation stability (inverse of variance)
          const xVar = calculateVariance(history.map(p => p.x));
          const yVar = calculateVariance(history.map(p => p.y));
          const totalVar = Math.sqrt(xVar + yVar);
          const stability = Math.max(0, Math.min(100, 100 - totalVar / 5));

          // Blink rate (blinks per minute)
          const blinkRate = (blinkCountRef.current / frameCountRef.current) * 60 * 20; // Assuming 20fps

          // Saccade velocity (pixels per second)
          let saccadeVelocity = 0;
          if (lastGazePointRef.current) {
            const dx = rawPoint.x - lastGazePointRef.current.x;
            const dy = rawPoint.y - lastGazePointRef.current.y;
            saccadeVelocity = Math.sqrt(dx * dx + dy * dy) * 20; // * fps
          }

          setMetrics({
            fixationStability: stability,
            blinkRate: Math.round(blinkRate),
            saccadeVelocity: Math.round(saccadeVelocity),
          });
        }

        lastGazePointRef.current = rawPoint;
      }
    };

    window.eyetrax.onGazeUpdate(handleGazeUpdate);

    return () => {
      window.eyetrax.removeGazeListener();
    };
  }, []);

  /**
   * Run native EyeTrax calibration (fullscreen UI)
   */
  const runCalibration = useCallback(async (cameraId: number = 0) => {
    if (!window.eyetrax) {
      throw new Error('EyeTrax not available');
    }

    try {
      console.log('🎯 Starting native EyeTrax calibration...');
      const result = await window.eyetrax.runCalibration(cameraId);
      
      if (result.success) {
        console.log('✅ Calibration complete!', result);
        // CRITICAL: Set React state to match Python state
        setIsCalibrated(true);
        setError(null);
        console.log('📝 React isCalibrated state set to TRUE');
        return result;
      } else {
        throw new Error(result.error || 'Calibration failed');
      }
    } catch (err: any) {
      console.error('❌ Calibration error:', err);
      setError(err.message);
      setIsCalibrated(false);
      throw err;
    }
  }, []);

  /**
   * Start gaze tracking (after calibration)
   * Note: Removed isCalibrated dependency to avoid stale closure issues
   * Python backend is the source of truth for calibration state
   */
  const startTracking = useCallback(async () => {
    if (!window.eyetrax) {
      throw new Error('EyeTrax not available');
    }

    try {
      console.log('▶️ Starting tracking...');
      // Let Python backend check if calibrated (no stale React state!)
      const result = await window.eyetrax.startTracking();
      
      if (result.success) {
        setIsTracking(true);
        setIsCalibrated(true); // Update React state to match
        setError(null);
        
        // Reset metrics
        frameCountRef.current = 0;
        blinkCountRef.current = 0;
        gazeHistoryRef.current = [];
        
        console.log('✅ Tracking started successfully');
        return result;
      } else {
        throw new Error(result.error || 'Failed to start tracking');
      }
    } catch (err: any) {
      console.error('❌ Start tracking error:', err);
      setError(err.message);
      throw err;
    }
  }, []); // Empty deps - no stale closure issues!

  /**
   * Stop gaze tracking
   */
  const stopTracking = useCallback(async () => {
    if (!window.eyetrax) return;

    try {
      console.log('⏸️ Stopping tracking...');
      await window.eyetrax.stopTracking();
      setIsTracking(false);
      setGazePoint(null);
    } catch (err: any) {
      console.error('❌ Stop tracking error:', err);
      setError(err.message);
    }
  }, []);

  /**
   * Clear calibration (allows recalibrating)
   */
  const clearCalibration = useCallback(async () => {
    if (!window.eyetrax) return;

    try {
      await window.eyetrax.clearCalibration();
      setIsCalibrated(false);
      setIsTracking(false);
      setGazePoint(null);
      console.log('🧹 Calibration cleared');
    } catch (err: any) {
      console.error('❌ Clear calibration error:', err);
      setError(err.message);
    }
  }, []);

  /**
   * Save trained model
   */
  const saveModel = useCallback(async (filepath?: string) => {
    if (!window.eyetrax) {
      throw new Error('EyeTrax not available');
    }

    try {
      const result = await window.eyetrax.saveModel(filepath);
      if (result.success) {
        console.log('💾 Model saved:', result.path);
        return result;
      } else {
        throw new Error(result.error || 'Failed to save model');
      }
    } catch (err: any) {
      console.error('❌ Save model error:', err);
      throw err;
    }
  }, []);

  /**
   * Load trained model (skip calibration)
   */
  const loadModel = useCallback(async (filepath?: string) => {
    if (!window.eyetrax) {
      throw new Error('EyeTrax not available');
    }

    try {
      const result = await window.eyetrax.loadModel(filepath);
      if (result.success) {
        console.log('📂 Model loaded:', result.path);
        setIsCalibrated(true);
        setError(null);
        return result;
      } else {
        throw new Error(result.error || 'Failed to load model');
      }
    } catch (err: any) {
      console.error('❌ Load model error:', err);
      setError(err.message);
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
    runCalibration,
    startTracking,
    stopTracking,
    clearCalibration,
    saveModel,
    loadModel,
  };
}

// Helper function
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
}
