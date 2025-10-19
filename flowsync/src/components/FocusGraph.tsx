import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Target, Lightbulb, Shield, Zap, Brain, Coffee, CheckCircle, Eye } from 'lucide-react';

interface SessionEvent {
  id: string;
  timestamp: number; // milliseconds from session start
  type: 'initialization' | 'goal_inference' | 'distraction_control' | 'engagement' | 'environmental' | 'digital_throttling' | 'flow_state' | 'recovery' | 'conclusion' | 'cooldown';
  title: string;
  description: string;
  icon: any;
  color: string;
  focusImpact: number; // How much this event affects focus level
}

interface GraphDataPoint {
  timestamp: number;
  focusLevel: number;
}

interface FocusGraphProps {
  isActive: boolean;
  sessionStartTime: number;
  onDataUpdate?: (data: GraphDataPoint) => void;
}

export default function FocusGraph({ isActive, sessionStartTime, onDataUpdate }: FocusGraphProps) {
  const [dataPoints, setDataPoints] = useState<GraphDataPoint[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState<GraphDataPoint | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<SessionEvent | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<number | null>(null);

  // Define session events based on the Artemis Flow Session log
  const sessionEvents: SessionEvent[] = [
    {
      id: 'init',
      timestamp: 3000, // 3 seconds
      type: 'initialization',
      title: 'Session Initialized',
      description: 'Artemis detected workspace setup and gathered context from open applications, gaze data, and recent work history',
      icon: Activity,
      color: '#3b82f6',
      focusImpact: 5
    },
    {
      id: 'goal',
      timestamp: 12000, // 12 seconds
      type: 'goal_inference',
      title: 'Goal Inference',
      description: 'Analyzing ongoing tasks and recent documents to identify true goals. Calibration phase initiated',
      icon: Target,
      color: '#8b5cf6',
      focusImpact: 8
    },
    {
      id: 'distraction',
      timestamp: 25000, // 25 seconds
      type: 'distraction_control',
      title: 'Distraction Control',
      description: 'Hidden irrelevant Chrome tabs and minimized unrelated apps. Visual clutter reduced for improved fixation stability',
      icon: Shield,
      color: '#f59e0b',
      focusImpact: 15
    },
    {
      id: 'engagement',
      timestamp: 50000, // 50 seconds
      type: 'engagement',
      title: 'Engagement Phase',
      description: 'Gaze and keystroke rhythm stabilized. Lighting cooling from ~3000K to ~4500K for alertness',
      icon: Zap,
      color: '#06b6d4',
      focusImpact: 20
    },
    {
      id: 'environmental',
      timestamp: 80000, // 1:20
      type: 'environmental',
      title: 'Environmental Adaptation',
      description: 'IoT devices synced. Lighting cooling to ~5500K for crisp daylight ambience',
      icon: Lightbulb,
      color: '#fbbf24',
      focusImpact: 12
    },
    {
      id: 'digital',
      timestamp: 110000, // 1:50
      type: 'digital_throttling',
      title: 'Digital Throttling',
      description: 'Non-essential network usage throttled. Phone notifications paused',
      icon: Shield,
      color: '#ef4444',
      focusImpact: 10
    },
    {
      id: 'flow',
      timestamp: 150000, // 2:30
      type: 'flow_state',
      title: 'Peak Focus (Flow State)',
      description: 'Minimal blink variation, consistent fixation, stable typing cadence. Lighting at ~5600K',
      icon: Brain,
      color: '#10b981',
      focusImpact: 30
    },
    {
      id: 'recovery',
      timestamp: 220000, // 3:40
      type: 'recovery',
      title: 'Recovery Initiated',
      description: 'Early cognitive fatigue detected. Lighting warming to ~3200K with ambient music',
      icon: Coffee,
      color: '#f97316',
      focusImpact: -15
    },
    {
      id: 'conclusion',
      timestamp: 270000, // 4:30
      type: 'conclusion',
      title: 'Session Concluded',
      description: 'Session highlights displayed: flow duration, productivity trends, and focus phases',
      icon: CheckCircle,
      color: '#22c55e',
      focusImpact: -10
    },
    {
      id: 'cooldown',
      timestamp: 290000, // 4:50
      type: 'cooldown',
      title: 'Cool-Down',
      description: 'Phone connection restored. Welcome back. You had done great.',
      icon: Eye,
      color: '#6366f1',
      focusImpact: -5
    }
  ];

  // Generate real-time creeping graph data
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const sessionDuration = Date.now() - sessionStartTime;
      const sessionMinutes = sessionDuration / 60000;
      
      // Real-time creeping patterns with constant change
      let focusLevel = 0;

      // Base patterns with realistic ranges (never hitting 0% or 100%)
      const baseFocus = 35 + (sessionMinutes / 5) * 45; // 35% to 80%

      // Add real-time creeping variations (smaller for realism)
      const timeVariation = Math.sin(sessionDuration / 2000) * 2; // 2-second cycle
      
      // Focus: steady climb with gentle waves (35-85% range)
      // Slightly steeper gradient during engagement and flow phases
      let gradientMultiplier = 1;
      if (sessionMinutes >= 0.8 && sessionMinutes < 2.5) {
        // Engagement phase - slightly steeper climb
        gradientMultiplier = 1.2;
      } else if (sessionMinutes >= 2.5 && sessionMinutes < 3.7) {
        // Flow state - maintain high level
        gradientMultiplier = 1.0;
      } else if (sessionMinutes >= 3.7) {
        // Recovery - very gentle, gradual decline
        const recoveryProgress = (sessionMinutes - 3.7) / 1.3; // 0 to 1 over 1.3 minutes
        gradientMultiplier = 1.0 - (recoveryProgress * 0.15); // Slowly decrease from 1.0 to 0.85
      }
      
      focusLevel = (baseFocus * gradientMultiplier) + timeVariation + (Math.random() - 0.5) * 2;

      // Clamp values
      focusLevel = Math.max(0, Math.min(100, focusLevel));

      const newDataPoint: GraphDataPoint = {
        timestamp: sessionDuration,
        focusLevel
      };

      setDataPoints(prev => {
        const updated = [...prev, newDataPoint];
        return updated.slice(-150); // Keep more points for smoother graph
      });

      setCurrentTime(sessionDuration);
      onDataUpdate?.(newDataPoint);
    }, 500); // Update every 0.5 seconds for real-time creeping

    return () => clearInterval(interval);
  }, [isActive, sessionStartTime, onDataUpdate, dataPoints.length]);

  // Animation loop for smooth graph updates
  useEffect(() => {
    if (!isActive) return;

    const animate = () => {
      setCurrentTime(Date.now() - sessionStartTime);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, sessionStartTime]);

  const getCurrentMetrics = () => {
    if (dataPoints.length === 0) return null;
    const latest = dataPoints[dataPoints.length - 1];
    return latest;
  };

  const currentMetrics = getCurrentMetrics();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Activity className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h2 className="text-2xl font-extralight text-white/90 tracking-tight">
              Focus Level
            </h2>
            <p className="text-white/50 text-sm">Real-time focus tracking</p>
          </div>
        </div>
        
        {isActive && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center space-x-3 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 bg-green-400 rounded-full"
            />
            <span className="text-green-400 text-sm font-medium">Live</span>
            <span className="text-white/50 text-xs">({dataPoints.length})</span>
          </motion.div>
        )}
      </div>

      {/* Professional Responsive Graph */}
      <div className="relative mb-8">
        <div className="bg-gradient-to-br from-black/20 to-black/40 rounded-xl p-6">
          {/* Graph Container */}
          <div 
            className="relative w-full h-96 cursor-crosshair"
            onMouseMove={(e) => {
              if (!isActive || dataPoints.length === 0) return;
              
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const graphWidth = rect.width;
              
              setMousePosition({ x: e.clientX, y: e.clientY });
              
              // Find the closest data point based on x position
              const relativeX = Math.max(0, Math.min(1, x / graphWidth));
              const pointIndex = Math.round(relativeX * (dataPoints.length - 1));
              
              if (pointIndex >= 0 && pointIndex < dataPoints.length) {
                setHoveredPoint(dataPoints[pointIndex]);
              }
            }}
            onMouseLeave={() => {
              setHoveredPoint(null);
            }}
          >
            {/* Y-axis labels overlay - positioned absolutely to prevent stretching */}
            <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-white/50 font-mono pointer-events-none">
              <div className="text-right pr-2">100</div>
              <div className="text-right pr-2">75</div>
              <div className="text-right pr-2">50</div>
              <div className="text-right pr-2">25</div>
              <div className="text-right pr-2">0</div>
            </div>
            
            {/* Combined SVG for Grid, Axes, and Lines */}
            <svg 
              width="100%" 
              height="100%" 
              viewBox="0 0 150 100"
              preserveAspectRatio="none"
              className="absolute inset-0"
            >
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.2"/>
                </pattern>
              </defs>
              
              {/* Grid background */}
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Y-axis line */}
              <line x1="8" y1="2" x2="8" y2="98" stroke="rgba(255,255,255,0.2)" strokeWidth="0.2" vectorEffect="non-scaling-stroke"/>

            {/* Graph Lines */}
            {dataPoints.length > 1 && (
              <>
                {/* Focus Line */}
                <path
                  d={`M ${dataPoints.map((point, i) => {
                    const x = 12 + (i / (dataPoints.length - 1)) * 135; // Adjusted for 150 width viewBox
                    const y = 5 + (100 - point.focusLevel) * 0.90;
                    return `${x},${y}`;
                  }).join(' L ')}`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="0.7"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-lg"
                />

                {/* Current time indicator */}
                {isActive && dataPoints.length > 0 && (
                  <line
                    x1={`${12 + (currentTime / Math.max(currentTime, 1)) * 135}`}
                    y1="5"
                    x2={`${12 + (currentTime / Math.max(currentTime, 1)) * 135}`}
                    y2="95"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="0.3"
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray="2,2"
                    className="animate-pulse"
                  />
                )}

                {/* Hover indicator */}
                {hoveredPoint && dataPoints.length > 0 && (
                  <>
                    <line
                      x1={`${12 + (dataPoints.indexOf(hoveredPoint) / (dataPoints.length - 1)) * 135}`}
                      y1="5"
                      x2={`${12 + (dataPoints.indexOf(hoveredPoint) / (dataPoints.length - 1)) * 135}`}
                      y2="95"
                      stroke="rgba(255,255,255,0.5)"
                      strokeWidth="0.3"
                      vectorEffect="non-scaling-stroke"
                      strokeDasharray="1,1"
                    />
                    {/* Data point circle */}
                    <circle
                      cx={`${12 + (dataPoints.indexOf(hoveredPoint) / (dataPoints.length - 1)) * 135}`}
                      cy={`${5 + (100 - hoveredPoint.focusLevel) * 0.90}`}
                      r="1.2"
                      fill="#10b981"
                      stroke="white"
                      strokeWidth="0.4"
                      vectorEffect="non-scaling-stroke"
                    />
                  </>
                )}
              </>
            )}
            </svg>
          </div>
        </div>
        
        {/* Hover Tooltips - Fixed positioning */}
        <AnimatePresence>
          {hoveredPoint && !hoveredEvent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bg-black/90 backdrop-blur-xl border border-white/20 rounded-lg p-3 pointer-events-none z-50 shadow-xl"
              style={{
                left: mousePosition.x + 15,
                top: mousePosition.y - 60,
              }}
            >
              <div className="text-white/90 text-xs font-medium mb-2">
                {Math.round(hoveredPoint.timestamp / 1000)}s
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-white/80 text-sm font-medium">Focus: {Math.round(hoveredPoint.focusLevel)}%</span>
              </div>
            </motion.div>
          )}

          {/* Event Tooltip */}
          {hoveredEvent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className="fixed bg-black/95 backdrop-blur-xl border border-white/20 rounded-xl p-4 pointer-events-none z-50 shadow-2xl max-w-sm"
              style={{
                left: mousePosition.x + 15,
                top: mousePosition.y - 100,
              }}
            >
              <div className="flex items-start space-x-3 mb-2">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: `${hoveredEvent.color}20`,
                    border: `2px solid ${hoveredEvent.color}`,
                  }}
                >
                  {(() => {
                    const EventIcon = hoveredEvent.icon;
                    return <EventIcon className="w-5 h-5" style={{ color: hoveredEvent.color }} />;
                  })()}
                </div>
                <div className="flex-1">
                  <div className="text-white/90 text-sm font-semibold mb-1">
                    {hoveredEvent.title}
                  </div>
                  <div className="text-white/60 text-xs">
                    {Math.round(hoveredEvent.timestamp / 1000)}s
                  </div>
                </div>
              </div>
              <div className="text-white/70 text-xs leading-relaxed">
                {hoveredEvent.description}
              </div>
              {hoveredEvent.focusImpact !== 0 && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <div className="flex items-center space-x-2">
                    <span className="text-white/50 text-xs">Focus Impact:</span>
                    <span 
                      className="text-xs font-medium"
                      style={{ 
                        color: hoveredEvent.focusImpact > 0 ? '#10b981' : '#ef4444' 
                      }}
                    >
                      {hoveredEvent.focusImpact > 0 ? '+' : ''}{hoveredEvent.focusImpact}%
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Event Timeline */}
      {sessionEvents.filter(e => currentTime >= e.timestamp).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h3 className="text-white/70 text-sm font-medium mb-4 flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Session Events</span>
          </h3>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/10"></div>
            
            {/* Events */}
            <div className="space-y-4">
              {sessionEvents
                .filter(event => currentTime >= event.timestamp)
                .map((event, index) => {
                  const EventIcon = event.icon;
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative flex items-start space-x-4 group cursor-pointer"
                      onMouseEnter={(e) => {
                        setHoveredEvent(event);
                        setMousePosition({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setHoveredEvent(null)}
                    >
                      {/* Timeline dot */}
                      <div className="relative z-10 flex-shrink-0">
                        <motion.div 
                          className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
                          style={{
                            backgroundColor: `${event.color}20`,
                            border: `2px solid ${event.color}`,
                          }}
                          whileHover={{ scale: 1.1 }}
                        >
                          <EventIcon className="w-6 h-6" style={{ color: event.color }} />
                        </motion.div>
                      </div>
                      
                      {/* Event content */}
                      <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4 group-hover:bg-white/10 transition-all duration-200">
                        <div className="mb-2">
                          <h4 className="text-white/90 text-sm font-semibold mb-1">
                            {event.title}
                          </h4>
                          <p className="text-white/60 text-xs">
                            {Math.floor(event.timestamp / 60000)}:{String(Math.floor((event.timestamp % 60000) / 1000)).padStart(2, '0')}
                          </p>
                        </div>
                        <p className="text-white/70 text-xs leading-relaxed">
                          {event.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Current Focus Level */}
      {currentMetrics && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <Target className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-white/90 text-lg font-medium">Current Focus</span>
            </div>
            <div className="text-5xl font-bold text-white">{Math.round(currentMetrics.focusLevel)}%</div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-4">
            <motion.div 
              className="bg-gradient-to-r from-green-400 to-green-500 h-4 rounded-full shadow-lg"
              initial={{ width: 0 }}
              animate={{ width: `${currentMetrics.focusLevel}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}