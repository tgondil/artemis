import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Clock, Activity, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useWindowTracker } from '../hooks/useWindowTracker';

interface WindowTrackerProps {
  className?: string;
}

export default function WindowTracker({ className = '' }: WindowTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const {
    isTracking,
    activeWindow,
    appTimeSpent,
    recentHistory,
    currentTitle,
    error,
    startTracking,
    stopTracking,
    updateFromSnapshot,
    formatDuration,
    getTopApps,
  } = useWindowTracker(3000); // Update every 3 seconds

  // Auto-refresh data when tracking
  useEffect(() => {
    if (isTracking) {
      const interval = setInterval(() => {
        updateFromSnapshot();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isTracking, updateFromSnapshot]);

  const topApps = getTopApps(3);
  const totalTime = Object.values(appTimeSpent).reduce((sum, time) => sum + time, 0);

  const handleToggleTracking = async () => {
    if (isTracking) {
      await stopTracking();
    } else {
      await startTracking();
    }
  };

  const handleRefresh = async () => {
    await updateFromSnapshot();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Toggle Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="group flex items-center space-x-3 px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-white/70 hover:text-white/90 transition-all duration-300"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <motion.div
          animate={{
            scale: isTracking ? [1, 1.2, 1] : 1,
            opacity: isTracking ? [0.7, 1, 0.7] : 0.7,
          }}
          transition={{
            duration: 2,
            repeat: isTracking ? Infinity : 0,
            ease: 'easeInOut',
          }}
          className="w-2 h-2 bg-accent rounded-full"
        />
        <Monitor className="w-4 h-4" />
        <span className="text-sm font-light">
          {isTracking ? 'Window Tracking' : 'Start Tracking'}
        </span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="w-4 h-4"
        >
          <Eye className="w-4 h-4" />
        </motion.div>
      </motion.button>

      {/* Expanded Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full mt-2 left-0 w-72 max-w-[calc(100vw-4rem)] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Monitor className="w-4 h-4 text-white/60" />
                <span className="text-sm font-medium text-white/90">Window Tracker</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRefresh}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="Refresh data"
                >
                  <RefreshCw className="w-3 h-3 text-white/60" />
                </button>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="Toggle details"
                >
                  <Activity className="w-3 h-3 text-white/60" />
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
              >
                <p className="text-xs text-red-400">{error}</p>
              </motion.div>
            )}

            {/* Current Window */}
            {activeWindow && (
              <div className="mb-4 p-3 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  <span className="text-xs text-white/60 font-medium">Current Window</span>
                </div>
                <p className="text-sm text-white/90 font-medium truncate">
                  {activeWindow.title}
                </p>
                <p className="text-xs text-white/50">
                  {activeWindow.owner.name}
                </p>
              </div>
            )}

            {/* Top Apps */}
            {topApps.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Clock className="w-3 h-3 text-white/60" />
                  <span className="text-xs text-white/60 font-medium">Time Spent</span>
                </div>
                <div className="space-y-2">
                  {topApps.map(({ app, time, formatted }, index) => (
                    <motion.div
                      key={app}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-accent rounded-full" />
                        <span className="text-xs text-white/70 truncate max-w-32">
                          {app}
                        </span>
                      </div>
                      <span className="text-xs text-white/50 font-mono">
                        {formatted}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Total Time */}
            {totalTime > 0 && (
              <div className="mb-4 p-3 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60">Total Time</span>
                  <span className="text-sm text-white/90 font-mono">
                    {formatDuration(totalTime)}
                  </span>
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={handleToggleTracking}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all duration-200"
              >
                {isTracking ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    <span className="text-xs">Stop</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    <span className="text-xs">Start</span>
                  </>
                )}
              </button>
            </div>

            {/* Detailed History (Collapsible) */}
            <AnimatePresence>
              {showDetails && recentHistory.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 pt-4 border-t border-white/10"
                >
                  <div className="flex items-center space-x-2 mb-3">
                    <Activity className="w-3 h-3 text-white/60" />
                    <span className="text-xs text-white/60 font-medium">Recent Activity</span>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {recentHistory.slice(-5).reverse().map((entry, index) => (
                      <motion.div
                        key={`${entry.timestamp}-${index}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-1 h-1 bg-white/30 rounded-full" />
                          <span className="text-white/60 truncate max-w-24">
                            {entry.window.owner.name}
                          </span>
                        </div>
                        <span className="text-white/40 font-mono">
                          {formatDuration(entry.duration)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
