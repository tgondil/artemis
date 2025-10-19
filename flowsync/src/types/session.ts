export interface SessionEvent {
  id: string;
  timestamp: number;
  type: 'focus_start' | 'focus_end' | 'task_switch' | 'distraction' | 'achievement' | 'flow_state';
  value: number;
  label: string;
  description?: string;
  color: string;
}

export interface SessionData {
  startTime: number;
  endTime: number;
  duration: number;
  events: SessionEvent[];
  achievements: string[];
  focusSessions: Array<{ start: number; end: number; intensity: number }>;
  totalFocusTime: number;
  productivityScore: number;
  flowStates: Array<{ state: string; timestamp: number; duration: number }>;
}

export interface SessionStats {
  duration: number;
  focusEvents: number;
  achievements: number;
  flowStates: number;
  distractions: number;
  productivityScore: number;
  averageFocus: number;
  peakFlow: number;
  consistency: number;
}

export interface SessionAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
}
