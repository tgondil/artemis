import { useState, useEffect } from 'react';

export default function ContentAnalysisTest() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchContentSummary = async () => {
    setLoading(true);
    try {
      // First check if Chrome is available
      const availableResult = await window.chromeMonitor.checkAvailable();
      if (!availableResult.success || !availableResult.available) {
        setSummary({
          error: 'Chrome not available. Please start Chrome with --remote-debugging-port=9222'
        });
        return;
      }

      const result = await window.chromeMonitor.getContentSummary();
      if (result.success) {
        setSummary(result.summary);
      } else {
        console.error('Failed to get content summary:', result.error);
        setSummary({
          error: result.error || 'Failed to get content summary'
        });
      }
    } catch (error) {
      console.error('Error fetching content summary:', error);
      setSummary({
        error: 'Content analysis not available'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContentSummary();
    const interval = setInterval(fetchContentSummary, 15000); // Update every 15 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && !summary) {
    return (
      <div className="fixed bottom-8 left-8 z-20 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white/70 text-xs">
        Loading content analysis...
      </div>
    );
  }

  return (
    <div className="fixed bottom-8 left-8 z-20 w-96 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-4 text-white/70 text-xs max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-white">Content Analysis</h3>
        <button 
          onClick={fetchContentSummary}
          className="px-2 py-1 bg-white/10 rounded text-xs hover:bg-white/20"
        >
          Refresh
        </button>
      </div>
      
      {summary && (
        <div className="space-y-3">
          {summary.error ? (
            <div className="text-red-400 text-xs">
              <div className="font-medium mb-1">Content Analysis</div>
              <div>{summary.error}</div>
            </div>
          ) : (
            <>
              <div>
                <h4 className="font-medium text-white mb-1">Current Page</h4>
                <div className="text-xs space-y-1">
                  <div className="truncate">Title: {summary.llmContext.currentPage.title}</div>
                  <div className="truncate">Description: {summary.llmContext.currentPage.description}</div>
                  <div>Reading Time: {summary.llmContext.currentPage.readingTime} min</div>
                  <div>Sentiment: {summary.llmContext.currentPage.sentiment}</div>
                  {summary.llmContext.currentPage.language && (
                    <div>Language: {summary.llmContext.currentPage.language}</div>
                  )}
                  {summary.llmContext.currentPage.framework && (
                    <div>Framework: {summary.llmContext.currentPage.framework}</div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-1">Session Context</h4>
                <div className="text-xs space-y-1">
                  <div>Focus: {summary.llmContext.sessionContext.contentFocus}</div>
                  <div>Level: {summary.llmContext.sessionContext.technicalLevel}</div>
                  <div>Work Related: {summary.llmContext.sessionContext.workRelated ? 'Yes' : 'No'}</div>
                  <div>Topics: {summary.llmContext.sessionContext.primaryTopics.slice(0, 3).join(', ')}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-1">Content Summary</h4>
                <div className="text-xs space-y-1">
                  <div>Tabs: {summary.contentSummary.totalTabs}</div>
                  <div>Reading Time: {summary.contentSummary.readingTime} min</div>
                  <div>Has Code: {summary.contentSummary.hasCode ? 'Yes' : 'No'}</div>
                  <div>Has Videos: {summary.contentSummary.hasVideos ? 'Yes' : 'No'}</div>
                  <div>Languages: {summary.contentSummary.languages.join(', ')}</div>
                  <div>Frameworks: {summary.contentSummary.frameworks.join(', ')}</div>
                </div>
              </div>
              
              {summary.activeTabContent && (
                <div>
                  <h4 className="font-medium text-white mb-1">Active Tab Content</h4>
                  <div className="text-xs space-y-1">
                    <div>Headings: {summary.activeTabContent.headings.length}</div>
                    <div>Code Blocks: {summary.activeTabContent.codeBlocks}</div>
                    <div>Links: {summary.activeTabContent.links.length}</div>
                    <div>Images: {summary.activeTabContent.images.length}</div>
                    {summary.activeTabContent.semanticInfo.topics.length > 0 && (
                      <div>Topics: {summary.activeTabContent.semanticInfo.topics.slice(0, 3).join(', ')}</div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
