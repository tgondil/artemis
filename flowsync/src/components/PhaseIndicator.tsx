import { motion, AnimatePresence } from 'framer-motion';
import { Circle } from 'lucide-react';
import GlassCard from './GlassCard';
import { FlowPhase, PHASE_CONFIGS } from '../types';

interface PhaseIndicatorProps {
  currentPhase: FlowPhase;
  className?: string;
}

export default function PhaseIndicator({ currentPhase, className = '' }: PhaseIndicatorProps) {
  const config = PHASE_CONFIGS[currentPhase];

  return (
    <GlassCard className={`${className}`} padding="lg">
      <div className="flex flex-col items-center space-y-4">
        {/* Phase Orb */}
        <div className="relative">
          {/* Pulsing glow effect */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 rounded-full blur-3xl"
            style={{ backgroundColor: config.glowColor }}
          />
          
          {/* Main orb */}
          <motion.div
            key={currentPhase}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative w-24 h-24 rounded-full flex items-center justify-center"
            style={{ 
              backgroundColor: config.color,
              boxShadow: `0 0 40px ${config.glowColor}`,
            }}
          >
            <Circle 
              className="w-12 h-12 text-white/90" 
              fill="currentColor"
              strokeWidth={0}
            />
          </motion.div>
        </div>

        {/* Phase Name */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <h2 
              className="text-2xl font-light mb-1"
              style={{ color: config.color }}
            >
              {config.name}
            </h2>
            <p className="text-white/50 text-sm font-light">
              {config.description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Phase Progress Bar */}
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: config.color }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 3, ease: 'linear' }}
          />
        </div>
      </div>
    </GlassCard>
  );
}

