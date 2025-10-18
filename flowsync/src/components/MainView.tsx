import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Settings, Eye } from 'lucide-react';
import PhaseIndicator from './PhaseIndicator';
import ControlPanel, { DEFAULT_INTEGRATIONS } from './ControlPanel';
import MetricOverlay from './MetricOverlay';
import GazeCursor from './GazeCursor';
import CalibrationOverlay from './CalibrationOverlay';
import { FlowPhase } from '../types';
import { useGazeTracker } from '../hooks/useGazeTracker';

interface MainViewProps {
  onBack: () => void;
}

export default function MainView({ onBack }: MainViewProps) {
  const [currentPhase, setCurrentPhase] = useState<FlowPhase>('warmup');
  const [integrations, setIntegrations] = useState(DEFAULT_INTEGRATIONS);
  const [showMetrics, setShowMetrics] = useState(true);
  const [showGazeCursor, setShowGazeCursor] = useState(true);
  const [showCalibration, setShowCalibration] = useState(false);
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);

  // Use the gaze tracker hook
  const {
    isInitialized,
    isTracking,
    gazePoint,
    metrics,
    error,
    startTracking,
    stopTracking,
    calibrate,
  } = useGazeTracker();

  const handleToggleIntegration = (id: string) => {
    setIntegrations(prev =>
      prev.map(int => (int.id === id ? { ...int, enabled: !int.enabled } : int))
    );
  };

  // Handle gaze tracking toggle
  const handleToggleGazeTracking = async () => {
    if (isTracking) {
      stopTracking();
      setShowCalibration(false);
      setIsInitializingCamera(false);
    } else {
      if (!isInitialized) {
        console.warn('Gaze tracker not initialized yet');
        return;
      }
      
      try {
        setIsInitializingCamera(true);
        
        // First, request camera permission and start tracking
        await startTracking();
        
        setIsInitializingCamera(false);
        
        // Then show calibration overlay
        setTimeout(() => {
          setShowCalibration(true);
        }, 500);
      } catch (err) {
        console.error('Failed to start tracking:', err);
        setIsInitializingCamera(false);
      }
    }
  };

  // Handle calibration complete
  const handleCalibrationComplete = async () => {
    setShowCalibration(false);
    await calibrate(); // Reset metrics after calibration
  };

  // Handle calibration skip
  const handleCalibrationSkip = () => {
    setShowCalibration(false);
  };

  // Cycle through phases for demo
  const handleCyclePhase = () => {
    const phases: FlowPhase[] = ['warmup', 'engagement', 'flow', 'cooldown'];
    const currentIndex = phases.indexOf(currentPhase);
    const nextIndex = (currentIndex + 1) % phases.length;
    setCurrentPhase(phases[nextIndex]);
  };

  // Auto-hide cursor during flow phase
  useEffect(() => {
    if (currentPhase === 'flow') {
      setShowGazeCursor(false);
    } else if (isTracking) {
      setShowGazeCursor(true);
    }
  }, [currentPhase, isTracking]);

  return (
    <div className="w-screen h-screen bg-background flex flex-col overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent-lavender/5" />

      {/* Gaze Cursor */}
      {gazePoint && (
        <GazeCursor
          x={gazePoint.x}
          y={gazePoint.y}
          fixationStability={metrics.fixationStability}
          visible={showGazeCursor && isTracking}
        />
      )}

      {/* Debug info - remove later */}
      {isTracking && (
        <div className="fixed bottom-4 left-4 z-50 px-4 py-2 bg-white/10 rounded-glass text-white/60 text-xs font-mono backdrop-blur-md">
          <div>Tracking: {isTracking ? '✅' : '❌'}</div>
          <div>Gaze Point: {gazePoint ? `${gazePoint.x.toFixed(3)}, ${gazePoint.y.toFixed(3)}` : '❌ null'}</div>
          <div>Cursor Visible: {showGazeCursor ? '✅' : '❌'}</div>
          <div>Fixation: {metrics.fixationStability.toFixed(1)}%</div>
        </div>
      )}

      {/* Calibration Overlay */}
      <CalibrationOverlay
        visible={showCalibration}
        onComplete={handleCalibrationComplete}
        onSkip={handleCalibrationSkip}
      />

      {/* Camera initializing notification */}
      {isInitializingCamera && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30 px-6 py-3 bg-accent/20 border border-accent/50 rounded-glass text-accent text-sm font-light backdrop-blur-md"
        >
          <div className="flex items-center space-x-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Eye className="w-4 h-4" />
            </motion.div>
            <span>Requesting camera access...</span>
          </div>
        </motion.div>
      )}

      {/* Error notification */}
      {error && !isInitializingCamera && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30 px-6 py-3 bg-red-500/20 border border-red-500/50 rounded-glass text-red-200 text-sm font-light backdrop-blur-md"
        >
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </motion.div>
      )}

      {/* Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-20 flex items-center justify-between p-6"
      >
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-white/60 hover:text-white/90 transition-colors duration-300"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          <span className="font-light">Back</span>
        </button>

        <button
          onClick={() => setShowMetrics(!showMetrics)}
          className="text-white/60 hover:text-white/90 transition-colors duration-300"
        >
          <Settings className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl grid grid-cols-3 gap-6">
          {/* Left Column - Phase Indicator */}
          <div className="col-span-2 flex flex-col space-y-6">
            <PhaseIndicator currentPhase={currentPhase} />
            
            {/* Metrics Overlay */}
            <AnimatePresence>
              {showMetrics && isTracking && (
                <MetricOverlay metrics={metrics} visible={showMetrics} />
              )}
            </AnimatePresence>

            {/* Demo Button - remove later */}
            <motion.button
              onClick={handleCyclePhase}
              className="px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-glass text-white/90 font-light transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Cycle Phase (Demo)
            </motion.button>
          </div>

          {/* Right Column - Control Panel */}
          <div>
            <ControlPanel
              gazeTrackingEnabled={isTracking}
              onToggleGazeTracking={handleToggleGazeTracking}
              integrations={integrations}
              onToggleIntegration={handleToggleIntegration}
            />
            
            {/* Tracking status */}
            {isTracking && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 px-4 py-3 bg-accent/10 border border-accent/30 rounded-glass"
              >
                <div className="flex items-center space-x-2 text-accent text-sm font-light">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Eye className="w-4 h-4" />
                  </motion.div>
                  <span>Tracking active</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Ambient floating elements */}
      <motion.div
        animate={{
          y: [0, -30, 0],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-20 right-20 w-40 h-40 bg-accent/10 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{
          y: [0, 30, 0],
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
        className="absolute bottom-20 left-20 w-48 h-48 bg-accent-lavender/10 rounded-full blur-3xl pointer-events-none"
      />
    </div>
  );
}

