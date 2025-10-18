export type FlowPhase = 'warmup' | 'engagement' | 'flow' | 'cooldown';

export interface PhaseConfig {
  name: string;
  color: string;
  glowColor: string;
  description: string;
  bgOpacity: string;
}

export const PHASE_CONFIGS: Record<FlowPhase, PhaseConfig> = {
  warmup: {
    name: 'Warm-up',
    color: '#C8B6E2', // Lavender
    glowColor: 'rgba(200, 182, 226, 0.4)',
    description: 'Preparing to focus',
    bgOpacity: 'bg-[#C8B6E2]/10',
  },
  engagement: {
    name: 'Engagement',
    color: '#A7C7E7', // Arctic blue
    glowColor: 'rgba(167, 199, 231, 0.4)',
    description: 'Building momentum',
    bgOpacity: 'bg-accent/10',
  },
  flow: {
    name: 'Flow State',
    color: '#6EC1E4', // Brighter blue
    glowColor: 'rgba(110, 193, 228, 0.5)',
    description: 'Deep focus achieved',
    bgOpacity: 'bg-[#6EC1E4]/10',
  },
  cooldown: {
    name: 'Cooldown',
    color: '#9B8AA4', // Muted lavender
    glowColor: 'rgba(155, 138, 164, 0.3)',
    description: 'Time for a break',
    bgOpacity: 'bg-[#9B8AA4]/10',
  },
};

export interface GazeMetrics {
  fixationStability: number;
  blinkRate: number;
  saccadeVelocity?: number; // Optional for compatibility
  saccadeRate?: number;
  pupilVariance?: number;
}

