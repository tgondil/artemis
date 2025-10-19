import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, BarChart3 } from 'lucide-react';
import GazeCursor from './GazeCursor';
import WindowTracker from './WindowTracker';
import FlowSyncDashboard from './FlowSyncDashboard';
import { useEyeTraxGazeTracker } from '../hooks/useEyeTraxGazeTracker';

export default function MainView() {
  const [showMetrics, setShowMetrics] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  const {
    isTracking,
    gazePoint,
    metrics,
    error,
    runCalibration,
    startTracking,
    stopTracking,
  } = useEyeTraxGazeTracker();

  const [isCalibrating, setIsCalibrating] = useState(false);

  const handleToggleTracking = async () => {
    if (isTracking) {
      stopTracking();
    } else {
      try {
        setIsCalibrating(true);
        await runCalibration(0);
        await startTracking();
      } catch (err) {
        console.error('Failed to start tracking:', err);
      } finally {
        setIsCalibrating(false);
      }
    }
  };

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5" />

      {/* Gaze Cursor - The Hero */}
      <AnimatePresence>
        {gazePoint && isTracking && (
          <GazeCursor
            x={gazePoint.x}
            y={gazePoint.y}
            fixationStability={metrics.fixationStability}
            visible={true}
          />
        )}
      </AnimatePresence>

      {/* Main Content - Centered */}
      <div className="relative z-10 flex items-center justify-center h-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          {/* Title */}
          <motion.h1
            className="text-7xl font-extralight text-white/90 tracking-tight mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            FlowSync
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-xl font-light text-white/50 mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {isTracking ? 'Tracking your gaze' : 'Follow your focus'}
          </motion.p>

          {/* Main Action Button */}
          <motion.button
            onClick={handleToggleTracking}
            disabled={isCalibrating}
            className="group relative px-12 py-5 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl text-white/90 font-light text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center space-x-3">
              {isCalibrating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Eye className="w-5 h-5" />
                  </motion.div>
                  <span>Calibrating...</span>
                </>
              ) : isTracking ? (
                <>
                  <EyeOff className="w-5 h-5" />
                  <span>Stop Tracking</span>
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5" />
                  <span>Enable Gaze Tracking</span>
                </>
              )}
            </div>

            {/* Button glow on hover */}
            <motion.div
              className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
              initial={false}
            />
          </motion.button>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 text-sm text-red-400/80"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Subtle hint */}
          {!isTracking && !isCalibrating && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1 }}
              className="mt-8 text-sm text-white/30 font-light"
            >
              Click to calibrate and start tracking
            </motion.p>
          )}
        </motion.div>
      </div>

      {/* Status Indicator - Top Right */}
      <AnimatePresence>
        {isTracking && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed top-8 right-8 z-20"
          >
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className="group flex items-center space-x-2 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-white/70 hover:text-white/90 transition-all duration-300"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="w-2 h-2 bg-accent rounded-full"
              />
              <span className="text-sm font-light">Tracking</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Window Tracker - Top Left */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="fixed top-8 left-8 z-20"
      >
        <WindowTracker />
      </motion.div>

      {/* Dashboard Toggle - Top Right */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="fixed top-8 right-8 z-20"
      >
        <button
          onClick={() => {
            console.log('[MainView] Dashboard button clicked, current state:', showDashboard);
            setShowDashboard(!showDashboard);
            console.log('[MainView] Dashboard state set to:', !showDashboard);
          }}
          className="p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg hover:bg-white/20 transition-all duration-200 text-white"
          title="Open FlowSync Dashboard"
        >
          <BarChart3 size={20} />
        </button>
      </motion.div>


      {/* Minimal Metrics - Bottom Right (optional) */}
      <AnimatePresence>
        {showMetrics && isTracking && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 right-8 z-20 px-6 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between space-x-8">
                <span className="text-xs text-white/40 font-light">Fixation</span>
                <span className="text-sm text-white/80 font-light">
                  {metrics.fixationStability.toFixed(0)}%
                </span>
              </div>
              {gazePoint && (
                <div className="flex items-center justify-between space-x-8">
                  <span className="text-xs text-white/40 font-light">Position</span>
                  <span className="text-sm text-white/80 font-light font-mono">
                    {(gazePoint.x * 100).toFixed(0)}%, {(gazePoint.y * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcut Hint - Bottom Left */}
      {!isTracking && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="fixed bottom-8 left-8 text-xs text-white/20 font-light"
        >
          Press <kbd className="px-2 py-1 bg-white/5 rounded border border-white/10">Space</kbd> to
          toggle tracking
        </motion.div>
      )}

      {/* FlowSync Dashboard */}
      <AnimatePresence>
        {showDashboard && (
          <>
            {console.log('[MainView] Rendering FlowSyncDashboard')}
            <FlowSyncDashboard />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
