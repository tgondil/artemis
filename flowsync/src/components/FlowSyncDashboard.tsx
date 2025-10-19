import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface DashboardData {
  windowContext: any;
  chromeContext: any;
  chromeContent: any;
  flowState: any;
  optimization: any;
  insights: any;
}

export default function FlowSyncDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  console.log('[Dashboard] FlowSyncDashboard component mounted');

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[Dashboard] Fetching all context data...');
      console.log('[Dashboard] Available APIs:', {
        flowsyncWindowAPI: !!window.flowsyncWindowAPI,
        chromeMonitor: !!window.chromeMonitor,
        llmReasoning: !!window.llmReasoning
      });
      
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
      
      // Fetch all data in parallel (using single comprehensive LLM call)
      console.log('[Dashboard] Calling window API...');
      const windowResult = await window.flowsyncWindowAPI.getRichContext();
      console.log('[Dashboard] Window result:', windowResult);
      
      console.log('[Dashboard] Calling chrome context API...');
      const chromeContextResult = await window.chromeMonitor.getRichContext();
      console.log('[Dashboard] Chrome context result:', chromeContextResult);
      
      console.log('[Dashboard] Calling chrome content API...');
      const chromeContentResult = await window.chromeMonitor.getContentSummary();
      console.log('[Dashboard] Chrome content result:', chromeContentResult);
      
      console.log('[Dashboard] Calling LLM API...');
      const llmAnalysisResult = await window.llmReasoning.getComprehensiveAnalysis();
      console.log('[Dashboard] LLM result:', llmAnalysisResult);

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

      console.log('[Dashboard] All data fetched successfully');
      console.log('[Dashboard] Window Context:', windowResult.context);
      console.log('[Dashboard] Chrome Context:', chromeContextResult.context);
      console.log('[Dashboard] Flow State:', llmAnalysisResult.flowState);
      
      setLastRefresh(new Date());
    } catch (error: any) {
      console.error('[Dashboard] Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait 15 seconds before initial data fetch to avoid startup LLM calls
    const initialTimeout = setTimeout(() => {
      console.log('[Dashboard] Initial 15-second delay completed, fetching data...');
      fetchAllData();
    }, 15000);

    // Set up regular updates every 5 minutes (only after initial delay)
    const interval = setInterval(fetchAllData, 300000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  // Add a retry mechanism for API availability
  useEffect(() => {
    const checkAPIs = () => {
      if (window.flowsyncWindowAPI && window.chromeMonitor && window.llmReasoning) {
        console.log('[Dashboard] All APIs are now available');
        return;
      }
      console.log('[Dashboard] APIs not ready yet, retrying in 1 second...');
      setTimeout(checkAPIs, 1000);
    };
    
    checkAPIs();
  }, []);

  if (loading && !data) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-8 text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <div>Loading FlowSync Dashboard...</div>
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
          <div className="text-lg font-semibold mb-4">🧠 FlowSync Dashboard</div>
          <div className="text-sm text-white/70 mb-4">Waiting for data...</div>
          <div className="text-xs text-white/50">This may take up to 15 seconds</div>
        </div>
      </div>
    );
  }

  // Debug: Show raw data structure
  console.log('[Dashboard] Full data object:', data);

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
                  <h1 className="text-2xl font-bold text-white mb-2">🧠 FlowSync Dashboard</h1>
                  <p className="text-white/70">Real-time cognitive state and workspace optimization</p>
                  {lastRefresh && (
                    <p className="text-white/50 text-sm mt-1">
                      Last updated: {lastRefresh.toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-3">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Flow State */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4">🌊 Flow State</h2>
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
              <h2 className="text-lg font-semibold text-white mb-4">🎯 Current Task</h2>
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
              <h2 className="text-lg font-semibold text-white mb-4">🌐 Browser Context</h2>
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
                  <span className="text-white/70 text-sm">Work Related:</span>
                  <span className="text-white text-sm">{data.chromeContext?.sessionPatterns?.workRelatedRatio ? Math.round(data.chromeContext.sessionPatterns.workRelatedRatio * 100) : 'Unknown'}%</span>
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
              <h2 className="text-lg font-semibold text-white mb-4">📄 Content Analysis</h2>
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
              <h2 className="text-lg font-semibold text-white mb-4">⚡ Optimization</h2>
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
                    <div className="text-white/60 text-xs mt-1">
                      IDs: {data.optimization.tabsToHide.slice(0, 3).join(', ')}
                      {data.optimization.tabsToHide.length > 3 && ` +${data.optimization.tabsToHide.length - 3} more`}
                    </div>
                  </div>
                )}
                {data.optimization?.tabsToShow?.length > 0 && (
                  <div>
                    <div className="text-white/70 text-sm mb-1">Tabs to Show:</div>
                    <div className="text-white text-sm">{data.optimization.tabsToShow.length} tabs</div>
                    <div className="text-white/60 text-xs mt-1">
                      IDs: {data.optimization.tabsToShow.slice(0, 3).join(', ')}
                      {data.optimization.tabsToShow.length > 3 && ` +${data.optimization.tabsToShow.length - 3} more`}
                    </div>
                  </div>
                )}
                {data.optimization?.environmentalChanges?.lighting && (
                  <div className="flex justify-between">
                    <span className="text-white/70 text-sm">Lighting:</span>
                    <span className="text-white text-sm capitalize">{data.optimization.environmentalChanges.lighting}</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Tab Analysis */}
            {data.optimization?.tabAnalysis && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6"
              >
                <h2 className="text-lg font-semibold text-white mb-4">🔍 Tab Analysis</h2>
                <div className="space-y-4">
                  {/* Current Task */}
                  <div>
                    <div className="text-white/70 text-sm mb-2">Current Task:</div>
                    <div className="text-white text-sm font-medium">{data.optimization.tabAnalysis.currentTask || 'Unknown'}</div>
                  </div>

                  {/* Task Context */}
                  <div>
                    <div className="text-white/70 text-sm mb-2">Task Context:</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/70">Primary Domain:</span>
                        <span className="text-white">{data.optimization.tabAnalysis.taskContext?.primaryDomain || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Work Mode:</span>
                        <span className="text-white capitalize">{data.optimization.tabAnalysis.taskContext?.workMode || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Cognitive Load:</span>
                        <span className="text-white">{data.optimization.tabAnalysis.taskContext?.cognitiveLoad || 0}%</span>
                      </div>
                      {data.optimization.tabAnalysis.taskContext?.relatedTopics?.length > 0 && (
                        <div>
                          <div className="text-white/70 text-xs mb-1">Related Topics:</div>
                          <div className="text-white text-xs">{data.optimization.tabAnalysis.taskContext.relatedTopics.join(', ')}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Task Relevant Tabs */}
                  {data.optimization.tabAnalysis.taskRelevantTabs?.length > 0 && (
                    <div>
                      <div className="text-white/70 text-sm mb-2">✅ Task Relevant Tabs ({data.optimization.tabAnalysis.taskRelevantTabs.length}):</div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {data.optimization.tabAnalysis.taskRelevantTabs.map((tab: any, index: number) => (
                          <div key={index} className="bg-green-500/10 border border-green-500/20 rounded p-2 text-xs">
                            <div className="text-white font-medium truncate">{tab.title}</div>
                            <div className="text-green-400 text-xs truncate">{tab.url}</div>
                            <div className="text-green-300 text-xs">Relevance: {Math.round(tab.relevanceScore * 100)}%</div>
                            <div className="text-green-300 text-xs">Reason: {tab.reason}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Irrelevant Tabs */}
                  {data.optimization.tabAnalysis.irrelevantTabs?.length > 0 && (
                    <div>
                      <div className="text-white/70 text-sm mb-2">❌ Irrelevant Tabs ({data.optimization.tabAnalysis.irrelevantTabs.length}):</div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {data.optimization.tabAnalysis.irrelevantTabs.map((tab: any, index: number) => (
                          <div key={index} className="bg-red-500/10 border border-red-500/20 rounded p-2 text-xs">
                            <div className="text-white font-medium truncate">{tab.title}</div>
                            <div className="text-red-400 text-xs truncate">{tab.url}</div>
                            <div className="text-red-300 text-xs">Distraction Level: {Math.round(tab.distractionLevel * 100)}%</div>
                            <div className="text-red-300 text-xs">Reason: {tab.reason}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Session Insights */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4">📊 Session Insights</h2>
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

            {/* Behavioral Patterns */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-4">📊 Behavioral Patterns</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Average Focus Duration:</span>
                  <span className="text-white text-sm">{Math.round((data.windowContext?.behavioralPatterns?.averageFocusDuration || 0) / 1000)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Task Switches:</span>
                  <span className="text-white text-sm">{data.windowContext?.sessionContext?.taskSwitches || 0}</span>
                </div>
                {data.windowContext?.behavioralPatterns?.mostUsedApps?.length > 0 && (
                  <div>
                    <div className="text-white/70 text-sm mb-1">Most Used Apps:</div>
                    <div className="space-y-1">
                      {data.windowContext.behavioralPatterns.mostUsedApps.slice(0, 3).map((app: any, index: number) => (
                        <div key={index} className="flex justify-between text-xs">
                          <span className="text-white/70">{app.app}</span>
                          <span className="text-white">{Math.round(app.time / 1000)}s</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Debug Data */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6 lg:col-span-2 xl:col-span-3"
            >
              <h2 className="text-lg font-semibold text-white mb-4">🔍 Debug Data</h2>
              <div className="space-y-3 text-xs max-h-96 overflow-y-auto">
                <div>
                  <div className="text-white/70 mb-1">Window Context:</div>
                  <pre className="text-white/60 bg-black/20 p-2 rounded overflow-x-auto text-xs">
                    {JSON.stringify(data.windowContext, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="text-white/70 mb-1">Chrome Context:</div>
                  <pre className="text-white/60 bg-black/20 p-2 rounded overflow-x-auto text-xs">
                    {JSON.stringify(data.chromeContext, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="text-white/70 mb-1">Chrome Content:</div>
                  <pre className="text-white/60 bg-black/20 p-2 rounded overflow-x-auto text-xs">
                    {JSON.stringify(data.chromeContent, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="text-white/70 mb-1">Flow State:</div>
                  <pre className="text-white/60 bg-black/20 p-2 rounded overflow-x-auto text-xs">
                    {JSON.stringify(data.flowState, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="text-white/70 mb-1">Optimization:</div>
                  <pre className="text-white/60 bg-black/20 p-2 rounded overflow-x-auto text-xs">
                    {JSON.stringify(data.optimization, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="text-white/70 mb-1">Insights:</div>
                  <pre className="text-white/60 bg-black/20 p-2 rounded overflow-x-auto text-xs">
                    {JSON.stringify(data.insights, null, 2)}
                  </pre>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
