import { useState, useEffect } from 'react';

export default function LLMAnalysisTest() {
  const [flowState, setFlowState] = useState<any>(null);
  const [optimization, setOptimization] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runLLMAnalysis = async () => {
    setLoading(true);
    try {
      console.log('[LLM Test] Running comprehensive LLM analysis...');
      
      // Run all three analyses in parallel
      const [flowResult, optimizationResult, insightsResult] = await Promise.all([
        window.llmReasoning.analyzeFlowState(),
        window.llmReasoning.generateWorkspaceOptimization(),
        window.llmReasoning.generateSessionInsights()
      ]);

      if (flowResult.success) {
        setFlowState(flowResult.flowState);
        console.log('[LLM Test] Flow state:', flowResult.flowState);
      }

      if (optimizationResult.success) {
        setOptimization(optimizationResult.optimization);
        console.log('[LLM Test] Optimization:', optimizationResult.optimization);
      }

      if (insightsResult.success) {
        setInsights(insightsResult.insights);
        console.log('[LLM Test] Insights:', insightsResult.insights);
      }

    } catch (error) {
      console.error('[LLM Test] Error running analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runLLMAnalysis();
    const interval = setInterval(runLLMAnalysis, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  if (loading && !flowState) {
    return (
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 px-6 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white/70 text-sm">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Running LLM Analysis...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 w-96 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4 text-white/70 text-xs max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-white text-sm">🧠 LLM Analysis</h3>
        <button 
          onClick={runLLMAnalysis}
          className="px-3 py-1 bg-white/10 rounded text-xs hover:bg-white/20"
        >
          Analyze
        </button>
      </div>
      
      <div className="space-y-4">
        {flowState && (
          <div>
            <h4 className="font-medium text-white mb-2">Flow State</h4>
            <div className="text-xs space-y-1">
              <div>Phase: <span className="text-blue-400">{flowState.phase}</span></div>
              <div>Confidence: <span className="text-green-400">{flowState.confidence}%</span></div>
              <div>Focus Stability: {flowState.indicators.focusStability}%</div>
              <div>Task Coherence: {flowState.indicators.taskCoherence}%</div>
              <div>Distraction Level: {flowState.indicators.distractionLevel}%</div>
              <div>Cognitive Load: {flowState.indicators.cognitiveLoad}%</div>
            </div>
          </div>
        )}
        
        {optimization && (
          <div>
            <h4 className="font-medium text-white mb-2">Workspace Optimization</h4>
            <div className="text-xs space-y-1">
              <div>Action: <span className="text-yellow-400">{optimization.action}</span></div>
              <div>Priority: <span className="text-orange-400">{optimization.priority}</span></div>
              <div className="text-white/60">{optimization.reasoning}</div>
              {optimization.tabsToHide.length > 0 && (
                <div>Tabs to Hide: {optimization.tabsToHide.length}</div>
              )}
              {optimization.tabsToShow.length > 0 && (
                <div>Tabs to Show: {optimization.tabsToShow.length}</div>
              )}
              {optimization.environmentalChanges.lighting && (
                <div>Lighting: {optimization.environmentalChanges.lighting}</div>
              )}
              {optimization.environmentalChanges.audio && (
                <div>Audio: {optimization.environmentalChanges.audio}</div>
              )}
            </div>
          </div>
        )}
        
        {insights && (
          <div>
            <h4 className="font-medium text-white mb-2">Session Insights</h4>
            <div className="text-xs space-y-1">
              <div>Task: <span className="text-purple-400">{insights.currentTask}</span></div>
              <div>Work Mode: <span className="text-cyan-400">{insights.workMode}</span></div>
              <div>Productivity: <span className="text-green-400">{insights.productivityScore}%</span></div>
              {insights.distractionTriggers.length > 0 && (
                <div>Triggers: {insights.distractionTriggers.join(', ')}</div>
              )}
              {insights.recommendedActions.length > 0 && (
                <div>Actions: {insights.recommendedActions.slice(0, 2).join(', ')}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
