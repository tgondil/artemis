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
      console.log('[EnhancedDashboard] Fetching all context data...');
      
      // Wait for APIs to be available
      if (!window.flowsyncWindowAPI) {
        throw new Error('Window API not available yet. Please try again in a moment.');
      }
      if (!window.chromeMonitor) {
        throw new Error('Chrome Monitor API not available yet. Please try again in a moment.');
      }
      if (!window.llmReasoning) {
        throw new Error('LLM Reasoning API not available yet. Please try again in a moment.');
      }
      
      // Fetch all data in parallel
      const windowResult = await window.flowsyncWindowAPI.getRichContext();
      const chromeContextResult = await window.chromeMonitor.getRichContext();
      const chromeContentResult = await window.chromeMonitor.getContentSummary();
      const llmAnalysisResult = await window.llmReasoning.getComprehensiveAnalysis();

      // Check for errors
      const errors = [
        windowResult.success ? null : `Window: ${windowResult.error}`,
        chromeContextResult.success ? null : `Chrome Context: ${chromeContextResult.error}`,
        chromeContentResult.success ? null : `Chrome Content: ${chromeContentResult.error}`,
        llmAnalysisResult.success ? null : `LLM Analysis: ${llmAnalysisResult.error}`
      ].filter(Boolean);

      if (errors.length > 0) {
        setError(errors.join(', '));
        return;
      }

      setData({
        windowContext: windowResult.context,
        chromeContext: chromeContextResult.context,
        chromeContent: chromeContentResult.summary,
        flowState: llmAnalysisResult.flowState,
        optimization: llmAnalysisResult.optimization,
        insights: llmAnalysisResult.insights
      });

      setLastRefresh(new Date());
    } catch (error: any) {
      console.error('[EnhancedDashboard] Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch data immediately when component mounts
    console.log('[EnhancedDashboard] Fetching data immediately...');
    fetchAllData();

    // Set up regular updates every 5 minutes
    const interval = setInterval(fetchAllData, 300000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

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
                 <h1 className="text-4xl font-extralight text-white/90 tracking-tight mb-2">🎯 Enhanced FlowSync Dashboard</h1>
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
                 {lastRefresh && (
                   <p className="text-white/50 text-sm mt-1">
                     Last updated: {lastRefresh.toLocaleTimeString()}
                   </p>
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
                <button 
                  onClick={fetchAllData}
                  disabled={loading}
                  className="px-4 py-2 bg-white/10 rounded hover:bg-white/20 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
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

          {/* Session Stats */}
          {isSessionActive && sessionData && (
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
                <div className="text-2xl font-bold text-white">{getSessionStats()?.focusEvents || 0}</div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Trophy className="w-5 h-5 text-purple-400" />
                  <span className="text-white/70 text-sm">Achievements</span>
                </div>
                <div className="text-2xl font-bold text-white">{getSessionStats()?.achievements || 0}</div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="w-5 h-5 text-cyan-400" />
                  <span className="text-white/70 text-sm">Flow States</span>
                </div>
                <div className="text-2xl font-bold text-white">{getSessionStats()?.flowStates || 0}</div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-green-400" />
                  <span className="text-white/70 text-sm">Productivity</span>
                </div>
                <div className="text-2xl font-bold text-white">{getSessionStats()?.productivityScore || 0}%</div>
              </div>
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
