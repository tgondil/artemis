import { useState, useEffect, useCallback, useRef } from 'react';

export interface WindowInfo {
  title: string;
  owner: {
    name: string;
    processId: number;
    path: string;
  };
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  url?: string;
  memoryUsage?: number;
}

export interface WindowHistoryEntry {
  window: WindowInfo;
  timestamp: number;
  duration: number;
}

export interface WindowSnapshot {
  timestamp: number;
  activeWindow: WindowInfo | null;
  recentHistory: WindowHistoryEntry[];
  appTimeSpent: Record<string, number>;
}

export interface WindowTrackerState {
  isTracking: boolean;
  activeWindow: WindowInfo | null;
  appTimeSpent: Record<string, number>;
  recentHistory: WindowHistoryEntry[];
  currentTitle: string | null;
  error: string | null;
}

export function useWindowTracker(pollInterval: number = 5000) {
  const [state, setState] = useState<WindowTrackerState>({
    isTracking: false,
    activeWindow: null,
    appTimeSpent: {},
    recentHistory: [],
    currentTitle: null,
    error: null,
  });

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start window tracking
  const startTracking = useCallback(async () => {
    try {
      if (!window.flowsyncWindowAPI) {
        throw new Error('Window tracking API not available');
      }
      
      const result = await window.flowsyncWindowAPI.startTracking();
      if (result.success) {
        setState(prev => ({ ...prev, isTracking: true, error: null }));
        console.log('Window tracking started');
      } else {
        setState(prev => ({ ...prev, error: result.error || 'Failed to start tracking' }));
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, []);

  // Stop window tracking
  const stopTracking = useCallback(async () => {
    try {
      const result = await window.flowsyncWindowAPI.stopTracking();
      if (result.success) {
        setState(prev => ({ ...prev, isTracking: false, error: null }));
        console.log('Window tracking stopped');
      } else {
        setState(prev => ({ ...prev, error: result.error || 'Failed to stop tracking' }));
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, []);

  // Get current snapshot
  const getSnapshot = useCallback(async (): Promise<WindowSnapshot | null> => {
    try {
      const result = await window.flowsyncWindowAPI.getSnapshot();
      if (result.success) {
        return result.snapshot || null;
      } else {
        setState(prev => ({ ...prev, error: result.error }));
        return null;
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return null;
    }
  }, []);

  // Get app time spent
  const getAppTimeSpent = useCallback(async () => {
    try {
      const result = await window.flowsyncWindowAPI.getAppTime();
      if (result.success) {
        setState(prev => ({ ...prev, appTimeSpent: result.appTime || {}, error: null }));
        return result.appTime || {};
      } else {
        setState(prev => ({ ...prev, error: result.error }));
        return {};
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return {};
    }
  }, []);

  // Get window history
  const getHistory = useCallback(async () => {
    try {
      const result = await window.flowsyncWindowAPI.getHistory();
      if (result.success) {
        setState(prev => ({ ...prev, recentHistory: result.history || [], error: null }));
        return result.history || [];
      } else {
        setState(prev => ({ ...prev, error: result.error }));
        return [];
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return [];
    }
  }, []);

  // Check if specific app is active
  const isAppActive = useCallback(async (appName: string): Promise<boolean> => {
    try {
      const result = await window.flowsyncWindowAPI.isAppActive(appName);
      if (result.success) {
        return result.isActive || false;
      } else {
        setState(prev => ({ ...prev, error: result.error }));
        return false;
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return false;
    }
  }, []);

  // Get current window title
  const getCurrentTitle = useCallback(async () => {
    try {
      const result = await window.flowsyncWindowAPI.getCurrentTitle();
      if (result.success) {
        setState(prev => ({ ...prev, currentTitle: result.title || null, error: null }));
        return result.title || null;
      } else {
        setState(prev => ({ ...prev, error: result.error }));
        return null;
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      return null;
    }
  }, []);

  // Update data from snapshot
  const updateFromSnapshot = useCallback(async () => {
    const snapshot = await getSnapshot();
    if (snapshot) {
      setState(prev => ({
        ...prev,
        activeWindow: snapshot.activeWindow,
        appTimeSpent: snapshot.appTimeSpent,
        recentHistory: snapshot.recentHistory,
        error: null,
      }));
    }
  }, [getSnapshot]);

  // Format time duration
  const formatDuration = useCallback((milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  // Get top apps by time spent
  const getTopApps = useCallback((limit: number = 5) => {
    return Object.entries(state.appTimeSpent)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([app, time]) => ({ app, time, formatted: formatDuration(time) }));
  }, [state.appTimeSpent, formatDuration]);


  // Polling effect
  useEffect(() => {
    if (state.isTracking) {
      // Initial update
      updateFromSnapshot();

      // Set up polling
      pollIntervalRef.current = setInterval(() => {
        updateFromSnapshot();
      }, pollInterval);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }
  }, [state.isTracking, updateFromSnapshot, pollInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startTracking,
    stopTracking,
    getSnapshot,
    getAppTimeSpent,
    getHistory,
    isAppActive,
    getCurrentTitle,
    updateFromSnapshot,
    formatDuration,
    getTopApps,
  };
}
