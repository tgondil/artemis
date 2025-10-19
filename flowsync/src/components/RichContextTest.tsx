import { useState, useEffect } from 'react';

export default function RichContextTest() {
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchRichContext = async () => {
    setLoading(true);
    try {
      const result = await window.flowsyncWindowAPI.getRichContext();
      if (result.success) {
        setContext(result.context);
      } else {
        console.error('Failed to get rich context:', result.error);
      }
    } catch (error) {
      console.error('Error fetching rich context:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRichContext();
    const interval = setInterval(fetchRichContext, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && !context) {
    return (
      <div className="fixed bottom-8 right-8 z-20 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white/70 text-xs">
        Loading rich context...
      </div>
    );
  }

  return (
    <div className="fixed bottom-8 right-8 z-20 w-80 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4 text-white/70 text-xs max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-white">Rich Context Data</h3>
        <button 
          onClick={fetchRichContext}
          className="px-2 py-1 bg-white/10 rounded text-xs hover:bg-white/20"
        >
          Refresh
        </button>
      </div>
      
      {context && (
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-white mb-1">Current Task</h4>
            <div className="text-xs space-y-1">
              <div>App: {context.currentTask.app}</div>
              <div>Type: {context.currentTask.windowType}</div>
              <div>Focus: {Math.round(context.currentTask.focusDuration / 1000)}s</div>
              {context.currentTask.filePath && <div>File: {context.currentTask.filePath}</div>}
              {context.currentTask.project && <div>Project: {context.currentTask.project}</div>}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-white mb-1">Session Context</h4>
            <div className="text-xs space-y-1">
              <div>Session: {Math.round(context.sessionContext.totalSessionTime / 1000)}s</div>
              <div>Activity: {context.sessionContext.primaryActivity}</div>
              <div>Focus Stability: {Math.round(context.sessionContext.focusStability)}%</div>
              <div>Task Switches: {context.sessionContext.taskSwitches}</div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-white mb-1">Behavioral Patterns</h4>
            <div className="text-xs space-y-1">
              <div>Avg Focus: {Math.round(context.behavioralPatterns.averageFocusDuration / 1000)}s</div>
              <div>Top Apps:</div>
              <div className="ml-2 space-y-1">
                {context.behavioralPatterns.mostUsedApps.slice(0, 3).map((app: any, i: number) => (
                  <div key={i}>
                    {app.app}: {Math.round(app.time / 1000)}s
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
