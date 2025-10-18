import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Settings } from 'lucide-react';
import PhaseIndicator from './PhaseIndicator';
import ControlPanel, { DEFAULT_INTEGRATIONS } from './ControlPanel';
import MetricOverlay from './MetricOverlay';
import { FlowPhase, GazeMetrics } from '../types';

interface MainViewProps {
  onBack: () => void;
}

export default function MainView({ onBack }: MainViewProps) {
  const [currentPhase, setCurrentPhase] = useState<FlowPhase>('warmup');
  const [gazeTrackingEnabled, setGazeTrackingEnabled] = useState(false);
  const [integrations, setIntegrations] = useState(DEFAULT_INTEGRATIONS);
  const [showMetrics, setShowMetrics] = useState(true);

  // Mock metrics - will be replaced with real data
  const [metrics] = useState<GazeMetrics>({
    fixationStability: 87.3,
    blinkRate: 18.5,
    saccadeRate: 3.2,
    pupilVariance: 12.4,
  });

  const handleToggleIntegration = (id: string) => {
    setIntegrations(prev =>
      prev.map(int => (int.id === id ? { ...int, enabled: !int.enabled } : int))
    );
  };

  // Cycle through phases for demo
  const handleCyclePhase = () => {
    const phases: FlowPhase[] = ['warmup', 'engagement', 'flow', 'cooldown'];
    const currentIndex = phases.indexOf(currentPhase);
    const nextIndex = (currentIndex + 1) % phases.length;
    setCurrentPhase(phases[nextIndex]);
  };

  return (
    <div className="w-screen h-screen bg-background flex flex-col overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent-lavender/5" />

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
              {showMetrics && gazeTrackingEnabled && (
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
              gazeTrackingEnabled={gazeTrackingEnabled}
              onToggleGazeTracking={() => setGazeTrackingEnabled(!gazeTrackingEnabled)}
              integrations={integrations}
              onToggleIntegration={handleToggleIntegration}
            />
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

