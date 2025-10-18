import { motion } from 'framer-motion';
import { TrendingUp, Eye, Sparkles, Activity } from 'lucide-react';
import GlassCard from './GlassCard';
import { GazeMetrics } from '../types';

interface MetricOverlayProps {
  metrics: GazeMetrics;
  visible: boolean;
  className?: string;
}

export default function MetricOverlay({ metrics, visible, className = '' }: MetricOverlayProps) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className={`${className}`}
    >
      <GlassCard padding="sm" blur="md">
        <div className="grid grid-cols-2 gap-3">
          <MetricItem
            icon={<Eye className="w-4 h-4" strokeWidth={1.5} />}
            label="Fixation"
            value={metrics.fixationStability}
            unit="%"
            color="#A7C7E7"
          />
          <MetricItem
            icon={<Activity className="w-4 h-4" strokeWidth={1.5} />}
            label="Blink Rate"
            value={metrics.blinkRate}
            unit="/min"
            color="#C8B6E2"
          />
          <MetricItem
            icon={<TrendingUp className="w-4 h-4" strokeWidth={1.5} />}
            label="Saccades"
            value={metrics.saccadeRate}
            unit="/sec"
            color="#6EC1E4"
          />
          <MetricItem
            icon={<Sparkles className="w-4 h-4" strokeWidth={1.5} />}
            label="Pupil Var"
            value={metrics.pupilVariance}
            unit="%"
            color="#9B8AA4"
          />
        </div>
      </GlassCard>
    </motion.div>
  );
}

interface MetricItemProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  color: string;
}

function MetricItem({ icon, label, value, unit, color }: MetricItemProps) {
  return (
    <div className="flex items-center space-x-2">
      <div className="text-white/60">{icon}</div>
      <div className="flex-1">
        <div className="text-xs text-white/50 font-light">{label}</div>
        <div className="flex items-baseline space-x-1">
          <motion.span
            key={value}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg font-light"
            style={{ color }}
          >
            {value.toFixed(1)}
          </motion.span>
          <span className="text-xs text-white/40">{unit}</span>
        </div>
      </div>
    </div>
  );
}

