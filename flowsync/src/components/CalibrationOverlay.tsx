import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Target } from 'lucide-react';

interface CalibrationPoint {
  x: number; // 0-1
  y: number; // 0-1
  index: number;
}

interface CalibrationOverlayProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onAddCalibrationPoint: (screenX: number, screenY: number) => Promise<number>;
}

// EyeTrax-style 9-point calibration with 10% margins
// Order: center first, then corners, then edges (matches EyeTrax)
// Grid positions: (1,1) = center, (0,0) = top-left, (2,2) = bottom-right
const MARGIN_RATIO = 0.10;

const computeCalibrationPoints = (): CalibrationPoint[] => {
  // EyeTrax order: center, then corners (TL, TR, BL, BR), then edges (T, L, R, B)
  const order = [
    { row: 1, col: 1, index: 0 }, // Center
    { row: 0, col: 0, index: 1 }, // Top-left
    { row: 0, col: 2, index: 2 }, // Top-right
    { row: 2, col: 0, index: 3 }, // Bottom-left
    { row: 2, col: 2, index: 4 }, // Bottom-right
    { row: 0, col: 1, index: 5 }, // Top-center
    { row: 1, col: 0, index: 6 }, // Middle-left
    { row: 1, col: 2, index: 7 }, // Middle-right
    { row: 2, col: 1, index: 8 }, // Bottom-center
  ];

  return order.map(({ row, col, index }) => {
    // With 10% margins on each side
    const x = MARGIN_RATIO + (col / 2) * (1 - 2 * MARGIN_RATIO);
    const y = MARGIN_RATIO + (row / 2) * (1 - 2 * MARGIN_RATIO);
    return { x, y, index };
  });
};

const CALIBRATION_POINTS = computeCalibrationPoints();

// Match EyeTrax's timing: 1s pulse + 1s capture = 2s total per point
const PULSE_TIME = 1000;  // Pulsing animation duration  
const CAPTURE_TIME = 1000; // Capture duration (collect all frames during this)
const TOTAL_TIME = PULSE_TIME + CAPTURE_TIME;

export default function CalibrationOverlay({ visible, onComplete, onSkip, onAddCalibrationPoint }: CalibrationOverlayProps) {
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const calibrationSentRef = useState(false)[0];

  useEffect(() => {
    if (!visible) {
      setCurrentPointIndex(0);
      setProgress(0);
      setIsComplete(false);
      setError(null);
      return;
    }

    // Use refs to track if we've captured this point and if we've completed
    const pointCapturedRef = { current: false };
    const completedRef = { current: false };

    const interval = setInterval(() => {
      setProgress((prev) => {
        // Pulse phase: 0-50% (first half)
        // Capture phase: 50-100% (second half - trigger at 50%)
        if (prev >= 50 && !pointCapturedRef.current) {
          pointCapturedRef.current = true;
          const point = CALIBRATION_POINTS[currentPointIndex];
          const screenX = point.x * window.screen.width;
          const screenY = point.y * window.screen.height;
          
          console.log(`📸 Capturing calibration point ${currentPointIndex + 1}/${CALIBRATION_POINTS.length} at (${Math.round(screenX)}, ${Math.round(screenY)})`);
          
          onAddCalibrationPoint(screenX, screenY).catch((err) => {
            console.error('Failed to add calibration point:', err);
            setError(err.message);
          });
        }

        if (prev >= 100) {
          // Move to next point
          if (currentPointIndex < CALIBRATION_POINTS.length - 1) {
            setCurrentPointIndex((idx) => idx + 1);
            // Reset will happen when currentPointIndex changes and effect re-runs
            return 0;
          } else if (!completedRef.current) {
            // Only complete once!
            completedRef.current = true;
            setIsComplete(true);
            setTimeout(() => {
              onComplete();
            }, 500);
            return 100;
          }
        }
        return prev + (100 / (TOTAL_TIME / 50));
      });
    }, 50);

    return () => clearInterval(interval);
  }, [visible, currentPointIndex, onComplete, onAddCalibrationPoint]);

  if (!visible) return null;

  const currentPoint = CALIBRATION_POINTS[currentPointIndex];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-background/80 backdrop-blur-md"
    >
      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center"
      >
        <h2 className="text-2xl font-light text-white/90 mb-2">Calibration</h2>
        <p className="text-white/60 font-light">
          Follow the target with your eyes • Point {currentPointIndex + 1} of {CALIBRATION_POINTS.length}
        </p>
        {error && (
          <p className="mt-2 text-red-400 text-sm">
            {error}
          </p>
        )}
        <button
          onClick={onSkip}
          className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-glass text-white/70 text-sm font-light transition-colors duration-300"
        >
          Skip Calibration
        </button>
      </motion.div>

      {/* Calibration points grid (all points, faded) */}
      {CALIBRATION_POINTS.map((point) => (
        <motion.div
          key={point.index}
          className="absolute"
          style={{
            left: `${point.x * 100}%`,
            top: `${point.y * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: point.index === currentPointIndex ? 1 : 0.3,
            opacity: point.index < currentPointIndex ? 0.3 : point.index === currentPointIndex ? 1 : 0.2,
          }}
        >
          <div className="relative">
            {/* Completion checkmark */}
            {point.index < currentPointIndex && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-accent"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              </motion.div>
            )}

            {/* Current target */}
            {point.index === currentPointIndex && !isComplete && (
              <>
                {/* Outer pulsing ring */}
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.6, 0, 0.6],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <div className="w-16 h-16 rounded-full border-2 border-accent" />
                </motion.div>

                {/* Progress ring */}
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="rgba(167, 199, 231, 0.2)"
                    strokeWidth="2"
                    fill="none"
                  />
                  <motion.circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#A7C7E7"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: progress / 100 }}
                    style={{
                      pathLength: progress / 100,
                      strokeDasharray: '175.93',
                    }}
                  />
                </svg>

                {/* Center target icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <Target className="w-8 h-8 text-accent" strokeWidth={1.5} />
                  </motion.div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      ))}

      {/* Completion message */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="backdrop-blur-glass bg-white/[0.08] border border-white/10 rounded-glass-lg p-12 text-center shadow-glass">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-accent"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              </motion.div>
              <h3 className="text-2xl font-light text-white/90 mb-2">Calibration Complete!</h3>
              <p className="text-white/60 font-light">Starting gaze tracking...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

