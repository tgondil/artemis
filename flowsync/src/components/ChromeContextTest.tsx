import { useState, useEffect } from 'react';

export default function ChromeContextTest() {
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchChromeContext = async () => {
    setLoading(true);
    try {
      // First check if Chrome is available
      const availableResult = await window.chromeMonitor.checkAvailable();
      if (!availableResult.success || !availableResult.available) {
        setContext({
          error: 'Chrome not available. Please start Chrome with --remote-debugging-port=9222'
        });
        return;
      }

      const result = await window.chromeMonitor.getRichContext();
      if (result.success) {
        setContext(result.context);
      } else {
        console.error('Failed to get Chrome rich context:', result.error);
        setContext({
          error: result.error || 'Failed to get Chrome context'
        });
      }
    } catch (error) {
      console.error('Error fetching Chrome rich context:', error);
      setContext({
        error: 'Chrome monitoring not available'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChromeContext();
    const interval = setInterval(fetchChromeContext, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && !context) {
    return (
      <div className="fixed top-8 right-8 z-20 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white/70 text-xs">
        Loading Chrome context...
      </div>
    );
  }

  return (
    <div className="fixed top-8 right-8 z-20 w-80 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4 text-white/70 text-xs max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-white">Chrome Context</h3>
        <button 
          onClick={fetchChromeContext}
          className="px-2 py-1 bg-white/10 rounded text-xs hover:bg-white/20"
        >
          Refresh
        </button>
      </div>
      
      {context && (
        <div className="space-y-3">
          {context.error ? (
            <div className="text-red-400 text-xs">
              <div className="font-medium mb-1">Chrome Monitoring</div>
              <div>{context.error}</div>
              <div className="mt-2 text-white/60">
                To enable Chrome monitoring, start Chrome with:
                <br />
                <code className="bg-white/10 px-1 rounded">--remote-debugging-port=9222</code>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h4 className="font-medium text-white mb-1">Current Browsing</h4>
                <div className="text-xs space-y-1">
                  <div>Domain: {context.currentBrowsingContext.primaryDomain}</div>
                  <div>Mode: {context.currentBrowsingContext.browsingMode}</div>
                  <div>Focus: {Math.round(context.currentBrowsingContext.focusStability)}%</div>
                  <div>Active Tabs: {context.currentBrowsingContext.activeTabs.length}</div>
                </div>
              </div>
          
          <div>
            <h4 className="font-medium text-white mb-1">Session Patterns</h4>
            <div className="text-xs space-y-1">
              <div>Duration: {Math.round(context.sessionPatterns.sessionDuration / 1000)}s</div>
              <div>Tabs: {context.sessionPatterns.totalTabsOpened}</div>
              <div>Work Ratio: {Math.round(context.sessionPatterns.workRelatedRatio * 100)}%</div>
              <div>Distraction: {context.sessionPatterns.distractionLevel}%</div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-white mb-1">Behavioral Insights</h4>
            <div className="text-xs space-y-1">
              <div>Attention: {context.behavioralInsights.attentionSpan}s</div>
              <div>Multitasking: {context.behavioralInsights.multitaskingLevel}%</div>
              <div>Productivity: {context.behavioralInsights.productivityScore}%</div>
              {context.behavioralInsights.distractionTriggers.length > 0 && (
                <div>Triggers: {context.behavioralInsights.distractionTriggers.join(', ')}</div>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-white mb-1">Top Engaged Tabs</h4>
            <div className="text-xs space-y-1">
              {context.sessionPatterns.mostEngagedTabs.slice(0, 3).map((tab: any, i: number) => (
                <div key={i} className="truncate">
                  {tab.url.split('/')[2]}: {tab.engagementScore}%
                </div>
              ))}
            </div>
          </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
