import { motion } from 'framer-motion';
import { Eye, Music, Lightbulb, MessageSquare, Power } from 'lucide-react';
import GlassCard from './GlassCard';

interface Integration {
  id: string;
  name: string;
  icon: React.ReactNode;
  enabled: boolean;
}

interface ControlPanelProps {
  gazeTrackingEnabled: boolean;
  onToggleGazeTracking: () => void;
  integrations: Integration[];
  onToggleIntegration: (id: string) => void;
  className?: string;
}

export default function ControlPanel({
  gazeTrackingEnabled,
  onToggleGazeTracking,
  integrations,
  onToggleIntegration,
  className = '',
}: ControlPanelProps) {
  return (
    <GlassCard className={className} padding="lg">
      <div className="space-y-6">
        <h3 className="text-lg font-light text-white/90 mb-4">Controls</h3>

        {/* Main Gaze Tracking Toggle */}
        <div className="pb-4 border-b border-white/10">
          <ToggleButton
            icon={<Eye className="w-5 h-5" strokeWidth={1.5} />}
            label="Gaze Tracking"
            description="Real-time attention monitoring"
            enabled={gazeTrackingEnabled}
            onToggle={onToggleGazeTracking}
            primary
          />
        </div>

        {/* Integration Toggles */}
        <div className="space-y-3">
          <h4 className="text-sm font-light text-white/60 mb-2">Integrations</h4>
          {integrations.map((integration) => (
            <ToggleButton
              key={integration.id}
              icon={integration.icon}
              label={integration.name}
              enabled={integration.enabled}
              onToggle={() => onToggleIntegration(integration.id)}
            />
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

interface ToggleButtonProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  enabled: boolean;
  onToggle: () => void;
  primary?: boolean;
}

function ToggleButton({
  icon,
  label,
  description,
  enabled,
  onToggle,
  primary = false,
}: ToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between p-3 rounded-glass transition-all duration-300 ${
        enabled
          ? 'bg-accent/20 hover:bg-accent/25'
          : 'bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className="flex items-center space-x-3">
        <div
          className={`${enabled ? 'text-accent' : 'text-white/40'} transition-colors duration-300`}
        >
          {icon}
        </div>
        <div className="text-left">
          <div className={`text-sm font-light ${enabled ? 'text-white/90' : 'text-white/60'}`}>
            {label}
          </div>
          {description && (
            <div className="text-xs text-white/40 mt-0.5">{description}</div>
          )}
        </div>
      </div>

      {/* Toggle Switch */}
      <motion.div
        className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${
          enabled ? 'bg-accent' : 'bg-white/20'
        }`}
        animate={{ backgroundColor: enabled ? '#A7C7E7' : 'rgba(255,255,255,0.2)' }}
      >
        <motion.div
          className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md"
          animate={{ x: enabled ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </motion.div>
    </button>
  );
}

// Export default integrations
export const DEFAULT_INTEGRATIONS: Integration[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    icon: <Music className="w-5 h-5" strokeWidth={1.5} />,
    enabled: false,
  },
  {
    id: 'lighting',
    name: 'Smart Lighting',
    icon: <Lightbulb className="w-5 h-5" strokeWidth={1.5} />,
    enabled: false,
  },
  {
    id: 'status',
    name: 'Status Updates',
    icon: <MessageSquare className="w-5 h-5" strokeWidth={1.5} />,
    enabled: false,
  },
];

