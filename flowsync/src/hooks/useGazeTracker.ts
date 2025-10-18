import { useState, useEffect, useRef, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { GazeMetrics } from '../types';

interface GazePoint {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  timestamp: number;
}

interface UseGazeTrackerReturn {
  isInitialized: boolean;
  isTracking: boolean;
  gazePoint: GazePoint | null;
  metrics: GazeMetrics;
  error: string | null;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  calibrate: () => Promise<void>;
}

const METRIC_WINDOW_SIZE = 5000; // 5 seconds
const BLINK_THRESHOLD = 0.15; // EAR threshold for blink detection

export function useGazeTracker(): UseGazeTrackerReturn {
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

  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // History for metric calculations
  const gazeHistoryRef = useRef<GazePoint[]>([]);
  const blinkHistoryRef = useRef<{ timestamp: number; isBlink: boolean }[]>([]);
  const saccadeHistoryRef = useRef<{ timestamp: number; isSaccade: boolean }[]>([]);
  const lastStateUpdateRef = useRef<number>(0);
  const THROTTLE_MS = 50; // Update state max once per 50ms (20 fps)
  const smoothedGazeRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  // Initialize MediaPipe FaceLandmarker
  useEffect(() => {
    const initializeFaceLandmarker = async () => {
      console.log('🔵 Starting MediaPipe initialization...');
      try {
        console.log('🔵 Loading vision tasks...');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        console.log('✅ Vision tasks loaded');

        console.log('🔵 Creating face landmarker...');
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });
        console.log('✅ Face landmarker created');

        faceLandmarkerRef.current = faceLandmarker;
        setIsInitialized(true);
        console.log('✅ MediaPipe fully initialized!');
      } catch (err) {
        setError(`Failed to initialize face landmarker: ${err}`);
        console.error('❌ MediaPipe initialization error:', err);
      }
    };

    initializeFaceLandmarker();

    return () => {
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
      }
    };
  }, []);

  // Calculate Eye Aspect Ratio (EAR) for blink detection
  const calculateEAR = (eyeLandmarks: number[][]): number => {
    if (eyeLandmarks.length < 6) return 1;

    const p2 = eyeLandmarks[1];
    const p3 = eyeLandmarks[2];
    const p4 = eyeLandmarks[3];
    const p5 = eyeLandmarks[4];
    const p1 = eyeLandmarks[0];
    const p6 = eyeLandmarks[5];

    const verticalDist1 = Math.sqrt(
      Math.pow(p2[0] - p4[0], 2) + Math.pow(p2[1] - p4[1], 2)
    );
    const verticalDist2 = Math.sqrt(
      Math.pow(p3[0] - p5[0], 2) + Math.pow(p3[1] - p5[1], 2)
    );
    const horizontalDist = Math.sqrt(
      Math.pow(p1[0] - p6[0], 2) + Math.pow(p1[1] - p6[1], 2)
    );

    return (verticalDist1 + verticalDist2) / (2.0 * horizontalDist);
  };

  // Estimate gaze point from iris landmarks with improved accuracy
  const estimateGazePoint = (result: FaceLandmarkerResult): GazePoint | null => {
    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
      return null;
    }

    const landmarks = result.faceLandmarks[0];
    
    // Get eye corner landmarks for reference frames
    const leftEyeInner = landmarks[133];  // Left eye inner corner
    const leftEyeOuter = landmarks[33];   // Left eye outer corner
    const rightEyeInner = landmarks[362]; // Right eye inner corner  
    const rightEyeOuter = landmarks[263]; // Right eye outer corner
    
    // Get iris center landmarks (MediaPipe provides these)
    // Indices 468-472 are left iris, 473-477 are right iris
    const leftIris = landmarks[468] || leftEyeOuter;  // Fallback to eye center
    const rightIris = landmarks[473] || rightEyeOuter;

    if (!leftIris || !rightIris || !leftEyeInner || !rightEyeInner) return null;

    // Calculate iris position relative to eye bounds (0 = inner, 1 = outer)
    const leftEyeWidth = Math.abs(leftEyeOuter.x - leftEyeInner.x);
    const rightEyeWidth = Math.abs(rightEyeOuter.x - rightEyeInner.x);
    
    const leftIrisRelativeX = (leftIris.x - leftEyeInner.x) / leftEyeWidth;
    const rightIrisRelativeX = (rightIris.x - rightEyeInner.x) / rightEyeWidth;
    
    // Average both eyes for better accuracy
    const irisRelativeX = (leftIrisRelativeX + rightIrisRelativeX) / 2;
    
    // Map iris position to screen coordinates
    // This mapping needs calibration to be perfect, but this is a good approximation
    // Iris at 0.5 (center of eye) should map to center of screen
    // Add some gain to make the range feel more natural
    const screenX = 0.5 + (irisRelativeX - 0.5) * 2.5; // 2.5x gain
    
    // For Y, use the average vertical position of both irises
    const avgIrisY = (leftIris.y + rightIris.y) / 2;
    
    // Get face bounds for Y mapping
    const noseTip = landmarks[1];
    const forehead = landmarks[10];
    const faceHeight = Math.abs(noseTip.y - forehead.y);
    
    // Map Y coordinate with offset (looking down = higher Y)
    const irisRelativeY = (avgIrisY - forehead.y) / faceHeight;
    const screenY = 0.3 + (irisRelativeY - 0.5) * 2.0; // Offset and gain

    return {
      x: Math.max(0, Math.min(1, screenX)),
      y: Math.max(0, Math.min(1, screenY)),
      timestamp: Date.now(),
    };
  };

  // Calculate metrics from history
  const calculateMetrics = useCallback(() => {
    const now = Date.now();
    const windowStart = now - METRIC_WINDOW_SIZE;

    // Filter history to window
    const recentGaze = gazeHistoryRef.current.filter(p => p.timestamp > windowStart);
    const recentBlinks = blinkHistoryRef.current.filter(b => b.timestamp > windowStart);
    const recentSaccades = saccadeHistoryRef.current.filter(s => s.timestamp > windowStart);

    // Calculate fixation stability (inverse of gaze variance)
    let fixationStability = 0;
    if (recentGaze.length > 10) {
      const xValues = recentGaze.map(p => p.x);
      const yValues = recentGaze.map(p => p.y);
      const xMean = xValues.reduce((a, b) => a + b) / xValues.length;
      const yMean = yValues.reduce((a, b) => a + b) / yValues.length;
      const variance =
        xValues.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0) +
        yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
      fixationStability = Math.max(0, Math.min(100, 100 - variance * 5000));
    }

    // Calculate blink rate (blinks per minute)
    const blinkCount = recentBlinks.filter(b => b.isBlink).length;
    const blinkRate = (blinkCount / (METRIC_WINDOW_SIZE / 1000)) * 60;

    // Calculate saccade rate (saccades per second)
    const saccadeCount = recentSaccades.filter(s => s.isSaccade).length;
    const saccadeRate = saccadeCount / (METRIC_WINDOW_SIZE / 1000);

    // Pupil variance (placeholder - would need actual pupil size tracking)
    const pupilVariance = Math.random() * 20 + 10; // Mock for now

    setMetrics({
      fixationStability: Math.round(fixationStability * 10) / 10,
      blinkRate: Math.round(blinkRate * 10) / 10,
      saccadeRate: Math.round(saccadeRate * 10) / 10,
      pupilVariance: Math.round(pupilVariance * 10) / 10,
    });
  }, []);

  // Process video frame
  const processFrame = useCallback(() => {
    // Don't check isTracking here - it might be stale in the closure
    if (!faceLandmarkerRef.current || !videoRef.current) {
      if (Date.now() % 2000 < 50) {
        console.log('⏸️ processFrame skipped:', {
          hasFaceLandmarker: !!faceLandmarkerRef.current,
          hasVideo: !!videoRef.current
        });
      }
      // Continue loop if video exists
      if (videoRef.current) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2) {
      if (Date.now() % 2000 < 50) {
        console.log('⏸️ Video not ready:', video.readyState);
      }
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    try {
      const result = faceLandmarkerRef.current.detectForVideo(video, Date.now());
      
      // Debug logging
      if (Date.now() % 1000 < 50) { // Log once per second
        console.log('👁️ Face detection result:', {
          hasFaces: result?.faceLandmarks?.length || 0,
          videoSize: `${video.videoWidth}x${video.videoHeight}`,
          videoReady: video.readyState
        });
      }

      if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
        const landmarks = result.faceLandmarks[0];

      // Estimate gaze point
      const gaze = estimateGazePoint(result);
      if (gaze) {
        // Apply exponential smoothing for stability
        const smoothing = 0.3; // Lower = smoother, higher = more responsive
        smoothedGazeRef.current.x = smoothedGazeRef.current.x * (1 - smoothing) + gaze.x * smoothing;
        smoothedGazeRef.current.y = smoothedGazeRef.current.y * (1 - smoothing) + gaze.y * smoothing;
        
        const smoothedGaze = {
          x: smoothedGazeRef.current.x,
          y: smoothedGazeRef.current.y,
          timestamp: gaze.timestamp
        };
        
        gazeHistoryRef.current.push(smoothedGaze);
        
        // Throttle state updates to avoid overwhelming React
        const now = Date.now();
        if (now - lastStateUpdateRef.current > THROTTLE_MS) {
          setGazePoint(smoothedGaze);
          lastStateUpdateRef.current = now;
        }

        // Detect saccades (rapid gaze movements)
        if (gazeHistoryRef.current.length > 1) {
          const prev = gazeHistoryRef.current[gazeHistoryRef.current.length - 2];
          const distance = Math.sqrt(
            Math.pow(gaze.x - prev.x, 2) + Math.pow(gaze.y - prev.y, 2)
          );
          const isSaccade = distance > 0.05; // Threshold for saccade
          saccadeHistoryRef.current.push({ timestamp: Date.now(), isSaccade });
        }
      }

      // Detect blinks using EAR
      const leftEyeLandmarks = [
        landmarks[33], landmarks[160], landmarks[158],
        landmarks[133], landmarks[153], landmarks[144]
      ].map(l => [l.x, l.y]);
      
      const ear = calculateEAR(leftEyeLandmarks);
      const isBlink = ear < BLINK_THRESHOLD;
      blinkHistoryRef.current.push({ timestamp: Date.now(), isBlink });

        // Calculate metrics every 500ms (but check less frequently to reduce overhead)
        const currentTime = Date.now();
        if (currentTime % 500 < 20) { // Smaller window to hit less often
          calculateMetrics();
        }
      } else {
        // No face detected - log occasionally
        if (Date.now() % 2000 < 50) {
          console.warn('No face detected in frame');
        }
      }
    } catch (err) {
      console.error('Error processing frame:', err);
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [calculateMetrics]); // Removed isTracking from dependencies to avoid stale closure

  // Start tracking
  const startTracking = useCallback(async () => {
    console.log('🔵 startTracking called', { isInitialized, isTracking });
    if (!isInitialized || isTracking) {
      console.warn('⚠️ Cannot start tracking:', { isInitialized, isTracking });
      return;
    }

    try {
      console.log('🔵 Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });
      console.log('✅ Camera access granted');

      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      console.log('🔵 Video element created');

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          console.log('✅ Video metadata loaded:', {
            width: video.videoWidth,
            height: video.videoHeight,
            readyState: video.readyState
          });
          video.play();
          resolve();
        };
      });

      videoRef.current = video;
      streamRef.current = stream;
      setIsTracking(true);
      setError(null);
      console.log('✅ Tracking state set to true');

      // Start processing frames
      console.log('🔵 Starting frame processing...');
      
      // Use a small delay to ensure state is updated
      setTimeout(() => {
        console.log('🔵 Initiating processFrame loop...');
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }, 100);
    } catch (err) {
      setError(`Failed to access camera: ${err}`);
      console.error('❌ Camera access error:', err);
    }
  }, [isInitialized, isTracking, processFrame]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current = null;
    }

    setIsTracking(false);
    setGazePoint(null);
  }, []);

  // Calibration (simplified - would need more sophisticated calibration)
  const calibrate = useCallback(async () => {
    // Clear history
    gazeHistoryRef.current = [];
    blinkHistoryRef.current = [];
    saccadeHistoryRef.current = [];
    
    // Reset metrics
    setMetrics({
      fixationStability: 0,
      blinkRate: 0,
      saccadeRate: 0,
      pupilVariance: 0,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    isInitialized,
    isTracking,
    gazePoint,
    metrics,
    error,
    startTracking,
    stopTracking,
    calibrate,
  };
}

