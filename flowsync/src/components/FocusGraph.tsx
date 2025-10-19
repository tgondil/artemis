import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Activity, Target, Zap, AlertTriangle, Trophy } from 'lucide-react';

interface GraphDataPoint {
  timestamp: number;
  focusLevel: number;
  distractionLevel: number;
  flowState: number;
  productivity: number;
}

interface FocusGraphProps {
  isActive: boolean;
  sessionStartTime: number;
  onDataUpdate?: (data: GraphDataPoint) => void;
}

export default function FocusGraph({ isActive, sessionStartTime, onDataUpdate }: FocusGraphProps) {
  const [dataPoints, setDataPoints] = useState<GraphDataPoint[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<number>();

  // Generate realistic focus data based on session progression
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const sessionDuration = Date.now() - sessionStartTime;
      const sessionMinutes = sessionDuration / 60000;
      
      // Simulate focus patterns based on session progression
      let focusLevel = 50;
      let distractionLevel = 30;
      let flowState = 40;
      let productivity = 60;

      // Early session: building focus
      if (sessionMinutes < 5) {
        focusLevel = 30 + (sessionMinutes * 8);
        distractionLevel = 50 - (sessionMinutes * 4);
        flowState = 20 + (sessionMinutes * 6);
        productivity = 40 + (sessionMinutes * 6);
      }
      // Mid session: peak performance
      else if (sessionMinutes < 25) {
        focusLevel = 70 + Math.sin((sessionMinutes - 5) * 0.3) * 20;
        distractionLevel = 20 + Math.sin((sessionMinutes - 5) * 0.2) * 10;
        flowState = 60 + Math.sin((sessionMinutes - 5) * 0.25) * 25;
        productivity = 80 + Math.sin((sessionMinutes - 5) * 0.2) * 15;
      }
      // Late session: potential fatigue
      else {
        focusLevel = Math.max(40, 70 - (sessionMinutes - 25) * 1.5);
        distractionLevel = Math.min(60, 20 + (sessionMinutes - 25) * 1.2);
        flowState = Math.max(30, 60 - (sessionMinutes - 25) * 1.2);
        productivity = Math.max(50, 80 - (sessionMinutes - 25) * 1.0);
      }

      // Add some realistic noise
      focusLevel += (Math.random() - 0.5) * 10;
      distractionLevel += (Math.random() - 0.5) * 8;
      flowState += (Math.random() - 0.5) * 12;
      productivity += (Math.random() - 0.5) * 8;

      // Clamp values
      focusLevel = Math.max(0, Math.min(100, focusLevel));
      distractionLevel = Math.max(0, Math.min(100, distractionLevel));
      flowState = Math.max(0, Math.min(100, flowState));
      productivity = Math.max(0, Math.min(100, productivity));

      const newDataPoint: GraphDataPoint = {
        timestamp: sessionDuration,
        focusLevel,
        distractionLevel,
        flowState,
        productivity
      };

      setDataPoints(prev => {
        const updated = [...prev, newDataPoint];
        // Keep only last 100 data points for performance
        return updated.slice(-100);
      });

      setCurrentTime(sessionDuration);
      onDataUpdate?.(newDataPoint);
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [isActive, sessionStartTime, onDataUpdate]);

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

  const getGraphPath = (data: GraphDataPoint[], key: keyof GraphDataPoint, color: string) => {
    if (data.length < 2) return null;

    const maxTime = Math.max(...data.map(d => d.timestamp));
    const maxValue = 100;

    const points = data.map((point, index) => {
      const x = (point.timestamp / maxTime) * 100;
      const y = 100 - ((point[key] as number) / maxValue) * 100;
      return `${x}%,${y}%`;
    }).join(' ');

    return (
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        className="drop-shadow-sm"
      />
    );
  };

  const getAreaPath = (data: GraphDataPoint[], key: keyof GraphDataPoint, color: string) => {
    if (data.length < 2) return null;

    const maxTime = Math.max(...data.map(d => d.timestamp));
    const maxValue = 100;

    const points = data.map((point, index) => {
      const x = (point.timestamp / maxTime) * 100;
      const y = 100 - ((point[key] as number) / maxValue) * 100;
      return `${x},${y}`;
    });

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const areaPath = `M ${firstPoint} L ${points.join(' ')} L ${lastPoint.split(',')[0]},100 L 0,100 Z`;

    return (
      <path
        d={areaPath}
        fill={`url(#gradient-${key})`}
        opacity={0.3}
      />
    );
  };

  const getCurrentMetrics = () => {
    if (dataPoints.length === 0) return null;
    const latest = dataPoints[dataPoints.length - 1];
    return latest;
  };

  const currentMetrics = getCurrentMetrics();

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
          <Activity className="w-6 h-6" />
          <span>Real-time Focus Analytics</span>
        </h2>
        {isActive && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm font-medium">Live</span>
          </div>
        )}
      </div>

      {/* Main Graph */}
      <div className="h-80 bg-black/20 rounded-lg p-4 relative overflow-hidden mb-6">
        <svg ref={svgRef} width="100%" height="100%" className="w-full h-full">
          <defs>
            {/* Grid pattern */}
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            </pattern>
            
            {/* Gradients */}
            <linearGradient id="gradient-focusLevel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.1"/>
            </linearGradient>
            <linearGradient id="gradient-flowState" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1"/>
            </linearGradient>
            <linearGradient id="gradient-productivity" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          
          {/* Grid background */}
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Y-axis labels */}
          <text x="2%" y="10%" fill="rgba(255,255,255,0.6)" fontSize="12" textAnchor="start">100</text>
          <text x="2%" y="30%" fill="rgba(255,255,255,0.6)" fontSize="12" textAnchor="start">75</text>
          <text x="2%" y="50%" fill="rgba(255,255,255,0.6)" fontSize="12" textAnchor="start">50</text>
          <text x="2%" y="70%" fill="rgba(255,255,255,0.6)" fontSize="12" textAnchor="start">25</text>
          <text x="2%" y="90%" fill="rgba(255,255,255,0.6)" fontSize="12" textAnchor="start">0</text>
          
          {/* Area fills */}
          {getAreaPath(dataPoints, 'focusLevel', '#10b981')}
          {getAreaPath(dataPoints, 'flowState', '#06b6d4')}
          {getAreaPath(dataPoints, 'productivity', '#8b5cf6')}
          
          {/* Line graphs */}
          {getGraphPath(dataPoints, 'focusLevel', '#10b981')}
          {getGraphPath(dataPoints, 'flowState', '#06b6d4')}
          {getGraphPath(dataPoints, 'productivity', '#8b5cf6')}
          {getGraphPath(dataPoints, 'distractionLevel', '#ef4444')}
          
          {/* Current time indicator */}
          {isActive && (
            <line
              x1={`${(currentTime / Math.max(currentTime, 1)) * 100}%`}
              y1="0%"
              x2={`${(currentTime / Math.max(currentTime, 1)) * 100}%`}
              y2="100%"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
              strokeDasharray="5,5"
            />
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-white/70 text-sm">Focus Level</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-cyan-500 rounded"></div>
          <span className="text-white/70 text-sm">Flow State</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-purple-500 rounded"></div>
          <span className="text-white/70 text-sm">Productivity</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-white/70 text-sm">Distraction</span>
        </div>
      </div>

      {/* Current Metrics */}
      {currentMetrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-5 h-5 text-green-400" />
              <span className="text-white/70 text-sm">Focus</span>
            </div>
            <div className="text-2xl font-bold text-white">{Math.round(currentMetrics.focusLevel)}%</div>
            <div className="w-full bg-white/10 rounded-full h-2 mt-2">
              <motion.div 
                className="bg-green-400 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${currentMetrics.focusLevel}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              <span className="text-white/70 text-sm">Flow</span>
            </div>
            <div className="text-2xl font-bold text-white">{Math.round(currentMetrics.flowState)}%</div>
            <div className="w-full bg-white/10 rounded-full h-2 mt-2">
              <motion.div 
                className="bg-cyan-400 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${currentMetrics.flowState}%` }}
                transition={{ duration: 0.5, delay: 0.1 }}
              />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="w-5 h-5 text-purple-400" />
              <span className="text-white/70 text-sm">Productivity</span>
            </div>
            <div className="text-2xl font-bold text-white">{Math.round(currentMetrics.productivity)}%</div>
            <div className="w-full bg-white/10 rounded-full h-2 mt-2">
              <motion.div 
                className="bg-purple-400 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${currentMetrics.productivity}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4"
          >
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-white/70 text-sm">Distraction</span>
            </div>
            <div className="text-2xl font-bold text-white">{Math.round(currentMetrics.distractionLevel)}%</div>
            <div className="w-full bg-white/10 rounded-full h-2 mt-2">
              <motion.div 
                className="bg-red-400 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${currentMetrics.distractionLevel}%` }}
                transition={{ duration: 0.5, delay: 0.3 }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
