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
  Lightbulb
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
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="text-white/90 font-medium text-sm">Resources Accessed</span>
                  </div>
                  <ul className="space-y-1 text-white/70 text-xs">
                    <li>• MDN Web Docs</li>
                    <li>• JavaScript.info</li>
                    <li>• Code editor</li>
                  </ul>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-white/90 font-medium text-sm">Key Concepts</span>
                  </div>
                  <ul className="space-y-1 text-white/70 text-xs">
                    <li>• Variable declaration (let, const, var)</li>
                    <li>• String and Number types</li>
                    <li>• Variable scope</li>
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
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
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
                <Zap className="w-5 h-5 text-cyan-400" />
                <span className="text-white/70 text-sm">Flow States</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.flowStates}</div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                <span className="text-white/70 text-sm">Avg Focus</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.averageFocus}%</div>
            </div>
          </motion.div>

          {/* Achievements */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6 mb-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
              <Award className="w-6 h-6" />
              <span>Achievements Unlocked</span>
            </h2>
            
            {achievements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className={`p-4 rounded-lg border ${getRarityColor(achievement.rarity)}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-white">{achievement.title}</h3>
                          <span className="text-xs font-medium text-white/70">+{achievement.points} pts</span>
                        </div>
                        <p className="text-white/70 text-sm">{achievement.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/50">No achievements unlocked this session</p>
                <p className="text-white/30 text-sm">Keep going to unlock your first achievement!</p>
              </div>
            )}
          </motion.div>

          {/* Insights & Recommendations */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6 mb-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
              <Lightbulb className="w-6 h-6" />
              <span>Insights & Recommendations</span>
            </h2>
            
            <div className="space-y-4">
              {stats.flowStates >= 3 && (
                <div className="flex items-start space-x-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-green-400 font-medium">Great flow state management!</p>
                    <p className="text-white/70 text-sm">You entered flow state {stats.flowStates} times. This shows excellent focus control.</p>
                  </div>
                </div>
              )}
              
              {stats.distractions > stats.focusEvents && (
                <div className="flex items-start space-x-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5" />
                  <div>
                    <p className="text-orange-400 font-medium">Consider reducing distractions</p>
                    <p className="text-white/70 text-sm">You had {stats.distractions} distractions vs {stats.focusEvents} focus events. Try closing unnecessary tabs.</p>
                  </div>
                </div>
              )}
              
              {stats.consistency >= 70 && (
                <div className="flex items-start space-x-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-blue-400 font-medium">Excellent consistency!</p>
                    <p className="text-white/70 text-sm">Your focus consistency was {stats.consistency}%. Keep up the great work!</p>
                  </div>
                </div>
              )}
              
              {stats.duration < 900000 && (
                <div className="flex items-start space-x-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <Lightbulb className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-purple-400 font-medium">Try longer sessions for better results</p>
                    <p className="text-white/70 text-sm">Sessions over 15 minutes tend to yield better focus and productivity.</p>
                  </div>
                </div>
              )}
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
