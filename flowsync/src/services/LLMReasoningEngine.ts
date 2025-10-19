import { getWindowMonitor } from './WindowMonitor';
import { getChromeMonitor } from './ChromeMonitor';

export interface FlowState {
  phase: 'calibration' | 'engagement' | 'flow' | 'recovery';
  confidence: number; // 0-100
  indicators: {
    focusStability: number;
    taskCoherence: number;
    distractionLevel: number;
    cognitiveLoad: number;
  };
}

export interface WorkspaceOptimization {
  action: 'hide_tabs' | 'show_tabs' | 'adjust_lighting' | 'play_audio' | 'maintain' | 'recovery';
  reasoning: string;
  tabsToHide: string[];
  tabsToShow: string[];
  tabAnalysis: {
    currentTask: string;
    taskRelevantTabs: Array<{
      tabId: string;
      title: string;
      url: string;
      relevanceScore: number; // 0-1, how relevant to current task
      reason: string;
    }>;
    irrelevantTabs: Array<{
      tabId: string;
      title: string;
      url: string;
      distractionLevel: number; // 0-1, how distracting
      reason: string;
    }>;
    taskContext: {
      primaryDomain: string;
      relatedTopics: string[];
      workMode: string;
      cognitiveLoad: number;
    };
  };
  environmentalChanges: {
    lighting?: 'warm' | 'cool' | 'dim' | 'bright';
    audio?: 'ambient' | 'silence' | 'focus_music';
  };
  priority: 'high' | 'medium' | 'low';
}

export interface SessionInsights {
  currentTask: string;
  workMode: 'development' | 'research' | 'learning' | 'communication' | 'mixed';
  productivityScore: number;
  distractionTriggers: string[];
  recommendedActions: string[];
}

interface MemoryEntry {
  timestamp: number;
  context: any;
  analysis: any;
  significance: number; // 0-1, how important this moment was
  tags: string[]; // semantic tags for retrieval
}

interface TemporalContext {
  sessionStart: number;
  lastActivity: number;
  focusSessions: Array<{start: number, end: number, intensity: number}>;
  taskTransitions: Array<{from: string, to: string, timestamp: number}>;
  flowStates: Array<{state: string, timestamp: number, duration: number}>;
}

interface SemanticGrounding {
  currentTask: string;
  taskHistory: Array<{task: string, startTime: number, endTime?: number}>;
  projectContext: string;
  workMode: string;
  cognitivePatterns: {
    focusCycles: number[];
    distractionTriggers: string[];
    productivityPeaks: number[];
  };
}

export class LLMReasoningEngine {
  private apiKey: string;
  private baseUrl: string = 'https://api.anthropic.com/v1/messages';
  private lastCallTime: number = 0;
  private readonly minIntervalMs: number = 30000; // 30 seconds minimum between calls
  
  // Memory and temporal awareness
  private memory: MemoryEntry[] = [];
  private temporalContext: TemporalContext;
  private semanticGrounding: SemanticGrounding;
  private sessionId: string;
  
  // Caching with temporal awareness
  private cachedAnalysis: any = null;
  private cacheTimestamp: number = 0;
  private readonly cacheValidityMs: number = 60000; // 1 minute cache validity

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.sessionId = `session_${Date.now()}`;
    this.temporalContext = {
      sessionStart: Date.now(),
      lastActivity: Date.now(),
      focusSessions: [],
      taskTransitions: [],
      flowStates: []
    };
    this.semanticGrounding = {
      currentTask: 'Unknown',
      taskHistory: [],
      projectContext: 'Unknown',
      workMode: 'mixed',
      cognitivePatterns: {
        focusCycles: [],
        distractionTriggers: [],
        productivityPeaks: []
      }
    };
  }

  /**
   * Add a memory entry with semantic significance
   */
  private addMemory(context: any, analysis: any, significance: number = 0.5, tags: string[] = []): void {
    const memoryEntry: MemoryEntry = {
      timestamp: Date.now(),
      context,
      analysis,
      significance,
      tags
    };
    
    this.memory.push(memoryEntry);
    
    // Keep only last 100 entries to prevent memory bloat
    if (this.memory.length > 100) {
      this.memory = this.memory.slice(-100);
    }
    
    // Update temporal context
    this.updateTemporalContext(analysis);
    
    // Update semantic grounding
    this.updateSemanticGrounding(context, analysis);
  }

  /**
   * Retrieve relevant memories based on current context
   */
  private getRelevantMemories(currentContext: any, limit: number = 10): MemoryEntry[] {
    const now = Date.now();
    const recentThreshold = 30 * 60 * 1000; // 30 minutes
    
    return this.memory
      .filter(entry => {
        // Prioritize recent and significant memories
        const isRecent = (now - entry.timestamp) < recentThreshold;
        const isSignificant = entry.significance > 0.7;
        return isRecent || isSignificant;
      })
      .sort((a, b) => {
        // Sort by significance and recency
        const isRecentA = (now - a.timestamp) < recentThreshold;
        const isRecentB = (now - b.timestamp) < recentThreshold;
        const scoreA = a.significance + (isRecentA ? 0.3 : 0);
        const scoreB = b.significance + (isRecentB ? 0.3 : 0);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Update temporal context with new analysis
   */
  private updateTemporalContext(analysis: any): void {
    const now = Date.now();
    this.temporalContext.lastActivity = now;
    
    // Track flow state transitions
    if (analysis.flowState) {
      const currentState = analysis.flowState.phase;
      const lastState = this.temporalContext.flowStates[this.temporalContext.flowStates.length - 1];
      
      if (!lastState || lastState.state !== currentState) {
        this.temporalContext.flowStates.push({
          state: currentState,
          timestamp: now,
          duration: lastState ? now - lastState.timestamp : 0
        });
      }
    }
    
    // Track focus sessions
    if (analysis.flowState?.phase === 'flow' && analysis.flowState.confidence > 70) {
      const lastSession = this.temporalContext.focusSessions[this.temporalContext.focusSessions.length - 1];
      if (!lastSession || lastSession.end) {
        this.temporalContext.focusSessions.push({
          start: now,
          end: 0,
          intensity: analysis.flowState.confidence
        });
      } else {
        lastSession.intensity = Math.max(lastSession.intensity, analysis.flowState.confidence);
      }
    }
  }

  /**
   * Update semantic grounding with new context
   */
  private updateSemanticGrounding(context: any, analysis: any): void {
    // Update current task
    if (analysis.insights?.currentTask && analysis.insights.currentTask !== this.semanticGrounding.currentTask) {
      // End previous task
      if (this.semanticGrounding.taskHistory.length > 0) {
        const lastTask = this.semanticGrounding.taskHistory[this.semanticGrounding.taskHistory.length - 1];
        if (!lastTask.endTime) {
          lastTask.endTime = Date.now();
        }
      }
      
      // Start new task
      this.semanticGrounding.taskHistory.push({
        task: analysis.insights.currentTask,
        startTime: Date.now()
      });
      
      this.semanticGrounding.currentTask = analysis.insights.currentTask;
    }
    
    // Update work mode
    if (analysis.insights?.workMode) {
      this.semanticGrounding.workMode = analysis.insights.workMode;
    }
    
    // Update cognitive patterns
    if (analysis.flowState) {
      this.semanticGrounding.cognitivePatterns.focusCycles.push(analysis.flowState.confidence);
      if (analysis.flowState.indicators?.distractionLevel > 70) {
        this.semanticGrounding.cognitivePatterns.distractionTriggers.push('high_distraction');
      }
    }
  }

  /**
   * Analyze all context signals and determine flow state
   */
  async analyzeFlowState(): Promise<FlowState> {
    const analysis = await this.getComprehensiveAnalysis();
    return analysis.flowState;
  }

  /**
   * Get comprehensive analysis in a single LLM call with memory and temporal awareness
   */
  async getComprehensiveAnalysis(): Promise<{
    flowState: FlowState;
    optimization: WorkspaceOptimization;
    insights: SessionInsights;
  }> {
    // Check if we have a valid cached analysis
    const now = Date.now();
    if (this.cachedAnalysis && (now - this.cacheTimestamp) < this.cacheValidityMs) {
      console.log('[LLM] Using cached analysis');
      return this.cachedAnalysis;
    }

    try {
      // Gather all context data
      const windowContext = getWindowMonitor().getRichContext();
      const chromeContext = await getChromeMonitor().getRichContext();
      const chromeContent = await getChromeMonitor().getContentSummary();

      // Get relevant memories for context
      const relevantMemories = this.getRelevantMemories({ windowContext, chromeContext, chromeContent });
      
      // Create comprehensive context for LLM with memory and temporal awareness
      const contextPrompt = this.buildContextPromptWithMemory(
        windowContext, 
        chromeContext, 
        chromeContent, 
        relevantMemories
      );

      const response = await this.callClaude(contextPrompt, `
        Analyze the user's current cognitive state and provide comprehensive insights with temporal awareness and memory.
        
        Consider:
        - Current context and activity patterns
        - Historical patterns and trends from memory
        - Temporal context (session duration, focus sessions, state transitions)
        - Semantic grounding (current task, work mode, cognitive patterns)
        - Previous analysis results and their evolution
        
        Return ONLY a valid JSON response with this exact structure:
        {
          "flowState": {
            "phase": "calibration" | "engagement" | "flow" | "recovery",
            "confidence": 85,
            "indicators": {
              "focusStability": 75,
              "taskCoherence": 80,
              "distractionLevel": 25,
              "cognitiveLoad": 60
            }
          },
          "optimization": {
            "action": "hide_tabs" | "show_tabs" | "adjust_lighting" | "play_audio" | "maintain" | "recovery",
            "reasoning": "Based on user's focus patterns and current task context",
            "tabsToHide": ["https://youtube.com", "https://reddit.com"],
            "tabsToShow": ["https://github.com", "https://stackoverflow.com"],
            "environmentalChanges": {
              "lighting": "warm" | "cool" | "dim" | "bright",
              "audio": "ambient" | "silence" | "focus_music"
            },
            "priority": "high" | "medium" | "low"
          },
          "insights": {
            "currentTask": "Working on FlowSync application development",
            "workMode": "development" | "research" | "learning" | "communication" | "mixed",
            "productivityScore": 75,
            "distractionTriggers": ["social media", "email notifications"],
            "recommendedActions": ["close distracting tabs", "enable focus mode"]
          }
        }
        
        Do not include any text before or after the JSON. Return only the JSON object.
      `);

      try {
        const analysis = JSON.parse(response);
        
        // Store in memory with significance scoring
        const significance = this.calculateSignificance(analysis);
        const tags = this.generateTags(analysis);
        this.addMemory({ windowContext, chromeContext, chromeContent }, analysis, significance, tags);
        
        // Cache the successful analysis
        this.cachedAnalysis = analysis;
        this.cacheTimestamp = Date.now();
        console.log('[LLM] Analysis cached and stored in memory');
        return analysis;
      } catch (parseError) {
        console.error('[LLM] Failed to parse comprehensive analysis response:', response);
        // Return default analysis if parsing fails
        return {
          flowState: {
            phase: 'calibration',
            confidence: 50,
            indicators: {
              focusStability: 50,
              taskCoherence: 50,
              distractionLevel: 50,
              cognitiveLoad: 50
            }
          },
          optimization: {
            action: 'maintain',
            reasoning: 'Unable to parse LLM response, maintaining current state',
            tabsToHide: [],
            tabsToShow: [],
            tabAnalysis: {
              currentTask: 'Unknown',
              taskRelevantTabs: [],
              irrelevantTabs: [],
              taskContext: {
                primaryDomain: 'Unknown',
                relatedTopics: [],
                workMode: 'mixed',
                cognitiveLoad: 0
              }
            },
            environmentalChanges: {
              lighting: 'warm',
              audio: 'silence'
            },
            priority: 'low'
          },
          insights: {
            currentTask: 'Unable to determine current task',
            workMode: 'mixed',
            productivityScore: 50,
            distractionTriggers: [],
            recommendedActions: ['Check dashboard for more details']
          }
        };
      }
    } catch (error) {
      console.error('[LLM] Failed to get comprehensive analysis:', error);
      return {
        flowState: {
          phase: 'calibration',
          confidence: 0,
          indicators: {
            focusStability: 0,
            taskCoherence: 0,
            distractionLevel: 100,
            cognitiveLoad: 100
          }
        },
        optimization: {
          action: 'maintain',
          reasoning: 'Unable to analyze context',
          tabsToHide: [],
          tabsToShow: [],
          tabAnalysis: {
            currentTask: 'Unknown',
            taskRelevantTabs: [],
            irrelevantTabs: [],
            taskContext: {
              primaryDomain: 'Unknown',
              relatedTopics: [],
              workMode: 'mixed',
              cognitiveLoad: 0
            }
          },
          environmentalChanges: {
            lighting: 'warm',
            audio: 'silence'
          },
          priority: 'low'
        },
        insights: {
          currentTask: 'Unknown',
          workMode: 'mixed',
          productivityScore: 0,
          distractionTriggers: [],
          recommendedActions: []
        }
      };
    }
  }

  /**
   * Generate workspace optimization recommendations
   */
  async generateWorkspaceOptimization(): Promise<WorkspaceOptimization> {
    const analysis = await this.getComprehensiveAnalysis();
    return analysis.optimization;
  }

  /**
   * Generate session insights and recommendations
   */
  async generateSessionInsights(): Promise<SessionInsights> {
    const analysis = await this.getComprehensiveAnalysis();
    return analysis.insights;
  }

  /**
   * Get session statistics and memory insights
   */
  getSessionStats(): {
    sessionDuration: number;
    memoryEntries: number;
    focusSessions: number;
    taskTransitions: number;
    averageSignificance: number;
    topTags: string[];
  } {
    const sessionDuration = Date.now() - this.temporalContext.sessionStart;
    const averageSignificance = this.memory.length > 0 
      ? this.memory.reduce((sum, entry) => sum + entry.significance, 0) / this.memory.length 
      : 0;
    
    // Count tag frequency
    const tagCounts: { [key: string]: number } = {};
    this.memory.forEach(entry => {
      entry.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    const topTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);

    return {
      sessionDuration,
      memoryEntries: this.memory.length,
      focusSessions: this.temporalContext.focusSessions.length,
      taskTransitions: this.temporalContext.taskTransitions.length,
      averageSignificance,
      topTags
    };
  }

  /**
   * Get memory entries for debugging
   */
  getMemoryEntries(): MemoryEntry[] {
    return [...this.memory];
  }

  /**
   * Get temporal context for debugging
   */
  getTemporalContext(): TemporalContext {
    return { ...this.temporalContext };
  }

  /**
   * Get semantic grounding for debugging
   */
  getSemanticGrounding(): SemanticGrounding {
    return { ...this.semanticGrounding };
  }

  /**
   * Force a new analysis (bypasses cache and rate limiting)
   * Used when significant context changes are detected
   */
  async forceNewAnalysis(): Promise<{
    flowState: FlowState;
    optimization: WorkspaceOptimization;
    insights: SessionInsights;
  }> {
    console.log('[LLM] Forcing new analysis due to context change...');
    
    // Clear cache to force fresh analysis
    this.cachedAnalysis = null;
    this.cacheTimestamp = 0;
    
    // Reset rate limiting for forced updates
    this.lastCallTime = 0;
    
    return await this.getComprehensiveAnalysis();
  }

  /**
   * Calculate significance of current analysis for memory storage
   */
  private calculateSignificance(analysis: any): number {
    let significance = 0.5; // Base significance
    
    // High significance for flow state changes
    if (analysis.flowState?.phase === 'flow' && analysis.flowState.confidence > 80) {
      significance += 0.3;
    }
    
    // High significance for task transitions
    if (analysis.insights?.currentTask !== this.semanticGrounding.currentTask) {
      significance += 0.2;
    }
    
    // High significance for high productivity
    if (analysis.insights?.productivityScore > 80) {
      significance += 0.2;
    }
    
    // High significance for optimization actions
    if (analysis.optimization?.action !== 'maintain') {
      significance += 0.1;
    }
    
    return Math.min(significance, 1.0);
  }

  /**
   * Generate semantic tags for memory retrieval
   */
  private generateTags(analysis: any): string[] {
    const tags: string[] = [];
    
    if (analysis.flowState?.phase) {
      tags.push(`flow_${analysis.flowState.phase}`);
    }
    
    if (analysis.insights?.workMode) {
      tags.push(`work_${analysis.insights.workMode}`);
    }
    
    if (analysis.optimization?.action) {
      tags.push(`action_${analysis.optimization.action}`);
    }
    
    if (analysis.flowState?.confidence > 80) {
      tags.push('high_confidence');
    }
    
    if (analysis.insights?.productivityScore > 80) {
      tags.push('high_productivity');
    }
    
    return tags;
  }

  /**
   * Build comprehensive context prompt with memory and temporal awareness
   */
  private buildContextPromptWithMemory(
    windowContext: any, 
    chromeContext: any, 
    chromeContent: any, 
    relevantMemories: MemoryEntry[]
  ): string {
    const sessionDuration = Date.now() - this.temporalContext.sessionStart;
    const sessionMinutes = Math.round(sessionDuration / 60000);
    
    let memoryContext = '';
    if (relevantMemories.length > 0) {
      memoryContext = `

## Historical Context (from memory):
${relevantMemories.map((memory, index) => `
### Memory ${index + 1} (${new Date(memory.timestamp).toLocaleTimeString()}):
- Flow State: ${memory.analysis.flowState?.phase || 'unknown'} (confidence: ${memory.analysis.flowState?.confidence || 0}%)
- Task: ${memory.analysis.insights?.currentTask || 'unknown'}
- Work Mode: ${memory.analysis.insights?.workMode || 'unknown'}
- Productivity: ${memory.analysis.insights?.productivityScore || 0}%
- Significance: ${memory.significance}
- Tags: ${memory.tags.join(', ')}
`).join('')}`;
    }

    return `
# FlowSync Context Analysis

## Current Session Context:
- Session Duration: ${sessionMinutes} minutes
- Session ID: ${this.sessionId}
- Last Activity: ${new Date(this.temporalContext.lastActivity).toLocaleTimeString()}
- Current Task: ${this.semanticGrounding.currentTask}
- Work Mode: ${this.semanticGrounding.workMode}
- Project Context: ${this.semanticGrounding.projectContext}

## Temporal Patterns:
- Focus Sessions: ${this.temporalContext.focusSessions.length} sessions
- Flow State Transitions: ${this.temporalContext.flowStates.length} transitions
- Task History: ${this.semanticGrounding.taskHistory.length} tasks
- Cognitive Patterns: ${this.semanticGrounding.cognitivePatterns.focusCycles.length} focus cycles

## Current Context:
${this.buildContextPrompt(windowContext, chromeContext, chromeContent)}
${memoryContext}

## Analysis Instructions:
Based on the current context, historical patterns, and temporal awareness, provide a comprehensive analysis that considers:

### Flow State Analysis:
1. How the user's cognitive state has evolved over time
2. Current focus level and task engagement
3. Distraction patterns and cognitive load

### Task-Aware Tab Filtering:
4. **CRITICAL**: Analyze each tab's relevance to the current task
5. **Task Context**: Identify the primary task domain (e.g., "React development", "research on AI", "writing documentation")
6. **Tab Relevance**: Score each tab's relevance to the current task (0-1 scale)
7. **Smart Filtering**: Only hide tabs that are:
   - Completely unrelated to current task (e.g., social media, news, entertainment)
   - Actively distracting (e.g., notifications, unrelated work)
   - Not needed for the current work session
8. **Keep Visible**: Always keep tabs that are:
   - Directly related to current task
   - Supporting documentation or references
   - Part of the same project/domain
   - Recently used for the task

### Workspace Optimization:
9. Optimal workspace adjustments based on their history
10. Environmental changes that support the current task
11. Insights that build upon previous analysis

### Tab Analysis Requirements:
- Provide detailed reasoning for each tab's relevance score
- Explain why each tab should be hidden or kept visible
- Consider the user's work mode and cognitive state
- Be conservative - when in doubt, keep tabs visible
`;
  }

  /**
   * Build comprehensive context prompt for LLM
   */
  private buildContextPrompt(windowContext: any, chromeContext: any, chromeContent: any): string {
    return `
# FlowSync Context Analysis

## Current Window Context
- **Active App**: ${windowContext.currentTask.app}
- **File/Project**: ${windowContext.currentTask.filePath || 'N/A'} (${windowContext.currentTask.project || 'N/A'})
- **Window Type**: ${windowContext.currentTask.windowType}
- **Focus Duration**: ${Math.round(windowContext.currentTask.focusDuration / 1000)}s
- **Session Time**: ${Math.round(windowContext.sessionContext.totalSessionTime / 1000)}s
- **Primary Activity**: ${windowContext.sessionContext.primaryActivity}
- **Focus Stability**: ${Math.round(windowContext.sessionContext.focusStability)}%
- **Task Switches**: ${windowContext.sessionContext.taskSwitches}

## Browser Context
- **Active Tabs**: ${chromeContext.currentBrowsingContext.activeTabs.length}
- **Primary Domain**: ${chromeContext.currentBrowsingContext.primaryDomain}
- **Browsing Mode**: ${chromeContext.currentBrowsingContext.browsingMode}
- **Focus Stability**: ${Math.round(chromeContext.currentBrowsingContext.focusStability)}%
- **Work Related Ratio**: ${Math.round(chromeContext.sessionPatterns.workRelatedRatio * 100)}%
- **Distraction Level**: ${chromeContext.sessionPatterns.distractionLevel}%
- **Tab Switching Frequency**: ${chromeContext.sessionPatterns.tabSwitchingFrequency?.toFixed(2) || '0.00'}/min

## Content Analysis
- **Current Page**: ${chromeContent.llmContext.currentPage.title}
- **Page Description**: ${chromeContent.llmContext.currentPage.description}
- **Topics**: ${chromeContent.llmContext.currentPage.topics.join(', ')}
- **Reading Time**: ${chromeContent.llmContext.currentPage.readingTime} min
- **Has Code**: ${chromeContent.llmContext.currentPage.hasCode}
- **Language**: ${chromeContent.llmContext.currentPage.language || 'N/A'}
- **Framework**: ${chromeContent.llmContext.currentPage.framework || 'N/A'}
- **Sentiment**: ${chromeContent.llmContext.currentPage.sentiment}

## Session Patterns
- **Content Focus**: ${chromeContent.llmContext.sessionContext.contentFocus}
- **Technical Level**: ${chromeContent.llmContext.sessionContext.technicalLevel}
- **Work Related**: ${chromeContent.llmContext.sessionContext.workRelated}
- **Primary Topics**: ${chromeContent.llmContext.sessionContext.primaryTopics.join(', ')}

## Behavioral Insights
- **Attention Span**: ${chromeContext.behavioralInsights.attentionSpan}s
- **Multitasking Level**: ${chromeContext.behavioralInsights.multitaskingLevel}%
- **Productivity Score**: ${chromeContext.behavioralInsights.productivityScore}%
- **Distraction Triggers**: ${chromeContext.behavioralInsights.distractionTriggers.join(', ')}

## Most Engaged Tabs
${chromeContext.sessionPatterns.mostEngagedTabs.slice(0, 3).map((tab: any) => 
  `- ${tab.url.split('/')[2]}: ${tab.engagementScore}%`
).join('\n')}

## Comprehensive Tab Analysis for Task-Aware Filtering
**Total Tabs**: ${chromeContext.tabAnalysis.totalTabs}
**Work Related**: ${chromeContext.tabAnalysis.workRelatedTabs.length}
**Non-Work**: ${chromeContext.tabAnalysis.nonWorkTabs.length}
**Active**: ${chromeContext.tabAnalysis.activeTabs.length}
**Recently Used**: ${chromeContext.tabAnalysis.recentlyUsedTabs.length}

### All Tabs with Context:
${chromeContext.tabAnalysis.tabs.map((tab: any, index: number) => `
**Tab ${index + 1}**: ${tab.title}
- URL: ${tab.url}
- Domain: ${tab.domain}
- Category: ${tab.category}
- Work Related: ${tab.isWorkRelated}
- Project Context: ${tab.projectContext || 'N/A'}
- Content Type: ${tab.contentType}
- Time Spent: ${Math.round(tab.timeSpent / 1000)}s
- Engagement Score: ${tab.engagementScore}%
- Focus Duration: ${Math.round(tab.focusDuration / 1000)}s
- Switch Count: ${tab.switchCount}
- Has Code: ${tab.hasCode}
- Framework: ${tab.framework || 'N/A'}
- Language: ${tab.language || 'N/A'}
- Topics: ${tab.topics.join(', ') || 'N/A'}
- Sentiment: ${tab.sentiment}
- Reading Time: ${tab.readingTime} min
- Last Active: ${new Date(tab.lastActive).toLocaleTimeString()}
- Currently Active: ${tab.isActive}
`).join('\n')}

## Window Type Distribution
${Object.entries(windowContext.behavioralPatterns.windowTypeDistribution)
  .map(([type, time]) => `- ${type}: ${Math.round((time as number) / 1000)}s`)
  .join('\n')}
`;
  }

  /**
   * Check if enough time has passed since last API call
   */
  private canMakeAPICall(): boolean {
    const now = Date.now();
    return (now - this.lastCallTime) >= this.minIntervalMs;
  }

  /**
   * Call Claude API with context and instruction
   */
  private async callClaude(context: string, instruction: string): Promise<string> {
    // Rate limiting
    if (!this.canMakeAPICall()) {
      throw new Error('Rate limit: Please wait before making another API call');
    }

    this.lastCallTime = Date.now();
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `${context}\n\n${instruction}`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }
}

// Export singleton instance
let llmEngine: LLMReasoningEngine | null = null;

export function getLLMReasoningEngine(): LLMReasoningEngine {
  if (!llmEngine) {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY or CLAUDE_API_KEY environment variable is required');
    }
    llmEngine = new LLMReasoningEngine(apiKey);
  }
  return llmEngine;
}
