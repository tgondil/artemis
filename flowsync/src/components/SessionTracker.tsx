import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, BarChart3, Trophy, Clock, Target, Zap } from 'lucide-react';
import { SessionEvent, SessionData } from '../types/session';

interface SessionTrackerProps {
  onSessionStart?: () => void;
  onSessionEnd?: (sessionData: SessionData) => void;
}

export default function SessionTracker({ onSessionStart, onSessionEnd }: SessionTrackerProps) {
  const [isActive, setIsActive] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize session data
  const initializeSession = (): SessionData => ({
    startTime: Date.now(),
    endTime: Date.now(),
    duration: 0,
    events: [],
    achievements: [],
    focusSessions: [],
    totalFocusTime: 0,
    productivityScore: 0,
    flowStates: []
  });

  // Start session
  const startSession = () => {
    const newSession = initializeSession();
    setSessionData(newSession);
    setIsActive(true);
    setShowSummary(false);
    onSessionStart?.();
    
    // Add initial event
    addEvent('focus_start', 100, 'Session Started', 'FlowSync session began', '#4ade80');
  };

  // Stop session
  const stopSession = () => {
    if (!sessionData) return;
    
    const finalSession = {
      ...sessionData,
      endTime: Date.now(),
      duration: Date.now() - sessionData.startTime
    };
    
    setIsActive(false);
    setShowSummary(true);
    onSessionEnd?.(finalSession);
    
    // Add final event
    addEvent('focus_end', 0, 'Session Ended', 'FlowSync session completed', '#ef4444');
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  // Add event to session
  const addEvent = (type: SessionEvent['type'], value: number, label: string, description?: string, color: string = '#6b7280') => {
    if (!sessionData) return;
    
    const event: SessionEvent = {
      id: `${type}_${Date.now()}`,
      timestamp: Date.now() - sessionData.startTime,
      type,
      value,
      label,
      description,
      color
    };
    
    setSessionData(prev => prev ? {
      ...prev,
      events: [...prev.events, event]
    } : null);
  };

  // Simulate focus events (in real implementation, these would come from actual tracking)
  useEffect(() => {
    if (!isActive || !sessionData) return;
    
    const eventInterval = setInterval(() => {
      const random = Math.random();
      
      if (random < 0.1) {
        // Focus session start
        addEvent('focus_start', Math.random() * 100, 'Deep Focus', 'Entered focused work state', '#10b981');
      } else if (random < 0.15) {
        // Task switch
        addEvent('task_switch', Math.random() * 50, 'Task Switch', 'Switched to new task', '#f59e0b');
      } else if (random < 0.2) {
        // Distraction
        addEvent('distraction', Math.random() * 30, 'Distraction', 'Brief distraction detected', '#ef4444');
      } else if (random < 0.25) {
        // Achievement
        const achievements = [
          'Completed task milestone',
          'Maintained focus for 15 minutes',
          'Reached flow state',
          'Productivity streak achieved'
        ];
        const achievement = achievements[Math.floor(Math.random() * achievements.length)];
        addEvent('achievement', 100, achievement, 'Great work!', '#8b5cf6');
      } else if (random < 0.3) {
        // Flow state
        addEvent('flow_state', Math.random() * 100, 'Flow State', 'Entered optimal flow state', '#06b6d4');
      }
    }, 5000); // Add event every 5 seconds
    
    return () => clearInterval(eventInterval);
  }, [isActive, sessionData]);

  // Update current time
  useEffect(() => {
    if (!isActive || !sessionData) return;
    
    intervalRef.current = setInterval(() => {
      setCurrentTime(Date.now() - sessionData.startTime);
    }, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, sessionData]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSessionStats = () => {
    if (!sessionData) return null;
    
    const focusEvents = sessionData.events.filter(e => e.type === 'focus_start').length;
    const achievements = sessionData.events.filter(e => e.type === 'achievement').length;
    const distractions = sessionData.events.filter(e => e.type === 'distraction').length;
    const flowStates = sessionData.events.filter(e => e.type === 'flow_state').length;
    
    return {
      focusEvents,
      achievements,
      distractions,
      flowStates,
      productivityScore: Math.min(100, (focusEvents * 20) + (achievements * 15) - (distractions * 5))
    };
  };

  const stats = getSessionStats();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6 mb-6"
          >
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-extralight text-white/90 tracking-tight mb-2">🎯 FlowSync Session</h1>
                <p className="text-xl font-light text-white/50">Track your focus and productivity in real-time</p>
                {isActive && (
                  <div className="flex items-center space-x-4 mt-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400 text-sm font-medium">Session Active</span>
                    </div>
                    <div className="text-white/70 text-sm">
                      Duration: {formatTime(currentTime)}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3">
                {!isActive ? (
                  <motion.button
                    onClick={startSession}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="group relative px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl text-white/90 font-light text-lg transition-all duration-300"
                  >
                    <div className="flex items-center space-x-3">
                      <Play className="w-5 h-5" />
                      <span>Start Session</span>
                    </div>
                    {/* Button glow on hover */}
                    <motion.div
                      className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
                      initial={false}
                    />
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={stopSession}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="group relative px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl text-white/90 font-light text-lg transition-all duration-300"
                  >
                    <div className="flex items-center space-x-3">
                      <Square className="w-5 h-5" />
                      <span>End Session</span>
                    </div>
                    {/* Button glow on hover */}
                    <motion.div
                      className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
                      initial={false}
                    />
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Real-time Graph */}
          {isActive && sessionData && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6 mb-6"
            >
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                <BarChart3 className="w-6 h-6" />
                <span>Real-time Focus Graph</span>
              </h2>
              <div className="h-64 bg-black/20 rounded-lg p-4 relative overflow-hidden">
                <div className="absolute inset-4">
                  <svg width="100%" height="100%" className="w-full h-full">
                    {/* Grid lines */}
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    
                    {/* Focus line */}
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      points={sessionData.events
                        .filter(e => e.type === 'focus_start' || e.type === 'flow_state')
                        .map((event, index) => {
                          const x = (event.timestamp / currentTime) * 100;
                          const y = 100 - event.value;
                          return `${x}%,${y}%`;
                        })
                        .join(' ')}
                    />
                    
                    {/* Event markers */}
                    {sessionData.events.map((event, index) => {
                      const x = (event.timestamp / currentTime) * 100;
                      const y = 100 - event.value;
                      return (
                        <circle
                          key={event.id}
                          cx={`${x}%`}
                          cy={`${y}%`}
                          r="4"
                          fill={event.color}
                          className="drop-shadow-lg"
                        />
                      );
                    })}
                  </svg>
                </div>
                
                {/* Live indicator */}
                <div className="absolute top-2 right-2 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-xs font-medium">Live</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Session Stats */}
          {isActive && stats && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
            >
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-5 h-5 text-blue-400" />
                  <span className="text-white/70 text-sm">Focus Events</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.focusEvents}</div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Trophy className="w-5 h-5 text-purple-400" />
                  <span className="text-white/70 text-sm">Achievements</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.achievements}</div>
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
                  <BarChart3 className="w-5 h-5 text-green-400" />
                  <span className="text-white/70 text-sm">Productivity</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.productivityScore}%</div>
              </div>
            </motion.div>
          )}

          {/* Session Summary */}
          <AnimatePresence>
            {showSummary && sessionData && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6"
              >
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  <span>Session Summary</span>
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Session Overview</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-white/70">Duration:</span>
                        <span className="text-white font-medium">{formatTime(sessionData.duration)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Focus Events:</span>
                        <span className="text-white font-medium">{stats?.focusEvents || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Achievements:</span>
                        <span className="text-white font-medium">{stats?.achievements || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Productivity Score:</span>
                        <span className="text-white font-medium">{stats?.productivityScore || 0}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Achievements Unlocked</h3>
                    <div className="space-y-2">
                      {sessionData.events
                        .filter(e => e.type === 'achievement')
                        .map((event, index) => (
                          <div key={event.id} className="flex items-center space-x-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                            <span className="text-white text-sm">{event.label}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center space-x-4">
                  <motion.button
                    onClick={() => {
                      setShowSummary(false);
                      setSessionData(null);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-medium transition-all duration-200"
                  >
                    Start New Session
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
