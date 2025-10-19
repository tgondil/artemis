import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Play, 
  Square, 
  Target, 
  Trophy, 
  Clock, 
  Zap, 
  Brain,
  Activity,
  TrendingUp,
  Award,
  Lightbulb,
  ArrowLeft
} from 'lucide-react';
import FocusGraph from './FocusGraph';
import SessionSummary from './SessionSummary';
import { SessionData, SessionEvent } from '../types/session';

interface DashboardData {
  windowContext: any;
  chromeContext: any;
  chromeContent: any;
  flowState: any;
  optimization: any;
  insights: any;
}

interface EnhancedFlowSyncDashboardProps {
  onClose?: () => void;
}

export default function EnhancedFlowSyncDashboard({ onClose }: EnhancedFlowSyncDashboardProps = {}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  console.log('[EnhancedDashboard] EnhancedFlowSyncDashboard component mounted');

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

  // Start session automatically when dashboard opens
  useEffect(() => {
    const newSession = initializeSession();
    setSessionData(newSession);
    setIsSessionActive(true);
    
    // Add initial event
    addEvent('focus_start', 100, 'Session Started', 'FlowSync session began', '#4ade80');
  }, []);

  // Simulate focus events (in real implementation, these would come from actual tracking)
  useEffect(() => {
    if (!isSessionActive || !sessionData) return;
    
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
  }, [isSessionActive, sessionData]);

  // Update current time
  useEffect(() => {
    if (!isSessionActive || !sessionData) return;
    
    intervalRef.current = setInterval(() => {
      setCurrentTime(Date.now() - sessionData.startTime);
    }, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isSessionActive, sessionData]);

  // Trigger distraction control at 25 seconds
  useEffect(() => {
    if (!isSessionActive || !sessionData) return;

    const distractionControlTimeout = setTimeout(async () => {
      console.log('[EnhancedDashboard] ⏰ Triggering distraction control at 25 seconds...');
      
      // URLs to close (non-JavaScript learning tabs)
      const urlsToClose = [
        'instagram.com',
        'mail.google.com',
        'youtube.com',
        'linkedin.com',
        'webstaurantstore.com',
        'quizlet.com'
      ];

      console.log('[EnhancedDashboard] URLs to close:', urlsToClose);

      try {
        if (window.chromeMonitor) {
          console.log('[EnhancedDashboard] Calling window.chromeMonitor.closeTabs...');
          const result = await window.chromeMonitor.closeTabs(urlsToClose);
          console.log('[EnhancedDashboard] Result:', result);
          
          if (result.success) {
            console.log(`[EnhancedDashboard] ✓ Successfully closed ${result.closedCount} tabs`);
            addEvent('distraction', 0, 'Distraction Control', 
              `Closed ${result.closedCount} distracting tabs to improve focus`, '#f59e0b');
          } else {
            console.error('[EnhancedDashboard] ✗ Failed to close tabs:', result.error);
          }
        } else {
          console.error('[EnhancedDashboard] ✗ window.chromeMonitor is not available!');
        }
      } catch (error) {
        console.error('[EnhancedDashboard] ✗ Exception while closing tabs:', error);
      }
    }, 25000); // 25 seconds

    return () => clearTimeout(distractionControlTimeout);
  }, [isSessionActive, sessionData]);

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

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[EnhancedDashboard] Loading hardcoded demo data...');
      
      // Calculate dynamic values based on session time
      const sessionSeconds = sessionData ? (Date.now() - sessionData.startTime) / 1000 : 0;
      const sessionMinutes = sessionSeconds / 60;
      
      // Dynamic phase progression
      let phase = 'calibration';
      let confidence = 50;
      let focusStability = 45;
      let taskCoherence = 50;
      let distractionLevel = 25;
      let cognitiveLoad = 35;
      let sessionFocusStability = 45;
      
      if (sessionMinutes < 0.5) {
        // Initialization (0-30s)
        phase = 'calibration';
        confidence = 50 + sessionMinutes * 20;
        focusStability = 45 + sessionMinutes * 30;
        taskCoherence = 50 + sessionMinutes * 25;
        distractionLevel = 25 - sessionMinutes * 20;
        cognitiveLoad = 35 + sessionMinutes * 20;
        sessionFocusStability = 45 + sessionMinutes * 30;
      } else if (sessionMinutes < 0.8) {
        // Goal Inference (30s-48s)
        phase = 'engagement';
        confidence = 60 + (sessionMinutes - 0.5) * 40;
        focusStability = 60 + (sessionMinutes - 0.5) * 50;
        taskCoherence = 62 + (sessionMinutes - 0.5) * 60;
        distractionLevel = 15 - (sessionMinutes - 0.5) * 20;
        cognitiveLoad = 45 + (sessionMinutes - 0.5) * 40;
        sessionFocusStability = 60 + (sessionMinutes - 0.5) * 40;
      } else if (sessionMinutes < 2.5) {
        // Engagement Phase (48s-2.5min)
        const progress = (sessionMinutes - 0.8) / 1.7;
        phase = 'engagement';
        confidence = 72 + progress * 10;
        focusStability = 75 + progress * 8;
        taskCoherence = 80 + progress * 8;
        distractionLevel = 12 - progress * 4;
        cognitiveLoad = 57 + progress * 8;
        sessionFocusStability = 72 + progress * 8;
      } else if (sessionMinutes < 3.7) {
        // Flow State (2.5min-3.7min)
        const progress = (sessionMinutes - 2.5) / 1.2;
        phase = 'flow';
        confidence = 82 + progress * 3;
        focusStability = 82 + progress * 2;
        taskCoherence = 88;
        distractionLevel = 8;
        cognitiveLoad = 65;
        sessionFocusStability = 78 + progress * 2;
      } else {
        // Recovery (3.7min+)
        const progress = Math.min(1, (sessionMinutes - 3.7) / 1.3);
        phase = 'recovery';
        confidence = 85 - progress * 10;
        focusStability = 84 - progress * 12;
        taskCoherence = 88 - progress * 8;
        distractionLevel = 8 + progress * 7;
        cognitiveLoad = 65 - progress * 15;
        sessionFocusStability = 80 - progress * 10;
      }
      
      // Add subtle variations
      confidence += (Math.random() - 0.5) * 2;
      focusStability += (Math.random() - 0.5) * 2;
      taskCoherence += (Math.random() - 0.5) * 2;
      distractionLevel += (Math.random() - 0.5) * 1;
      cognitiveLoad += (Math.random() - 0.5) * 2;
      sessionFocusStability += (Math.random() - 0.5) * 2;
      
      // Clamp values
      confidence = Math.max(50, Math.min(90, confidence));
      focusStability = Math.max(45, Math.min(85, focusStability));
      taskCoherence = Math.max(50, Math.min(90, taskCoherence));
      distractionLevel = Math.max(5, Math.min(25, distractionLevel));
      cognitiveLoad = Math.max(35, Math.min(70, cognitiveLoad));
      sessionFocusStability = Math.max(45, Math.min(82, sessionFocusStability));
      
      // Hardcoded data for JavaScript learning session with dynamic values
      setData({
        windowContext: {
          currentTask: {
            app: 'Google Chrome',
            filePath: 'javascript.info - Variables',
            project: 'JavaScript Learning',
            focusDuration: Math.floor(sessionSeconds * 1000), // Dynamic focus duration
            windowType: 'browser'
          },
          sessionContext: {
            primaryActivity: 'Learning JavaScript',
            focusStability: Math.round(sessionFocusStability)
          }
        },
        chromeContext: {
          currentBrowsingContext: {
            primaryDomain: 'javascript.info',
            browsingMode: 'research',
            activeTabs: [
              { metadata: { title: 'Variables - JavaScript.info', url: 'https://javascript.info/' } },
              { metadata: { title: 'JavaScript | MDN', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript' } }
            ],
            focusStability: Math.round(focusStability)
          },
          tabAnalysis: {
            highEngagementTabs: [
              { url: 'javascript.info', engagementScore: 87 },
              { url: 'developer.mozilla.org', engagementScore: 79 }
            ]
          },
          sessionPatterns: {
            distractionLevel: Math.round(distractionLevel)
          }
        },
        chromeContent: {
          llmContext: {
            currentPage: {
              title: 'Variables - JavaScript.info',
              readingTime: 8,
              hasCode: true,
              language: 'JavaScript',
              framework: null,
              sentiment: 'positive'
            }
          }
        },
        flowState: {
          phase,
          confidence: Math.round(confidence),
          indicators: {
            focusStability: Math.round(focusStability),
            taskCoherence: Math.round(taskCoherence),
            distractionLevel: Math.round(distractionLevel),
            cognitiveLoad: Math.round(cognitiveLoad)
          }
        },
        optimization: {
          action: 'maintain_focus',
          priority: 'low',
          reasoning: 'User is in deep focus on JavaScript learning. All distracting tabs have been closed.',
          tabsToHide: [],
          tabsToShow: []
        },
        insights: {
          currentTask: 'Learning JavaScript fundamentals',
          workMode: 'deep_learning',
          productivityScore: 88,
          distractionTriggers: [],
          recommendedActions: ['Continue current focus', 'Take a break in 15 minutes']
        }
      });

      setLastRefresh(new Date());
    } catch (error: any) {
      console.error('[EnhancedDashboard] Error loading data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch data immediately when component mounts
    console.log('[EnhancedDashboard] Fetching data immediately...');
    fetchAllData();

    // Set up regular updates every 2 seconds for smooth real-time experience
    const interval = setInterval(fetchAllData, 2000);
    
    return () => {
      clearInterval(interval);
    };
  }, [sessionData]);

  const handleSessionEnd = () => {
    if (!sessionData) return;
    
    const finalSession = {
      ...sessionData,
      endTime: Date.now(),
      duration: Date.now() - sessionData.startTime
    };
    
    setIsSessionActive(false);
    setSessionData(finalSession);
    setShowSessionSummary(true);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleStartNewSession = () => {
    setShowSessionSummary(false);
    const newSession = initializeSession();
    setSessionData(newSession);
    setIsSessionActive(true);
    setCurrentTime(0);
    
    // Add initial event
    addEvent('focus_start', 100, 'Session Started', 'FlowSync session began', '#4ade80');
  };

  const handleCloseSessionSummary = () => {
    setShowSessionSummary(false);
    setSessionData(null);
  };

  if (loading && !data) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-8 text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <div>Loading Enhanced FlowSync Dashboard...</div>
          <div className="text-sm text-white/70 mt-2">This may take a moment...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-red-500/20 backdrop-blur-xl border border-red-500/30 rounded-lg p-8 text-white text-center max-w-md">
          <div className="text-red-400 mb-4">⚠️ Error Loading Dashboard</div>
          <div className="text-sm text-white/70 mb-4">{error}</div>
          <button 
            onClick={fetchAllData}
            className="px-4 py-2 bg-white/10 rounded hover:bg-white/20 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-8 text-white text-center">
          <div className="text-lg font-semibold mb-4">🧠 Enhanced FlowSync Dashboard</div>
          <div className="text-sm text-white/70 mb-4">Waiting for data...</div>
          <div className="text-xs text-white/50">This may take up to 15 seconds</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6 mb-6"
          >
            <div className="flex justify-between items-center">
              <div>
                 <h1 className="text-4xl font-extralight text-white/90 tracking-tight mb-2">🎯 Artemis Dashboard</h1>
                 <p className="text-xl font-light text-white/50">Track your focus, optimize your workspace, and achieve flow state</p>
                 {isSessionActive && (
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
                {onClose && (
                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="group relative px-6 py-3 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl text-white/90 font-light text-sm transition-all duration-300"
                  >
                    <div className="flex items-center space-x-2">
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </div>
                    {/* Button glow on hover */}
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
                      initial={false}
                    />
                  </motion.button>
                )}
                {!isSessionActive ? (
                  <motion.button
                    onClick={handleStartNewSession}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="group relative px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl text-white/90 font-light text-lg transition-all duration-300"
                  >
                    <div className="flex items-center space-x-3">
                      <Play className="w-5 h-5" />
                      <span>Start Focus Session</span>
                    </div>
                    {/* Button glow on hover */}
                    <motion.div
                      className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
                      initial={false}
                    />
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={handleSessionEnd}
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

          {/* Real-time Focus Graph */}
          {isSessionActive && sessionData && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <FocusGraph 
                isActive={isSessionActive}
                sessionStartTime={sessionData.startTime}
                onDataUpdate={(data) => {
                  // Handle real-time data updates if needed
                }}
              />
            </motion.div>
          )}


          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Flow State */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Brain className="w-5 h-5" />
                <span>Flow State</span>
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/70">Phase:</span>
                  <span className={`font-semibold ${
                    data.flowState?.phase === 'flow' ? 'text-green-400' :
                    data.flowState?.phase === 'engagement' ? 'text-blue-400' :
                    data.flowState?.phase === 'recovery' ? 'text-orange-400' : 'text-gray-400'
                  }`}>
                    {data.flowState?.phase || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Confidence:</span>
                  <span className="text-white">{data.flowState?.confidence || 'Unknown'}%</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Focus Stability:</span>
                    <span className="text-white">{data.flowState?.indicators?.focusStability || 'Unknown'}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Task Coherence:</span>
                    <span className="text-white">{data.flowState?.indicators?.taskCoherence || 'Unknown'}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Distraction Level:</span>
                    <span className="text-white">{data.flowState?.indicators?.distractionLevel || 'Unknown'}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Cognitive Load:</span>
                    <span className="text-white">{data.flowState?.indicators?.cognitiveLoad || 'Unknown'}%</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Current Task */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Current Task</span>
              </h2>
              <div className="space-y-3">
                <div>
                  <div className="text-white/70 text-sm mb-1">Active App:</div>
                  <div className="text-white font-medium">{data.windowContext?.currentTask?.app || 'Unknown'}</div>
                </div>
                {data.windowContext?.currentTask?.filePath && (
                  <div>
                    <div className="text-white/70 text-sm mb-1">File:</div>
                    <div className="text-white text-sm truncate">{data.windowContext.currentTask.filePath}</div>
                  </div>
                )}
                {data.windowContext?.currentTask?.project && (
                  <div>
                    <div className="text-white/70 text-sm mb-1">Project:</div>
                    <div className="text-white text-sm">{data.windowContext.currentTask.project}</div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Focus Duration:</span>
                  <span className="text-white text-sm">{data.windowContext?.currentTask?.focusDuration ? Math.round(data.windowContext.currentTask.focusDuration / 1000) : 'Unknown'}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Window Type:</span>
                  <span className="text-white text-sm capitalize">{data.windowContext?.currentTask?.windowType || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Primary Activity:</span>
                  <span className="text-white text-sm">{data.windowContext?.sessionContext?.primaryActivity || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Focus Stability:</span>
                  <span className="text-white text-sm">{Math.round(data.windowContext?.sessionContext?.focusStability || 0)}%</span>
                </div>
              </div>
            </motion.div>

            {/* Browser Context */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Browser Context</span>
              </h2>
              <div className="space-y-3">
                <div>
                  <div className="text-white/70 text-sm mb-1">Primary Domain:</div>
                  <div className="text-white text-sm">{data.chromeContext?.currentBrowsingContext?.primaryDomain || 'Unknown'}</div>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Browsing Mode:</span>
                  <span className="text-white text-sm capitalize">{data.chromeContext?.currentBrowsingContext?.browsingMode || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Active Tabs:</span>
                  <span className="text-white text-sm">{data.chromeContext?.currentBrowsingContext?.activeTabs?.length || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">High Engagement:</span>
                  <span className="text-white text-sm">{data.chromeContext?.tabAnalysis?.highEngagementTabs?.length || 0} tabs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Distraction Level:</span>
                  <span className="text-white text-sm">{data.chromeContext?.sessionPatterns?.distractionLevel || 'Unknown'}%</span>
                </div>
              </div>
            </motion.div>

            {/* Content Analysis */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Content Analysis</span>
              </h2>
              <div className="space-y-3">
                <div>
                  <div className="text-white/70 text-sm mb-1">Current Page:</div>
                  <div className="text-white text-sm truncate">{data.chromeContent?.llmContext?.currentPage?.title || 'Unknown'}</div>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Reading Time:</span>
                  <span className="text-white text-sm">{data.chromeContent?.llmContext?.currentPage?.readingTime || 'Unknown'} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Has Code:</span>
                  <span className="text-white text-sm">{data.chromeContent?.llmContext?.currentPage?.hasCode ? 'Yes' : 'No'}</span>
                </div>
                {data.chromeContent?.llmContext?.currentPage?.language && (
                  <div className="flex justify-between">
                    <span className="text-white/70 text-sm">Language:</span>
                    <span className="text-white text-sm">{data.chromeContent.llmContext.currentPage.language}</span>
                  </div>
                )}
                {data.chromeContent?.llmContext?.currentPage?.framework && (
                  <div className="flex justify-between">
                    <span className="text-white/70 text-sm">Framework:</span>
                    <span className="text-white text-sm">{data.chromeContent.llmContext.currentPage.framework}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Sentiment:</span>
                  <span className={`text-sm ${
                    data.chromeContent?.llmContext?.currentPage?.sentiment === 'positive' ? 'text-green-400' :
                    data.chromeContent?.llmContext?.currentPage?.sentiment === 'negative' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {data.chromeContent?.llmContext?.currentPage?.sentiment || 'Unknown'}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Workspace Optimization */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>Optimization</span>
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Action:</span>
                  <span className="text-white text-sm capitalize">{data.optimization?.action ? data.optimization.action.replace('_', ' ') : 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Priority:</span>
                  <span className={`text-sm ${
                    data.optimization?.priority === 'high' ? 'text-red-400' :
                    data.optimization?.priority === 'medium' ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {data.optimization?.priority || 'Unknown'}
                  </span>
                </div>
                <div>
                  <div className="text-white/70 text-sm mb-1">Reasoning:</div>
                  <div className="text-white text-sm">{data.optimization?.reasoning || 'Unknown'}</div>
                </div>
                {data.optimization?.tabsToHide?.length > 0 && (
                  <div>
                    <div className="text-white/70 text-sm mb-1">Tabs to Hide:</div>
                    <div className="text-white text-sm">{data.optimization.tabsToHide.length} tabs</div>
                  </div>
                )}
                {data.optimization?.tabsToShow?.length > 0 && (
                  <div>
                    <div className="text-white/70 text-sm mb-1">Tabs to Show:</div>
                    <div className="text-white text-sm">{data.optimization.tabsToShow.length} tabs</div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Session Insights */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Session Insights</span>
              </h2>
              <div className="space-y-3">
                <div>
                  <div className="text-white/70 text-sm mb-1">Current Task:</div>
                  <div className="text-white text-sm">{data.insights?.currentTask || 'Unknown'}</div>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Work Mode:</span>
                  <span className="text-white text-sm capitalize">{data.insights?.workMode || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Productivity:</span>
                  <span className="text-white text-sm">{data.insights?.productivityScore || 'Unknown'}%</span>
                </div>
                {data.insights?.distractionTriggers?.length > 0 && (
                  <div>
                    <div className="text-white/70 text-sm mb-1">Distraction Triggers:</div>
                    <div className="text-white text-sm">{data.insights.distractionTriggers.join(', ')}</div>
                  </div>
                )}
                {data.insights?.recommendedActions?.length > 0 && (
                  <div>
                    <div className="text-white/70 text-sm mb-1">Recommended Actions:</div>
                    <div className="text-white text-sm">{data.insights.recommendedActions.slice(0, 2).join(', ')}</div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Session Summary Modal */}
      <AnimatePresence>
        {showSessionSummary && sessionData && (
          <SessionSummary
            sessionData={sessionData}
            onStartNewSession={handleStartNewSession}
            onClose={handleCloseSessionSummary}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
