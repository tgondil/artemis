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
   * Compute real metrics from context data with temporal evolution
   */
  private computeRealMetrics(windowContext: any, chromeContext: any): {
    focusStability: number;
    distractionLevel: number;
    taskCoherence: number;
    cognitiveLoad: number;
    productivityScore: number;
    attentionSpan: number;
    multitaskingLevel: number;
    sessionEvolution: {
      baselineImprovement: number;
      learningCurve: number;
      adaptationLevel: number;
      usageMaturity: number;
    };
  } {
    // Focus Stability: Based on time spent in same window/tab
    const currentWindowTime = windowContext?.currentTask?.focusDuration || 0;
    const currentTabTime = chromeContext?.tabAnalysis?.activeTabs?.[0]?.focusDuration || 0;
    const focusStability = Math.min(Math.max(currentWindowTime, currentTabTime) / 300000, 1) * 100; // 5 minutes = 100%

    // Distraction Level: Based on tab switching frequency and engagement
    const tabSwitchingFrequency = chromeContext?.sessionPatterns?.tabSwitchingFrequency || 0;
    const lowEngagementTabs = chromeContext?.tabAnalysis?.tabs?.filter((tab: any) => tab.engagementScore < 30) || [];
    const distractionLevel = Math.min((tabSwitchingFrequency * 10) + (lowEngagementTabs.length * 5), 100);

    // Task Coherence: Based on consistent domain usage and project context
    const primaryDomain = chromeContext?.currentBrowsingContext?.primaryDomain || '';
    const projectContext = windowContext?.currentTask?.project || '';
    const domainConsistency = primaryDomain && projectContext ? 
      (primaryDomain.includes(projectContext.toLowerCase()) ? 80 : 40) : 50;
    const taskCoherence = Math.min(domainConsistency + (focusStability * 0.2), 100);

    // Cognitive Load: Based on number of tabs, switching, and content complexity
    const totalTabs = chromeContext?.tabAnalysis?.totalTabs || 0;
    const codeTabs = chromeContext?.tabAnalysis?.tabs?.filter((tab: any) => tab.hasCode) || [];
    const cognitiveLoad = Math.min((totalTabs * 2) + (codeTabs.length * 5) + (tabSwitchingFrequency * 3), 100);

    // Productivity Score: Based on engagement and task focus
    const highEngagementTabs = chromeContext?.tabAnalysis?.highEngagementTabs || [];
    const productivityScore = Math.min((highEngagementTabs.length * 20) + (focusStability * 0.3), 100);

    // Attention Span: Based on average dwell time
    const attentionSpan = chromeContext?.sessionPatterns?.averageTabDwellTime || 0;

    // Multitasking Level: Based on number of active tabs
    const activeTabs = chromeContext?.tabAnalysis?.activeTabs?.length || 0;
    const multitaskingLevel = Math.min(activeTabs * 10, 100);

    // Temporal Evolution Metrics
    const sessionDuration = Date.now() - this.temporalContext.sessionStart;
    const totalSessionTime = windowContext?.sessionContext?.totalSessionTime || 0;
    const sessionCount = this.temporalContext.focusSessions.length;
    const memoryEntries = this.memory.length;
    
    // Baseline Improvement: How much better the user has gotten over time
    const baselineImprovement = this.calculateBaselineImprovement();
    
    // Learning Curve: How quickly the user adapts to the system
    const learningCurve = this.calculateLearningCurve(sessionDuration, sessionCount);
    
    // Adaptation Level: How well the user has adapted to FlowSync
    const adaptationLevel = this.calculateAdaptationLevel(memoryEntries, sessionCount);
    
    // Usage Maturity: How experienced the user is with the system
    const usageMaturity = this.calculateUsageMaturity(totalSessionTime, sessionCount);

    return {
      focusStability: Math.round(focusStability),
      distractionLevel: Math.round(distractionLevel),
      taskCoherence: Math.round(taskCoherence),
      cognitiveLoad: Math.round(cognitiveLoad),
      productivityScore: Math.round(productivityScore),
      attentionSpan: Math.round(attentionSpan),
      multitaskingLevel: Math.round(multitaskingLevel),
      sessionEvolution: {
        baselineImprovement: Math.round(baselineImprovement),
        learningCurve: Math.round(learningCurve),
        adaptationLevel: Math.round(adaptationLevel),
        usageMaturity: Math.round(usageMaturity)
      }
    };
  }

  /**
   * Calculate baseline improvement over time
   */
  private calculateBaselineImprovement(): number {
    if (this.memory.length < 2) return 0;
    
    // Compare recent vs early performance
    const recentMemories = this.memory.slice(-5); // Last 5 entries
    const earlyMemories = this.memory.slice(0, 5); // First 5 entries
    
    const recentAvgFocus = recentMemories.reduce((sum, mem) => sum + (mem.context?.focusStability || 0), 0) / recentMemories.length;
    const earlyAvgFocus = earlyMemories.reduce((sum, mem) => sum + (mem.context?.focusStability || 0), 0) / earlyMemories.length;
    
    return Math.max(0, Math.min(100, (recentAvgFocus - earlyAvgFocus) * 2));
  }

  /**
   * Calculate learning curve based on session progression
   */
  private calculateLearningCurve(sessionDuration: number, sessionCount: number): number {
    if (sessionCount === 0) return 0;
    
    // Learning curve: faster adaptation = higher score
    const sessionHours = sessionDuration / (1000 * 60 * 60);
    const sessionsPerHour = sessionCount / Math.max(sessionHours, 1);
    
    // Higher sessions per hour = faster learning
    return Math.min(100, sessionsPerHour * 20);
  }

  /**
   * Calculate adaptation level based on memory and usage
   */
  private calculateAdaptationLevel(memoryEntries: number, sessionCount: number): number {
    // More memory entries and sessions = better adaptation
    const memoryScore = Math.min(50, memoryEntries * 2);
    const sessionScore = Math.min(50, sessionCount * 5);
    
    return memoryScore + sessionScore;
  }

  /**
   * Calculate usage maturity based on total time and experience
   */
  private calculateUsageMaturity(totalSessionTime: number, sessionCount: number): number {
    const totalHours = totalSessionTime / (1000 * 60 * 60);
    const experienceScore = Math.min(60, totalHours * 2); // 30 hours = 60 points
    const consistencyScore = Math.min(40, sessionCount * 2); // 20 sessions = 40 points
    
    return experienceScore + consistencyScore;
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

      // Compute real metrics from actual data
      const computedMetrics = this.computeRealMetrics(windowContext, chromeContext);
      console.log('[LLM] Computed real metrics:', computedMetrics);

      // Seed ground truth to ensure concrete task context
      this.seedGroundTruth(windowContext, chromeContext);

      // Get relevant memories for context
      const relevantMemories = this.getRelevantMemories({ windowContext, chromeContext, chromeContent });
      
      // Create comprehensive context for LLM with memory and temporal awareness
      const contextPrompt = this.buildContextPromptWithMemory(
        windowContext, 
        chromeContext, 
        chromeContent, 
        relevantMemories,
        computedMetrics
      );

      const response = await this.callClaude(contextPrompt, `
        Given the measured values above, interpret the user's cognitive state and provide comprehensive insights with temporal awareness and memory.
        
        **IMPORTANT**: Use the computed metrics provided above. Do not generate your own numbers - interpret the real measurements.
        
        Consider:
        - Current context and activity patterns
        - Historical patterns and trends from memory
        - Temporal context (session duration, focus sessions, state transitions)
        - Semantic grounding (current task, work mode, cognitive patterns)
        - Previous analysis results and their evolution
        
        **DECISION LOGIC CONSTRAINTS:**
        Before deciding to hide or keep any tab, you MUST apply these rules:

        1. **Keep all tabs** whose titles, URLs, or topics contain any keywords related to the user's currentTask, projectContext, or workMode.
        2. **Only hide tabs if**:
           - They are inactive for >5 minutes, AND
           - Their content type = entertainment OR unrelated social media, AND
           - They are NOT documentation, reference, or educational material FOR the user's task.
        3. **When in doubt, KEEP the tab visible.**

        Return ONLY a valid JSON response with this exact structure:
        {
          "flowState": {
            "phase": "calibration" | "engagement" | "flow" | "recovery",
            "confidence": 85,
            "indicators": {
              "focusStability": ${computedMetrics?.focusStability || 50},
              "taskCoherence": ${computedMetrics?.taskCoherence || 50},
              "distractionLevel": ${computedMetrics?.distractionLevel || 50},
              "cognitiveLoad": ${computedMetrics?.cognitiveLoad || 50}
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
            "priority": "high" | "medium" | "low",
            "tabAnalysis": {
              "evaluations": [
                {
                  "tabId": "123",
                  "title": "JavaScript Tutorial - YouTube",
                  "decision": "keep",
                  "relevanceScore": 0.87,
                  "reason": "Educational JavaScript content relevant to learning task"
                },
                {
                  "tabId": "456", 
                  "title": "Facebook News Feed",
                  "decision": "hide",
                  "relevanceScore": 0.15,
                  "reason": "Social media distraction unrelated to current task"
                }
              ]
            }
          },
          "insights": {
            "currentTask": "Working on FlowSync application development",
            "workMode": "development" | "research" | "learning" | "communication" | "mixed",
            "productivityScore": ${computedMetrics?.productivityScore || 50},
            "attentionSpan": ${computedMetrics?.attentionSpan || 0},
            "multitaskingLevel": ${computedMetrics?.multitaskingLevel || 0},
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
        
        // Learn from the analysis patterns
        this.learnFromPatterns(windowContext, chromeContext, analysis);
        
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
   * Seed ground truth to ensure concrete task context
   */
  private seedGroundTruth(windowContext: any, chromeContext: any): void {
    // Ensure we have concrete task context, never "Unknown"
    if (!this.semanticGrounding.currentTask || this.semanticGrounding.currentTask === 'Unknown') {
      // Use primary domain as fallback
      const primaryDomain = chromeContext?.currentBrowsingContext?.primaryDomain;
      if (primaryDomain) {
        this.semanticGrounding.currentTask = this.inferTaskFromDomain(primaryDomain);
      }
      
      // Use window context as fallback
      if (!this.semanticGrounding.currentTask) {
        const primaryActivity = windowContext?.sessionContext?.primaryActivity;
        if (primaryActivity && primaryActivity !== 'Unknown') {
          this.semanticGrounding.currentTask = primaryActivity;
        }
      }
      
      // Use project context as fallback
      if (!this.semanticGrounding.currentTask) {
        const project = windowContext?.currentTask?.project;
        if (project && project !== 'Unknown') {
          this.semanticGrounding.currentTask = `Working on ${project}`;
        }
      }
    }

    // Ensure we have concrete project context
    if (!this.semanticGrounding.projectContext || this.semanticGrounding.projectContext === 'Unknown') {
      const project = windowContext?.currentTask?.project;
      if (project && project !== 'Unknown') {
        this.semanticGrounding.projectContext = project;
      } else {
        // Infer from primary domain
        const primaryDomain = chromeContext?.currentBrowsingContext?.primaryDomain;
        if (primaryDomain) {
          this.semanticGrounding.projectContext = this.inferProjectFromDomain(primaryDomain);
        }
      }
    }

    console.log('[LLM] Seeded ground truth:', {
      currentTask: this.semanticGrounding.currentTask,
      projectContext: this.semanticGrounding.projectContext
    });
  }

  /**
   * Infer task from domain name
   */
  private inferTaskFromDomain(domain: string): string {
    if (domain.includes('github.com')) return 'Development work';
    if (domain.includes('stackoverflow.com')) return 'Problem solving';
    if (domain.includes('youtube.com')) return 'Learning/Research';
    if (domain.includes('docs.') || domain.includes('developer.mozilla.org')) return 'Reading documentation';
    if (domain.includes('medium.com') || domain.includes('dev.to')) return 'Reading articles';
    if (domain.includes('coursera.org') || domain.includes('udemy.com')) return 'Learning course';
    return `Working on ${domain}`;
  }

  /**
   * Infer project from domain name
   */
  private inferProjectFromDomain(domain: string): string {
    if (domain.includes('github.com')) return 'GitHub project';
    if (domain.includes('stackoverflow.com')) return 'Problem solving';
    if (domain.includes('youtube.com')) return 'Learning session';
    if (domain.includes('docs.')) return 'Documentation review';
    return domain;
  }

  /**
   * Learn from user patterns and adapt system behavior
   */
  private learnFromPatterns(windowContext: any, chromeContext: any, analysis: any): void {
    // Track successful patterns
    if (analysis.flowState?.phase === 'flow' && analysis.flowState?.confidence > 80) {
      this.addMemory(
        { windowContext, chromeContext, chromeContent: {} },
        { flowState: { phase: 'flow', confidence: 85 } },
        0.8,
        ['flow', 'success', 'pattern']
      );
    }

    // Track distraction patterns
    if (analysis.flowState?.indicators?.distractionLevel > 70) {
      this.addMemory(
        { windowContext, chromeContext, chromeContent: {} },
        { flowState: { indicators: { distractionLevel: analysis.flowState.indicators.distractionLevel } } },
        0.6,
        ['distraction', 'pattern', 'learning']
      );
    }

    // Track task coherence patterns
    if (analysis.flowState?.indicators?.taskCoherence > 80) {
      this.addMemory(
        { windowContext, chromeContext, chromeContent: {} },
        { flowState: { indicators: { taskCoherence: analysis.flowState.indicators.taskCoherence } } },
        0.7,
        ['coherence', 'success', 'pattern']
      );
    }
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
    relevantMemories: MemoryEntry[],
    computedMetrics?: any
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

## Computed Metrics (Real Data):
${computedMetrics ? `
**Current Session Metrics:**
- Focus Stability: ${computedMetrics.focusStability}% (based on time spent in same window/tab)
- Distraction Level: ${computedMetrics.distractionLevel}% (based on tab switching and low engagement)
- Task Coherence: ${computedMetrics.taskCoherence}% (based on domain consistency and project context)
- Cognitive Load: ${computedMetrics.cognitiveLoad}% (based on tabs, code complexity, and switching)
- Productivity Score: ${computedMetrics.productivityScore}% (based on engagement and focus)
- Attention Span: ${computedMetrics.attentionSpan}ms (average dwell time)
- Multitasking Level: ${computedMetrics.multitaskingLevel}% (based on active tabs)

**Temporal Evolution (How the user has improved over time):**
- Baseline Improvement: ${computedMetrics.sessionEvolution.baselineImprovement}% (improvement since first use)
- Learning Curve: ${computedMetrics.sessionEvolution.learningCurve}% (how quickly user adapts)
- Adaptation Level: ${computedMetrics.sessionEvolution.adaptationLevel}% (how well user has adapted to FlowSync)
- Usage Maturity: ${computedMetrics.sessionEvolution.usageMaturity}% (experience level with the system)

**Your Task**: Interpret these measured values considering the user's evolution over time and provide qualitative analysis and recommendations that adapt to their experience level.
` : ''}

## Analysis Instructions:
Based on the current context, historical patterns, and temporal awareness, provide a comprehensive analysis that considers:

### Flow State Analysis:
1. How the user's cognitive state has evolved over time
2. Current focus level and task engagement
3. Distraction patterns and cognitive load
4. **Adaptive Analysis**: Consider the user's experience level (Usage Maturity) and adapt recommendations accordingly:
   - **Beginner (0-30%)**: Focus on basic flow concepts, gentle guidance
   - **Intermediate (30-70%)**: Balanced approach, introduce advanced features
   - **Expert (70-100%)**: Advanced optimization, sophisticated insights

### Task-Specific Tab Relevance Analysis:
4. **CRITICAL**: You are an assistant that supports focus while maintaining all resources relevant to the current task
5. **Task Context**: Identify the primary task domain and understand what resources support that task
6. **Task-Specific Logic**:
   - **Learning Mode**: Educational videos, tutorials, documentation, and courses are HIGHLY relevant
   - **Development Mode**: Documentation, Stack Overflow, GitHub, and code examples are relevant
   - **Research Mode**: Papers, blogs, datasets, and reference materials are relevant
   - **Communication Mode**: Slack, Gmail, project dashboards, and collaboration tools are relevant
7. **Semantic Analysis**: For each tab, analyze the actual content and purpose:
   - **Content Purpose**: What is this tab actually for? (learning, reference, entertainment, communication)
   - **Task Support**: How does this tab support the current task?
   - **Educational Value**: Is this educational content for a learning task?
   - **Reference Value**: Is this reference material for development/research?
   - **Distraction Assessment**: Is this actively distracting from the current task?
8. **Conservative Filtering**: Only hide tabs that are:
   - **Completely unrelated** to current task (social media, news, entertainment during work)
   - **Haven't been used for a long time** since they were opened (inactive for extended periods)
   - **Actively distracting** from the current work (not just potentially distracting)
   - **Not needed** for the current work session
9. **Keep Visible**: Always keep tabs that are:
   - Educational content for learning tasks
   - Documentation for development tasks
   - Reference materials for research tasks
   - Communication tools for collaboration tasks
   - Any content that could support the current task

### Workspace Optimization:
9. Optimal workspace adjustments based on their history
10. Environmental changes that support the current task
11. Insights that build upon previous analysis
12. **Adaptive Recommendations**: Tailor suggestions to user's experience level:
    - **Beginner**: Simple, clear instructions with explanations
    - **Intermediate**: Balanced complexity with some advanced options
    - **Expert**: Sophisticated, nuanced recommendations

### Tab Analysis Requirements:
- Provide detailed reasoning for each tab's relevance score
- Explain why each tab should be hidden or kept visible
- Consider the user's work mode and cognitive state
- Be conservative - when in doubt, keep tabs visible

### Concrete Examples for Grounding:

**Example 1: Learning JavaScript**
- Task: "Learning JavaScript"
- Tab: "YouTube - JavaScript Crash Course for Beginners" → KEEP (educational video for learning)
- Tab: "MDN JavaScript Documentation" → KEEP (official documentation for learning)
- Tab: "Stack Overflow - JavaScript questions" → KEEP (reference for learning)
- Tab: "YouTube Music" → HIDE (unrelated entertainment + unused for 2 hours)
- Tab: "Reddit /r/javascriptmemes" → HIDE (distraction + unused for 1 hour)

**Example 2: React Development**
- Task: "React Development"
- Tab: "React Documentation" → KEEP (essential documentation)
- Tab: "GitHub - React project" → KEEP (code repository)
- Tab: "Stack Overflow - React useEffect" → KEEP (reference for development)
- Tab: "YouTube React Tutorial" → KEEP (educational for development)
- Tab: "Facebook News Feed" → HIDE (social media distraction + unused for 3 hours)

**Example 3: Research Task**
- Task: "Research AI Ethics"
- Tab: "ArXiv - AI Ethics Paper" → KEEP (research paper)
- Tab: "Medium - AI Ethics Blog" → KEEP (research article)
- Tab: "Google Scholar" → KEEP (research tool)
- Tab: "Twitter AI Ethics Thread" → KEEP (research discussion)
- Tab: "Netflix" → HIDE (entertainment distraction + unused for 4 hours)

### Analysis Guidelines:
- **Analyze actual content purpose** - what is this tab actually for?
- **Consider task-specific relevance** - how does this support the current task?
- **Be conservative** - when in doubt, keep tabs visible
- **Focus on content purpose** rather than domain assumptions
- **Educational content is relevant for learning tasks**
- **Documentation is relevant for development tasks**
- **Research materials are relevant for research tasks**
`;
  }

  /**
   * Build factual context prompt (observations only)
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

## Current Task Analysis
- **Inferred Task**: ${windowContext.sessionContext.primaryActivity || 'Unknown'}
- **Task Domain**: ${windowContext.currentTask.project || 'Unknown'}
- **Work Context**: ${windowContext.currentTask.windowType}
- **Task Duration**: ${Math.round(windowContext.currentTask.focusDuration / 1000)}s on current task
- **Task Stability**: ${Math.round(windowContext.sessionContext.focusStability)}% (higher = more focused on single task)

## Browser Context
- **Active Tabs**: ${chromeContext.currentBrowsingContext.activeTabs.length}
- **Primary Domain**: ${chromeContext.currentBrowsingContext.primaryDomain}
- **Browsing Mode**: ${chromeContext.currentBrowsingContext.browsingMode}
- **Focus Stability**: ${Math.round(chromeContext.currentBrowsingContext.focusStability)}%
- **Work Related Ratio**: ${Math.round(chromeContext.sessionPatterns.workRelatedRatio * 100)}%
- **Distraction Level**: ${chromeContext.sessionPatterns.distractionLevel}%
- **Tab Switching Frequency**: ${chromeContext.sessionPatterns.tabSwitchingFrequency?.toFixed(2) || '0.00'}/min

## Current Page Analysis
- **Page Title**: ${chromeContent.llmContext.currentPage.title}
- **Page Description**: ${chromeContent.llmContext.currentPage.description}
- **Page Topics**: ${chromeContent.llmContext.currentPage.topics.join(', ')}
- **Content Type**: ${chromeContent.llmContext.currentPage.contentType || 'Unknown'}
- **Reading Time**: ${chromeContent.llmContext.currentPage.readingTime} min
- **Has Code**: ${chromeContent.llmContext.currentPage.hasCode}
- **Language**: ${chromeContent.llmContext.currentPage.language || 'N/A'}
- **Framework**: ${chromeContent.llmContext.currentPage.framework || 'N/A'}
- **Sentiment**: ${chromeContent.llmContext.currentPage.sentiment}

## Task-Content Relevance Analysis
**CRITICAL**: Analyze how the current page relates to the user's current task:
- **Task**: ${windowContext.sessionContext.primaryActivity || 'Unknown'}
- **Current Page**: ${chromeContent.llmContext.currentPage.title}
- **Relevance Check**: Does this page support the current task?
- **Content Match**: Do the page topics align with the task domain?
- **Learning Context**: If task is "learning", educational content should be kept visible
- **Development Context**: If task is "development", documentation and tutorials should be kept visible

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

## Tab Summary
**Total Tabs**: ${chromeContext.tabAnalysis.totalTabs}
**Active**: ${chromeContext.tabAnalysis.activeTabs.length}
**Recently Used**: ${chromeContext.tabAnalysis.recentlyUsedTabs.length}
**High Engagement**: ${chromeContext.tabAnalysis.highEngagementTabs.length}

### Detailed Tab Analysis for LLM Decision Making:
${chromeContext.tabAnalysis.tabs.map((tab: any, index: number) => `
**Tab ${index + 1}**: ${tab.title}
- **URL**: ${tab.url}
- **Domain**: ${tab.domain}
- **Page Description**: ${tab.pageDescription || 'N/A'}
- **Content Summary**: ${tab.contentSummary || 'N/A'}
- **Headings**: ${tab.headings?.slice(0, 5).join(', ') || 'N/A'}
- **Article Title**: ${tab.articleTitle || 'N/A'}
- **Author**: ${tab.author || 'N/A'}
- **Topics**: ${tab.topics?.join(', ') || 'N/A'}
- **Has Code**: ${tab.hasCode}
- **Framework**: ${tab.framework || 'N/A'}
- **Language**: ${tab.language || 'N/A'}
- **Reading Time**: ${tab.readingTime} min
- **Time Spent**: ${Math.round(tab.timeSpent / 1000)}s
- **Engagement Score**: ${tab.engagementScore}%
- **Currently Active**: ${tab.isActive}
- **Last Active**: ${new Date(tab.lastActive).toLocaleString()}
- **Time Since Last Active**: ${Math.round((Date.now() - tab.lastActive) / 60000)} minutes ago
- **Time Since Opened**: ${Math.round((Date.now() - tab.lastActive + tab.timeSpent) / 60000)} minutes ago
- **Recently Used**: ${tab.isRecentlyUsed ? 'Yes (within 30 min)' : 'No (over 30 min ago)'}
- **Long Unused**: ${tab.isLongUnused ? 'Yes (over 1 hour)' : 'No (within 1 hour)'}
- **Usage Pattern**: ${tab.usagePattern}

**SEMANTIC ANALYSIS FOR THIS TAB**:
Current Task: "${windowContext.sessionContext.primaryActivity || 'Unknown'}"
Tab Title: "${tab.title}"
Page Description: "${tab.pageDescription || 'N/A'}"
Content Summary: "${tab.contentSummary || 'N/A'}"

Based on the examples above and the actual content, analyze this tab:
1. **Content Purpose**: What is this tab actually for? (learning, reference, entertainment, communication, research)
2. **Task Relevance**: How does this tab support the current task "${windowContext.sessionContext.primaryActivity || 'Unknown'}"?
3. **Educational Value**: If the task is learning, is this educational content?
4. **Reference Value**: If the task is development/research, is this reference material?
5. **Time Analysis**: Has this tab been inactive for a long time? (Consider hiding only if unused for >30 minutes)
6. **Usage Pattern**: What does the usage pattern tell us? (focused, brief_visit, deep_engagement, etc.)
7. **Distraction Assessment**: Is this actively distracting from the current task?
8. **Decision**: Should this tab be KEPT or HIDDEN? 
   - **KEEP**: If related to task, educational, reference material
   - **HIDE**: Only if completely unrelated OR unused for extended time (>5 minutes)
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
