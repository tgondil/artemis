import { motion } from 'framer-motion';
import { 
  Trophy, 
  Clock, 
  Target, 
  Zap, 
  TrendingUp, 
  Award, 
  Star,
  Calendar,
  BarChart3,
  Brain,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Activity,
  Shield,
  Coffee
} from 'lucide-react';
import { SessionData, SessionStats, SessionAchievement } from '../types/session';

interface SessionSummaryProps {
  sessionData: SessionData;
  onStartNewSession: () => void;
  onClose: () => void;
}

export default function SessionSummary({ sessionData, onStartNewSession, onClose }: SessionSummaryProps) {
  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const calculateStats = (): SessionStats => {
    const focusEvents = sessionData.events.filter(e => e.type === 'focus_start').length;
    const achievements = sessionData.events.filter(e => e.type === 'achievement').length;
    const flowStates = sessionData.events.filter(e => e.type === 'flow_state').length;
    const distractions = sessionData.events.filter(e => e.type === 'distraction').length;
    
    const focusValues = sessionData.events
      .filter(e => e.type === 'focus_start' || e.type === 'flow_state')
      .map(e => e.value);
    
    const averageFocus = focusValues.length > 0 
      ? focusValues.reduce((sum, val) => sum + val, 0) / focusValues.length 
      : 0;
    
    const peakFlow = Math.max(...focusValues, 0);
    
    const productivityScore = Math.min(100, 
      (focusEvents * 15) + 
      (achievements * 20) + 
      (flowStates * 25) - 
      (distractions * 10)
    );
    
    const consistency = focusEvents > 0 ? Math.min(100, (focusEvents / (sessionData.duration / 300000)) * 100) : 0;
    
    return {
      duration: sessionData.duration,
      focusEvents,
      achievements,
      flowStates,
      distractions,
      productivityScore: Math.round(productivityScore),
      averageFocus: Math.round(averageFocus),
      peakFlow: Math.round(peakFlow),
      consistency: Math.round(consistency)
    };
  };

  const getAchievements = (): SessionAchievement[] => {
    const stats = calculateStats();
    const achievements: SessionAchievement[] = [];
    
    // Duration achievements
    if (stats.duration >= 1800000) { // 30 minutes
      achievements.push({
        id: 'marathon',
        title: 'Marathon Session',
        description: 'Completed a 30+ minute focused session',
        icon: '🏃‍♂️',
        unlocked: true,
        rarity: 'rare',
        points: 50
      });
    }
    
    if (stats.duration >= 3600000) { // 1 hour
      achievements.push({
        id: 'endurance',
        title: 'Endurance Master',
        description: 'Maintained focus for over an hour',
        icon: '⏰',
        unlocked: true,
        rarity: 'epic',
        points: 100
      });
    }
    
    // Focus achievements
    if (stats.focusEvents >= 5) {
      achievements.push({
        id: 'focused',
        title: 'Deep Focus',
        description: 'Achieved 5+ focus events',
        icon: '🎯',
        unlocked: true,
        rarity: 'common',
        points: 25
      });
    }
    
    if (stats.focusEvents >= 10) {
      achievements.push({
        id: 'laser_focus',
        title: 'Laser Focus',
        description: 'Achieved 10+ focus events',
        icon: '🔴',
        unlocked: true,
        rarity: 'rare',
        points: 75
      });
    }
    
    // Flow state achievements
    if (stats.flowStates >= 3) {
      achievements.push({
        id: 'flow_master',
        title: 'Flow Master',
        description: 'Entered flow state 3+ times',
        icon: '🌊',
        unlocked: true,
        rarity: 'epic',
        points: 100
      });
    }
    
    // Productivity achievements
    if (stats.productivityScore >= 80) {
      achievements.push({
        id: 'productivity_king',
        title: 'Productivity King',
        description: 'Achieved 80%+ productivity score',
        icon: '👑',
        unlocked: true,
        rarity: 'legendary',
        points: 150
      });
    }
    
    // Consistency achievements
    if (stats.consistency >= 70) {
      achievements.push({
        id: 'consistent',
        title: 'Consistency Champion',
        description: 'Maintained consistent focus throughout',
        icon: '📈',
        unlocked: true,
        rarity: 'rare',
        points: 60
      });
    }
    
    // Peak performance achievements
    if (stats.peakFlow >= 90) {
      achievements.push({
        id: 'peak_performance',
        title: 'Peak Performance',
        description: 'Reached 90%+ peak flow state',
        icon: '⚡',
        unlocked: true,
        rarity: 'epic',
        points: 120
      });
    }
    
    return achievements;
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400 border-gray-400/20 bg-gray-400/10';
      case 'rare': return 'text-blue-400 border-blue-400/20 bg-blue-400/10';
      case 'epic': return 'text-purple-400 border-purple-400/20 bg-purple-400/10';
      case 'legendary': return 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10';
      default: return 'text-gray-400 border-gray-400/20 bg-gray-400/10';
    }
  };

  const getPerformanceRating = () => {
    const stats = calculateStats();
    const score = stats.productivityScore;
    
    if (score >= 90) return { rating: 'Exceptional', color: 'text-yellow-400', icon: '🌟' };
    if (score >= 80) return { rating: 'Excellent', color: 'text-green-400', icon: '⭐' };
    if (score >= 70) return { rating: 'Great', color: 'text-blue-400', icon: '👍' };
    if (score >= 60) return { rating: 'Good', color: 'text-cyan-400', icon: '👌' };
    return { rating: 'Room for Improvement', color: 'text-orange-400', icon: '💪' };
  };

  const stats = calculateStats();
  const achievements = getAchievements();
  const performance = getPerformanceRating();
  const totalPoints = achievements.reduce((sum, ach) => sum + ach.points, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto"
    >
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6 mb-6"
          >
            <div className="flex justify-between items-center">
              <div>
                 <h1 className="text-4xl font-extralight text-white/90 tracking-tight mb-2 flex items-center space-x-2">
                   <Trophy className="w-8 h-8 text-yellow-400" />
                   <span>Session Complete!</span>
                 </h1>
                 <p className="text-xl font-light text-white/50">Here's how you performed in this session</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <span className="text-white/70 text-xl">×</span>
              </button>
            </div>
          </motion.div>

          {/* Session Activities */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6 mb-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
              <Brain className="w-6 h-6" />
              <span>What You Accomplished</span>
            </h2>
            
            <div className="space-y-4">
              {/* Main Activity */}
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-5">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">📚</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">Studying JavaScript</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-white/80 text-sm">Learning about variables</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-white/80 text-sm">Understanding data types</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{formatTime(stats.duration)}</div>
                    <div className="text-white/50 text-xs">Time spent</div>
                  </div>
                </div>
              </div>

              {/* Secondary Activities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="text-white/90 font-medium text-sm">Active Resources</span>
                  </div>
                  <ul className="space-y-1.5 text-white/70 text-xs">
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                      <span>JavaScript.info</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                      <span>MDN Web Docs</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-orange-400" />
                    </div>
                    <span className="text-white/90 font-medium text-sm">Distractions Removed</span>
                  </div>
                  <ul className="space-y-1.5 text-white/50 text-xs">
                    <li className="flex items-center space-x-2">
                      <span className="text-orange-400">×</span>
                      <span className="line-through">Instagram</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-orange-400">×</span>
                      <span className="line-through">Gmail</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-orange-400">×</span>
                      <span className="line-through">YouTube</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-orange-400">×</span>
                      <span className="line-through">LinkedIn</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-orange-400">×</span>
                      <span className="line-through">WebstaurantStore</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-orange-400">×</span>
                      <span className="line-through">Quizlet</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Session Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-3 gap-4 mb-6"
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-white/70 text-sm">Duration</span>
              </div>
              <div className="text-2xl font-bold text-white">{formatTime(stats.duration)}</div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-5 h-5 text-green-400" />
                <span className="text-white/70 text-sm">Focus Events</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.focusEvents}</div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                <span className="text-white/70 text-sm">Avg Focus</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.averageFocus}%</div>
            </div>
          </motion.div>

          {/* Artemis Interventions */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6 mb-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
              <Zap className="w-6 h-6" />
              <span>Artemis Interventions</span>
            </h2>
            
            <div className="space-y-3">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-start space-x-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg"
              >
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-blue-400 font-medium text-sm">Session Initialized</p>
                    <span className="text-blue-400/60 text-xs">0:03</span>
                  </div>
                  <p className="text-white/70 text-xs">Detected workspace setup and gathered context from open applications, gaze data, and recent work history</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 }}
                className="flex items-start space-x-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg"
              >
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-purple-400 font-medium text-sm">Goal Inference</p>
                    <span className="text-purple-400/60 text-xs">0:12</span>
                  </div>
                  <p className="text-white/70 text-xs">Analyzed ongoing tasks and recent documents to identify true goals. Calibration phase initiated</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-start space-x-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg"
              >
                <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-orange-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-orange-400 font-medium text-sm">Distraction Control</p>
                    <span className="text-orange-400/60 text-xs">0:25</span>
                  </div>
                  <p className="text-white/70 text-xs">Hidden 6 distracting tabs (Instagram, Gmail, YouTube, LinkedIn, WebstaurantStore, Quizlet). Kept JavaScript.info and MDN open for learning</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 }}
                className="flex items-start space-x-3 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg"
              >
                <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-cyan-400 font-medium text-sm">Engagement Phase</p>
                    <span className="text-cyan-400/60 text-xs">0:50</span>
                  </div>
                  <p className="text-white/70 text-xs">Gaze and keystroke rhythm stabilized. Lighting cooling from ~3000K to ~4500K for alertness</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-start space-x-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
              >
                <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-yellow-400 font-medium text-sm">Environmental Adaptation</p>
                    <span className="text-yellow-400/60 text-xs">1:20</span>
                  </div>
                  <p className="text-white/70 text-xs">IoT devices synced. Lighting cooling to ~5500K for crisp daylight ambience</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.65 }}
                className="flex items-start space-x-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
              >
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-red-400 font-medium text-sm">Digital Throttling</p>
                    <span className="text-red-400/60 text-xs">1:50</span>
                  </div>
                  <p className="text-white/70 text-xs">Non-essential network usage throttled. Phone notifications paused</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="flex items-start space-x-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
              >
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Brain className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-green-400 font-medium text-sm">Peak Focus (Flow State)</p>
                    <span className="text-green-400/60 text-xs">2:30</span>
                  </div>
                  <p className="text-white/70 text-xs">Minimal blink variation, consistent fixation, stable typing cadence. Lighting at ~5600K</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.75 }}
                className="flex items-start space-x-3 p-3 bg-orange-600/10 border border-orange-600/20 rounded-lg"
              >
                <div className="w-8 h-8 bg-orange-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Coffee className="w-4 h-4 text-orange-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-orange-500 font-medium text-sm">Recovery Initiated</p>
                    <span className="text-orange-500/60 text-xs">3:40</span>
                  </div>
                  <p className="text-white/70 text-xs">Early cognitive fatigue detected. Lighting warming to ~3200K with ambient music</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="flex items-start space-x-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
              >
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-emerald-400 font-medium text-sm">Session Concluded</p>
                    <span className="text-emerald-400/60 text-xs">4:30</span>
                  </div>
                  <p className="text-white/70 text-xs">Session highlights displayed: flow duration, productivity trends, and focus phases</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.85 }}
                className="flex items-start space-x-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg"
              >
                <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-indigo-400 font-medium text-sm">Cool-Down</p>
                    <span className="text-indigo-400/60 text-xs">4:50</span>
                  </div>
                  <p className="text-white/70 text-xs">Phone connection restored. Welcome back. You had done great.</p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center space-x-4"
          >
            <motion.button
              onClick={onStartNewSession}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
               className="group relative px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl text-white/90 font-light text-lg transition-all duration-300"
            >
              <div className="flex items-center space-x-3">
                <Target className="w-5 h-5" />
                <span>Start New Session</span>
              </div>
              {/* Button glow on hover */}
              <motion.div
                className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
                initial={false}
              />
            </motion.button>
            
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
               className="group relative px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl text-white/90 font-light text-lg transition-all duration-300"
            >
              <div className="flex items-center space-x-3">
                <span>Close</span>
              </div>
              {/* Button glow on hover */}
              <motion.div
                className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
                initial={false}
              />
            </motion.button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
