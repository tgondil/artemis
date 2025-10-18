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
}

const CALIBRATION_POINTS: CalibrationPoint[] = [
  // 9-point grid
  { x: 0.1, y: 0.1, index: 0 },
  { x: 0.5, y: 0.1, index: 1 },
  { x: 0.9, y: 0.1, index: 2 },
  { x: 0.1, y: 0.5, index: 3 },
  { x: 0.5, y: 0.5, index: 4 }, // Center
  { x: 0.9, y: 0.5, index: 5 },
  { x: 0.1, y: 0.9, index: 6 },
  { x: 0.5, y: 0.9, index: 7 },
  { x: 0.9, y: 0.9, index: 8 },
];

const DWELL_TIME = 1500; // ms to dwell on each point

export default function CalibrationOverlay({ visible, onComplete, onSkip }: CalibrationOverlayProps) {
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCurrentPointIndex(0);
      setProgress(0);
      setIsComplete(false);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Move to next point
          if (currentPointIndex < CALIBRATION_POINTS.length - 1) {
            setCurrentPointIndex((idx) => idx + 1);
            return 0;
          } else {
            setIsComplete(true);
            setTimeout(() => {
              onComplete();
            }, 500);
            return 100;
          }
        }
        return prev + (100 / (DWELL_TIME / 50));
      });
    }, 50);

    return () => clearInterval(interval);
  }, [visible, currentPointIndex, onComplete]);

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

