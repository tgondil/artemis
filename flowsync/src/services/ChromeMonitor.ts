import CDP from 'chrome-remote-interface';

interface TabMetadata {
  id: string;
  title: string;
  url: string;
  type: string;
  faviconUrl?: string;
  // Enhanced context fields
  domain: string;
  category: 'research' | 'social' | 'entertainment' | 'productivity' | 'development' | 'news' | 'education' | 'other';
  isWorkRelated: boolean;
  projectContext?: string;
  contentType: 'documentation' | 'code' | 'article' | 'video' | 'social' | 'shopping' | 'tutorial' | 'other';
}

interface TabContent {
  text: string;
  headings: string[];
  codeBlocks: number;
  scrollPosition: number;
  scrollHeight: number;
  visibleText: string; // First 500 chars of main content
  // Enhanced content extraction
  pageTitle: string;
  metaDescription: string;
  keywords: string[];
  mainContent: string; // Extracted main content area
  links: Array<{text: string, url: string}>;
  images: Array<{alt: string, src: string}>;
  semanticInfo: {
    articleTitle?: string;
    author?: string;
    publishDate?: string;
    readingTime?: number;
    topics: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
  };
  technicalInfo: {
    framework?: string; // React, Vue, etc.
    language?: string; // Programming language detected
    hasCode: boolean;
    hasForms: boolean;
    hasVideos: boolean;
  };
}

interface TabActivity {
  timeSpent: number; // Total seconds spent on this tab
  lastActive: number; // Timestamp of last activity
  isActive: boolean;
  networkActive: boolean; // Has recent network activity
  // Enhanced behavioral tracking
  focusDuration: number; // Continuous time in focus
  switchCount: number; // How many times user switched to this tab
  scrollEvents: number; // Number of scroll events
  clickEvents: number; // Number of click events
  dwellTime: number; // Average time per visit
  engagementScore: number; // Calculated engagement level (0-100)
}

export interface ChromeTab {
  metadata: TabMetadata;
  content?: TabContent;
  activity: TabActivity;
}

export interface ChromeSnapshot {
  timestamp: number;
  tabs: ChromeTab[];
  activeTabs: ChromeTab[]; // Tabs currently visible/active
  totalTabs: number;
}

export interface BrowsingPatterns {
  sessionDuration: number;
  totalTabsOpened: number;
  tabSwitchingFrequency: number;
  averageTabDwellTime: number;
  mostEngagedTabs: Array<{url: string, engagementScore: number}>;
  categoryDistribution: Record<string, number>;
  distractionLevel: number; // 0-100, based on non-work tabs
}

export interface ChromeRichContext {
  currentBrowsingContext: {
    activeTabs: ChromeTab[];
    primaryDomain: string;
    browsingMode: 'research' | 'development' | 'social' | 'entertainment' | 'mixed';
    focusStability: number;
  };
  sessionPatterns: BrowsingPatterns;
  behavioralInsights: {
    attentionSpan: number;
    multitaskingLevel: number;
    productivityScore: number;
    distractionTriggers: string[];
  };
  tabAnalysis: {
    totalTabs: number;
    tabs: Array<{
      id: string;
      title: string;
      url: string;
      domain: string;
      category: string;
      isWorkRelated: boolean;
      projectContext?: string;
      contentType: string;
      timeSpent: number;
      focusDuration: number;
      engagementScore: number;
      switchCount: number;
      lastActive: number;
      isActive: boolean;
      hasCode: boolean;
      hasForms: boolean;
      hasVideos: boolean;
      framework: string;
      language: string;
      topics: string[];
      sentiment: string;
      readingTime: number;
    }>;
    activeTabs: any[];
    recentlyUsedTabs: any[];
    highEngagementTabs: any[];
  };
}

// Helper functions for tab analysis
function analyzeTabContext(url: string, title: string): Partial<TabMetadata> {
  const domain = new URL(url).hostname;
  
  // Categorize domain
  let category: TabMetadata['category'] = 'other';
  let isWorkRelated = false;
  let contentType: TabMetadata['contentType'] = 'other';
  
  // Let the LLM make all decisions - no pre-categorization
  // Only extract basic metadata, let LLM analyze relevance
  category = 'other';
  isWorkRelated = false;
  contentType = 'other';
  
  // Extract project context from URL
  let projectContext: string | undefined;
  if (domain.includes('github.com')) {
    const pathParts = new URL(url).pathname.split('/');
    if (pathParts.length >= 3) {
      projectContext = `${pathParts[1]}/${pathParts[2]}`;
    }
  }
  
  return {
    domain,
    category,
    isWorkRelated,
    projectContext,
    contentType
  };
}

function calculateEngagementScore(activity: TabActivity): number {
  const timeWeight = Math.min(activity.timeSpent / 300, 1); // 5 minutes = max
  const interactionWeight = Math.min((activity.scrollEvents + activity.clickEvents) / 20, 1);
  const focusWeight = Math.min(activity.focusDuration / 180, 1); // 3 minutes = max
  
  return Math.round((timeWeight * 0.4 + interactionWeight * 0.3 + focusWeight * 0.3) * 100);
}

export class ChromeMonitor {
  private cdpPort: number;
  private isConnected: boolean = false;
  private tabActivityMap: Map<string, TabActivity> = new Map();
  private activeTabId: string | null = null;
  private lastPollTime: number = Date.now();
  private sessionStartTime: number = Date.now();
  private tabSwitchCount: number = 0;
  
  // Tab change detection for LLM updates
  private lastTabHashes: Map<string, string> = new Map();
  private lastLLMCallTime: number = 0;
  private readonly minLLMIntervalMs: number = 10000; // 10 seconds minimum between LLM calls
  private pendingLLMCall: boolean = false;
  private initializationComplete: boolean = false;
  private readonly initializationDelayMs: number = 15000; // 15 seconds before allowing LLM calls

  constructor(cdpPort: number = 9222) {
    this.cdpPort = cdpPort;
    
    // Set up initialization timer
    setTimeout(() => {
      this.initializationComplete = true;
      console.log('[ChromeMonitor] Initialization period complete - LLM calls now allowed');
    }, this.initializationDelayMs);
  }

  /**
   * Generate a hash for tab content to detect changes
   */
  private generateTabHash(tab: TabMetadata): string {
    const content = `${tab.url}-${tab.title}-${tab.domain}-${tab.category}`;
    return Buffer.from(content).toString('base64').slice(0, 16);
  }

  /**
   * Check if any tabs have changed and trigger LLM update if needed
   */
  private async checkForTabChanges(tabs: TabMetadata[]): Promise<boolean> {
    let hasChanges = false;
    const currentHashes = new Map<string, string>();
    
    // Check each tab for changes
    for (const tab of tabs) {
      const currentHash = this.generateTabHash(tab);
      const lastHash = this.lastTabHashes.get(tab.id);
      
      if (lastHash !== currentHash) {
        console.log(`[ChromeMonitor] Tab change detected: ${tab.title} (${tab.url})`);
        hasChanges = true;
      }
      
      currentHashes.set(tab.id, currentHash);
    }
    
    // Update the hash map
    this.lastTabHashes = currentHashes;
    
    // Trigger LLM update if there are changes and enough time has passed
    if (hasChanges && this.shouldTriggerLLMUpdate()) {
      await this.triggerLLMUpdate();
    }
    
    return hasChanges;
  }

  /**
   * Check if we should trigger an LLM update
   */
  private shouldTriggerLLMUpdate(): boolean {
    // Don't trigger LLM calls during initialization period
    if (!this.initializationComplete) {
      console.log('[ChromeMonitor] Skipping LLM call - still in initialization period');
      return false;
    }
    
    const now = Date.now();
    const timeSinceLastCall = now - this.lastLLMCallTime;
    return timeSinceLastCall >= this.minLLMIntervalMs && !this.pendingLLMCall;
  }

  /**
   * Trigger LLM update for new tab context
   */
  private async triggerLLMUpdate(): Promise<void> {
    if (this.pendingLLMCall) {
      console.log('[ChromeMonitor] LLM call already pending, skipping...');
      return;
    }

    this.pendingLLMCall = true;
    this.lastLLMCallTime = Date.now();
    
    try {
      console.log('[ChromeMonitor] Triggering LLM update for new tab context...');
      
      // Import the LLM reasoning engine
      const { getLLMReasoningEngine } = await import('./LLMReasoningEngine');
      const llmEngine = getLLMReasoningEngine();
      
      // Force new analysis due to tab changes
      await llmEngine.forceNewAnalysis();
      
      console.log('[ChromeMonitor] LLM update completed successfully');
    } catch (error) {
      console.error('[ChromeMonitor] Failed to trigger LLM update:', error);
    } finally {
      this.pendingLLMCall = false;
    }
  }

  /**
   * Check if Chrome is running with remote debugging enabled
   */
  async isAvailable(): Promise<boolean> {
    try {
      const version = await CDP.Version({ port: this.cdpPort });
      this.isConnected = true;
      console.log(`[ChromeMonitor] Connected to ${version.Browser}`);
      return true;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get all Chrome tabs with metadata
   */
  async listTabs(): Promise<TabMetadata[]> {
    try {
      const targets = await CDP.List({ port: this.cdpPort });
      
      // Filter for page tabs only (exclude extensions, background pages, etc.)
      const tabs = targets
        .filter((t: any) => t.type === 'page' && !t.url.startsWith('chrome://'))
        .map((t: any) => {
          const context = analyzeTabContext(t.url, t.title || 'Untitled');
          return {
          id: t.id,
          title: t.title || 'Untitled',
          url: t.url,
          type: t.type,
          faviconUrl: t.faviconUrl,
            domain: context.domain || new URL(t.url).hostname,
            category: context.category || 'other',
            isWorkRelated: context.isWorkRelated || false,
            projectContext: context.projectContext,
            contentType: context.contentType || 'other'
          };
        });

      // Check for tab changes and trigger LLM update if needed
      await this.checkForTabChanges(tabs);

      return tabs;
    } catch (error: any) {
      console.error('[ChromeMonitor] Failed to list tabs:', error.message);
      throw error;
    }
  }

  /**
   * Extract content from a specific tab with gaze context
   */
  async extractTabContentWithGaze(tabId: string, gazeX?: number, gazeY?: number): Promise<TabContent | null> {
    let client;
    try {
      client = await CDP({ target: tabId, port: this.cdpPort });
      const { Runtime } = client;

      // Execute enhanced content extraction with gaze mapping
      const result = await Runtime.evaluate({
        expression: `
          (() => {
            try {
              // Get gaze context if coordinates provided
              let gazeContext = null;
              if (${gazeX !== undefined} && ${gazeY !== undefined}) {
                const elementAtGaze = document.elementFromPoint(${gazeX}, ${gazeY});
                if (elementAtGaze) {
                  gazeContext = {
                    element: elementAtGaze.tagName,
                    text: elementAtGaze.textContent?.slice(0, 200),
                    className: elementAtGaze.className,
                    boundingRect: elementAtGaze.getBoundingClientRect(),
                    isInteractive: elementAtGaze.tagName === 'A' || elementAtGaze.tagName === 'BUTTON',
                    isCode: elementAtGaze.tagName === 'CODE' || elementAtGaze.tagName === 'PRE'
                  };
                }
              }

              // Find main content (try different selectors)
              const mainContent = 
                document.querySelector('article') ||
                document.querySelector('main') ||
                document.querySelector('[role="main"]') ||
                document.querySelector('.content') ||
                document.querySelector('#content') ||
                document.body;

              // Extract basic page info
              const pageTitle = document.title || '';
              const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
              const keywords = Array.from(document.querySelectorAll('meta[name="keywords"]'))
                .map(meta => meta.content?.split(',').map(k => k.trim()))
                .flat()
                .filter(Boolean);

              // Extract headings
              const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
                .map(h => h.textContent?.trim())
                .filter(Boolean)
                .slice(0, 15);

              // Extract links
              const links = Array.from(document.querySelectorAll('a[href]'))
                .slice(0, 20)
                .map(link => ({
                  text: link.textContent?.trim() || '',
                  url: link.href
                }))
                .filter(link => link.text && link.url);

              // Extract images
              const images = Array.from(document.querySelectorAll('img[src]'))
                .slice(0, 10)
                .map(img => ({
                  alt: img.alt || '',
                  src: img.src
                }));

              // Extract main content text
              const text = mainContent.innerText || '';
              const mainContentText = text.slice(0, 10000);
              const visibleText = text.slice(0, 1000);

              // Count various elements
              const codeBlocks = document.querySelectorAll('pre, code, .highlight, .code').length;
              const hasCode = codeBlocks > 0;
              const hasForms = document.querySelectorAll('form').length > 0;
              const hasVideos = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length > 0;

              // Detect framework/technology
              let framework = '';
              if (document.querySelector('[data-reactroot], [data-react-helmet]')) framework = 'React';
              else if (document.querySelector('[data-vue]')) framework = 'Vue';
              else if (document.querySelector('[data-ng-app]')) framework = 'Angular';
              else if (document.querySelector('[data-svelte]')) framework = 'Svelte';

              // Detect programming language in code blocks
              let language = '';
              const codeElements = document.querySelectorAll('code, pre');
              for (const code of codeElements) {
                const className = code.className;
                if (className.includes('javascript') || className.includes('js')) language = 'JavaScript';
                else if (className.includes('python') || className.includes('py')) language = 'Python';
                else if (className.includes('java')) language = 'Java';
                else if (className.includes('cpp') || className.includes('c++')) language = 'C++';
                else if (className.includes('css')) language = 'CSS';
                else if (className.includes('html')) language = 'HTML';
                if (language) break;
              }

              // Extract semantic information
              const articleTitle = document.querySelector('article h1, .article-title, .post-title')?.textContent?.trim();
              const author = document.querySelector('[rel="author"], .author, .byline')?.textContent?.trim();
              const publishDate = document.querySelector('time, .date, .published')?.textContent?.trim();
              
              // Estimate reading time (250 words per minute)
              const wordCount = text.split(/\\s+/).length;
              const readingTime = Math.ceil(wordCount / 250);

              // Extract topics from headings and content
              const topics = [...headings, ...text.split(/\\s+/).slice(0, 100)]
                .filter(word => word.length > 3)
                .map(word => word.toLowerCase())
                .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man'].includes(word))
                .slice(0, 10);

              // Simple sentiment analysis
              const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'perfect', 'awesome'];
              const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'worst', 'disappointing', 'poor', 'wrong', 'error'];
              const positiveCount = positiveWords.reduce((count, word) => count + (text.toLowerCase().includes(word) ? 1 : 0), 0);
              const negativeCount = negativeWords.reduce((count, word) => count + (text.toLowerCase().includes(word) ? 1 : 0), 0);
              let sentiment = 'neutral';
              if (positiveCount > negativeCount) sentiment = 'positive';
              else if (negativeCount > positiveCount) sentiment = 'negative';

              // Get scroll info
              const scrollPosition = window.scrollY;
              const scrollHeight = document.body.scrollHeight;

              return {
                text: mainContentText,
                headings,
                codeBlocks,
                scrollPosition,
                scrollHeight,
                visibleText,
                pageTitle,
                metaDescription,
                keywords,
                mainContent: mainContentText,
                links,
                images,
                gazeContext, // NEW: Gaze-specific content
                semanticInfo: {
                  articleTitle,
                  author,
                  publishDate,
                  readingTime,
                  topics,
                  sentiment
                },
                technicalInfo: {
                  framework,
                  language,
                  hasCode,
                  hasForms,
                  hasVideos
                }
              };
            } catch (e) {
              return {
                text: '',
                headings: [],
                codeBlocks: 0,
                scrollPosition: 0,
                scrollHeight: 0,
                visibleText: '',
                pageTitle: '',
                metaDescription: '',
                keywords: [],
                mainContent: '',
                links: [],
                images: [],
                gazeContext: null,
                semanticInfo: {
                  topics: [],
                  sentiment: 'neutral'
                },
                technicalInfo: {
                  hasCode: false,
                  hasForms: false,
                  hasVideos: false
                },
                error: e.message
              };
            }
          })()
        `,
        returnByValue: true,
        awaitPromise: true,
      });

      if (result.exceptionDetails) {
        console.error('[ChromeMonitor] Exception extracting content:', result.exceptionDetails);
        return null;
      }

      return result.result.value as TabContent;
    } catch (error: any) {
      console.error(`[ChromeMonitor] Failed to extract content from tab ${tabId}:`, error.message);
      return null;
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  /**
   * Extract content from a specific tab
   */
  async extractTabContent(tabId: string): Promise<TabContent | null> {
    let client;
    try {
      // Connect to the specific tab
      client = await CDP({ target: tabId, port: this.cdpPort });
      const { Runtime } = client;

      // Execute comprehensive content extraction script
      const result = await Runtime.evaluate({
        expression: `
          (() => {
            try {
              // Find main content (try different selectors)
              const mainContent = 
                document.querySelector('article') ||
                document.querySelector('main') ||
                document.querySelector('[role="main"]') ||
                document.querySelector('.content') ||
                document.querySelector('#content') ||
                document.body;

              // Extract basic page info
              const pageTitle = document.title || '';
              const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
              const keywords = Array.from(document.querySelectorAll('meta[name="keywords"]'))
                .map(meta => meta.content?.split(',').map(k => k.trim()))
                .flat()
                .filter(Boolean);

              // Extract headings
              const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
                .map(h => h.textContent?.trim())
                .filter(Boolean)
                .slice(0, 15);

              // Extract links
              const links = Array.from(document.querySelectorAll('a[href]'))
                .slice(0, 20)
                .map(link => ({
                  text: link.textContent?.trim() || '',
                  url: link.href
                }))
                .filter(link => link.text && link.url);

              // Extract images
              const images = Array.from(document.querySelectorAll('img[src]'))
                .slice(0, 10)
                .map(img => ({
                  alt: img.alt || '',
                  src: img.src
                }));

              // Extract main content text
              const text = mainContent.innerText || '';
              const mainContentText = text.slice(0, 10000); // Increased limit for LLM
              const visibleText = text.slice(0, 1000); // First 1000 chars

              // Count various elements
              const codeBlocks = document.querySelectorAll('pre, code, .highlight, .code').length;
              const hasCode = codeBlocks > 0;
              const hasForms = document.querySelectorAll('form').length > 0;
              const hasVideos = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length > 0;

              // Detect framework/technology
              let framework = '';
              if (document.querySelector('[data-reactroot], [data-react-helmet]')) framework = 'React';
              else if (document.querySelector('[data-vue]')) framework = 'Vue';
              else if (document.querySelector('[data-ng-app]')) framework = 'Angular';
              else if (document.querySelector('[data-svelte]')) framework = 'Svelte';

              // Detect programming language in code blocks
              let language = '';
              const codeElements = document.querySelectorAll('code, pre');
              for (const code of codeElements) {
                const className = code.className;
                if (className.includes('javascript') || className.includes('js')) language = 'JavaScript';
                else if (className.includes('python') || className.includes('py')) language = 'Python';
                else if (className.includes('java')) language = 'Java';
                else if (className.includes('cpp') || className.includes('c++')) language = 'C++';
                else if (className.includes('css')) language = 'CSS';
                else if (className.includes('html')) language = 'HTML';
                if (language) break;
              }

              // Extract semantic information
              const articleTitle = document.querySelector('article h1, .article-title, .post-title')?.textContent?.trim();
              const author = document.querySelector('[rel="author"], .author, .byline')?.textContent?.trim();
              const publishDate = document.querySelector('time, .date, .published')?.textContent?.trim();
              
              // Estimate reading time (250 words per minute)
              const wordCount = text.split(/\\s+/).length;
              const readingTime = Math.ceil(wordCount / 250);

              // Extract topics from headings and content
              const topics = [...headings, ...text.split(/\\s+/).slice(0, 100)]
                .filter(word => word.length > 3)
                .map(word => word.toLowerCase())
                .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man'].includes(word))
                .slice(0, 10);

              // Simple sentiment analysis (basic keyword matching)
              const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'perfect', 'awesome'];
              const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'worst', 'disappointing', 'poor', 'wrong', 'error'];
              const positiveCount = positiveWords.reduce((count, word) => count + (text.toLowerCase().includes(word) ? 1 : 0), 0);
              const negativeCount = negativeWords.reduce((count, word) => count + (text.toLowerCase().includes(word) ? 1 : 0), 0);
              let sentiment = 'neutral';
              if (positiveCount > negativeCount) sentiment = 'positive';
              else if (negativeCount > positiveCount) sentiment = 'negative';

              // Get scroll info
              const scrollPosition = window.scrollY;
              const scrollHeight = document.body.scrollHeight;

              return {
                text: mainContentText,
                headings,
                codeBlocks,
                scrollPosition,
                scrollHeight,
                visibleText,
                pageTitle,
                metaDescription,
                keywords,
                mainContent: mainContentText,
                links,
                images,
                semanticInfo: {
                  articleTitle,
                  author,
                  publishDate,
                  readingTime,
                  topics,
                  sentiment
                },
                technicalInfo: {
                  framework,
                  language,
                  hasCode,
                  hasForms,
                  hasVideos
                }
              };
            } catch (e) {
              return {
                text: '',
                headings: [],
                codeBlocks: 0,
                scrollPosition: 0,
                scrollHeight: 0,
                visibleText: '',
                pageTitle: '',
                metaDescription: '',
                keywords: [],
                mainContent: '',
                links: [],
                images: [],
                semanticInfo: {
                  topics: [],
                  sentiment: 'neutral'
                },
                technicalInfo: {
                  hasCode: false,
                  hasForms: false,
                  hasVideos: false
                },
                error: e.message
              };
            }
          })()
        `,
        returnByValue: true,
        awaitPromise: true,
      });

      if (result.exceptionDetails) {
        console.error('[ChromeMonitor] Exception extracting content:', result.exceptionDetails);
        return null;
      }

      return result.result.value as TabContent;
    } catch (error: any) {
      console.error(`[ChromeMonitor] Failed to extract content from tab ${tabId}:`, error.message);
      return null;
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  /**
   * Update activity tracking for tabs
   */
  private updateTabActivity(tabId: string, isActive: boolean) {
    const now = Date.now();
    const existing = this.tabActivityMap.get(tabId);

    if (existing) {
      // Update time spent if this was the active tab
      if (existing.isActive && this.activeTabId === tabId) {
        const deltaSeconds = (now - this.lastPollTime) / 1000;
        existing.timeSpent += deltaSeconds;
      }
      existing.isActive = isActive;
      existing.lastActive = isActive ? now : existing.lastActive;
    } else {
      // New tab
      this.tabActivityMap.set(tabId, {
        timeSpent: 0,
        lastActive: now,
        isActive,
        networkActive: false,
        focusDuration: 0,
        switchCount: 0,
        scrollEvents: 0,
        clickEvents: 0,
        dwellTime: 0,
        engagementScore: 0,
      });
    }

    if (isActive) {
      this.activeTabId = tabId;
    }

    this.lastPollTime = now;
  }

  /**
   * Get activity data for a tab
   */
  private getTabActivity(tabId: string): TabActivity {
    return this.tabActivityMap.get(tabId) || {
      timeSpent: 0,
      lastActive: Date.now(),
      isActive: false,
      networkActive: false,
      focusDuration: 0,
      switchCount: 0,
      scrollEvents: 0,
      clickEvents: 0,
      dwellTime: 0,
      engagementScore: 0,
    };
  }

  /**
   * Get a complete snapshot of all Chrome tabs with content
   */
  async getSnapshot(options: { extractContent: boolean } = { extractContent: true }): Promise<ChromeSnapshot> {
    if (!this.isConnected) {
      await this.isAvailable();
    }

    const tabs = await this.listTabs();
    const chromeTabs: ChromeTab[] = [];

    // Get the active tab (we'll use a heuristic: most recently accessed)
    // In a real implementation, we'd need to query Chrome's window/tab API
    // For now, we'll extract content from all tabs (can be optimized later)

    for (const tabMeta of tabs) {
      let content: TabContent | undefined;

      if (options.extractContent) {
        content = await this.extractTabContent(tabMeta.id) || undefined;
      }

      // Update activity (for now, assume first tab is active - can be improved)
      const isActive = tabs.indexOf(tabMeta) === 0;
      this.updateTabActivity(tabMeta.id, isActive);

      // Analyze tab context for rich information
      const context = analyzeTabContext(tabMeta.url, tabMeta.title);
      const enhancedMetadata = {
        ...tabMeta,
        ...context
      };

      // Get activity data and calculate engagement score
      const activity = this.getTabActivity(tabMeta.id);
      const engagementScore = calculateEngagementScore(activity);

      chromeTabs.push({
        metadata: enhancedMetadata,
        content,
        activity: {
          ...activity,
          engagementScore
        },
      });
    }

    const activeTabs = chromeTabs.filter(t => t.activity.isActive);

    return {
      timestamp: Date.now(),
      tabs: chromeTabs,
      activeTabs,
      totalTabs: chromeTabs.length,
    };
  }

  /**
   * Get comprehensive content summary for LLM analysis
   */
  async getContentSummary(): Promise<{
    activeTabContent: TabContent | null;
    contentSummary: {
      totalTabs: number;
      contentTypes: Record<string, number>;
      topics: string[];
      languages: string[];
      frameworks: string[];
      readingTime: number;
      hasCode: boolean;
      hasVideos: boolean;
      hasForms: boolean;
    };
    llmContext: {
      currentPage: {
        title: string;
        description: string;
        topics: string[];
        sentiment: string;
        readingTime: number;
        hasCode: boolean;
        language?: string;
        framework?: string;
      };
      sessionContext: {
        primaryTopics: string[];
        contentFocus: string;
        technicalLevel: 'beginner' | 'intermediate' | 'advanced';
        workRelated: boolean;
      };
    };
  }> {
    const snapshot = await this.getSnapshot({ extractContent: true });
    const activeTab = snapshot.activeTabs[0];
    
    // Analyze content across all tabs
    const contentTypes: Record<string, number> = {};
    const allTopics: string[] = [];
    const languages: string[] = [];
    const frameworks: string[] = [];
    let totalReadingTime = 0;
    let hasCode = false;
    let hasVideos = false;
    let hasForms = false;
    
    snapshot.tabs.forEach(tab => {
      if (tab.content) {
        // Content type analysis
        const contentType = tab.metadata.contentType;
        contentTypes[contentType] = (contentTypes[contentType] || 0) + 1;
        
        // Collect topics
        if (tab.content.semanticInfo?.topics) {
          allTopics.push(...tab.content.semanticInfo.topics);
        }
        
        // Technical info
        if (tab.content.technicalInfo?.language) {
          languages.push(tab.content.technicalInfo.language);
        }
        if (tab.content.technicalInfo?.framework) {
          frameworks.push(tab.content.technicalInfo.framework);
        }
        
        // Reading time
        if (tab.content.semanticInfo?.readingTime) {
          totalReadingTime += tab.content.semanticInfo.readingTime;
        }
        
        // Technical features
        if (tab.content.technicalInfo?.hasCode) hasCode = true;
        if (tab.content.technicalInfo?.hasVideos) hasVideos = true;
        if (tab.content.technicalInfo?.hasForms) hasForms = true;
      }
    });
    
    // Get unique topics and frameworks
    const uniqueTopics = [...new Set(allTopics)].slice(0, 10);
    const uniqueLanguages = [...new Set(languages)];
    const uniqueFrameworks = [...new Set(frameworks)];
    
    // Determine technical level
    let technicalLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
    if (uniqueLanguages.length > 2 || uniqueFrameworks.length > 1) {
      technicalLevel = 'advanced';
    } else if (uniqueLanguages.length > 0 || uniqueFrameworks.length > 0) {
      technicalLevel = 'intermediate';
    }
    
    // Determine content focus
    const workRelatedTabs = snapshot.tabs.filter(tab => tab.metadata.isWorkRelated);
    const workRelated = workRelatedTabs.length > snapshot.tabs.length * 0.5;
    
    return {
      activeTabContent: activeTab?.content || null,
      contentSummary: {
        totalTabs: snapshot.tabs.length,
        contentTypes,
        topics: uniqueTopics,
        languages: uniqueLanguages,
        frameworks: uniqueFrameworks,
        readingTime: totalReadingTime,
        hasCode,
        hasVideos,
        hasForms
      },
      llmContext: {
        currentPage: {
          title: activeTab?.content?.pageTitle || activeTab?.metadata.title || 'Unknown',
          description: activeTab?.content?.metaDescription || '',
          topics: activeTab?.content?.semanticInfo?.topics || [],
          sentiment: activeTab?.content?.semanticInfo?.sentiment || 'neutral',
          readingTime: activeTab?.content?.semanticInfo?.readingTime || 0,
          hasCode: activeTab?.content?.technicalInfo?.hasCode || false,
          language: activeTab?.content?.technicalInfo?.language,
          framework: activeTab?.content?.technicalInfo?.framework
        },
        sessionContext: {
          primaryTopics: uniqueTopics,
          contentFocus: workRelated ? 'work' : 'personal',
          technicalLevel,
          workRelated
        }
      }
    };
  }

  /**
   * Get rich context data for LLM reasoning
   */
  async getRichContext(): Promise<ChromeRichContext> {
    const snapshot = await this.getSnapshot();
    const now = Date.now();
    const sessionDuration = now - this.sessionStartTime;
    
    // Calculate browsing patterns (without pre-categorization bias)
    const totalTabs = snapshot.tabs.length;
    // Let LLM determine relevance, don't pre-categorize
    
    // Calculate category distribution
    const categoryDistribution: Record<string, number> = {};
    snapshot.tabs.forEach(tab => {
      const category = tab.metadata.category;
      categoryDistribution[category] = (categoryDistribution[category] || 0) + tab.activity.timeSpent;
    });
    
    // Get most engaged tabs with detailed context
    const mostEngagedTabs = snapshot.tabs
      .sort((a, b) => b.activity.engagementScore - a.activity.engagementScore)
      .slice(0, 5)
      .map(tab => ({
        id: tab.metadata.id,
        url: tab.metadata.url,
        title: tab.metadata.title,
        domain: tab.metadata.domain,
        category: tab.metadata.category,
        isWorkRelated: tab.metadata.isWorkRelated,
        projectContext: tab.metadata.projectContext,
        contentType: tab.metadata.contentType,
        engagementScore: tab.activity.engagementScore,
        timeSpent: tab.activity.timeSpent,
        focusDuration: tab.activity.focusDuration,
        switchCount: tab.activity.switchCount
      }));
    
    // Calculate average dwell time
    const totalTimeSpent = snapshot.tabs.reduce((sum, tab) => sum + tab.activity.timeSpent, 0);
    const averageTabDwellTime = totalTabs > 0 ? totalTimeSpent / totalTabs : 0;
    
    // Let LLM determine distraction level based on actual content analysis
    const distractionLevel = 0; // Neutral - let LLM decide
    
    // Determine browsing mode
    const activeTabs = snapshot.activeTabs;
    const primaryDomain = activeTabs.length > 0 ? activeTabs[0].metadata.domain : 'unknown';
    
    // Let LLM determine browsing mode based on actual content analysis
    let browsingMode: ChromeRichContext['currentBrowsingContext']['browsingMode'] = 'mixed';
    
    // Calculate focus stability (time spent in same tab)
    const focusStability = activeTabs.length > 0 
      ? Math.min(activeTabs[0].activity.focusDuration / 300, 1) * 100 // 5 minutes = 100%
      : 0;
    
    // Calculate behavioral insights (without bias)
    const attentionSpan = Math.round(averageTabDwellTime);
    const multitaskingLevel = Math.min(totalTabs / 10, 1) * 100; // 10+ tabs = 100%
    const productivityScore = 50; // Neutral - let LLM determine based on actual task performance
    
    // Let LLM identify distraction triggers based on actual content analysis
    const distractionTriggers: string[] = [];
    
    // Comprehensive tab analysis for task-aware filtering
    const tabAnalysis = snapshot.tabs.map(tab => ({
      id: tab.metadata.id,
      title: tab.metadata.title,
      url: tab.metadata.url,
      domain: tab.metadata.domain,
      category: tab.metadata.category,
      isWorkRelated: tab.metadata.isWorkRelated,
      projectContext: tab.metadata.projectContext,
      contentType: tab.metadata.contentType,
      timeSpent: tab.activity.timeSpent,
      focusDuration: tab.activity.focusDuration,
      engagementScore: tab.activity.engagementScore,
      switchCount: tab.activity.switchCount,
      lastActive: tab.activity.lastActive,
      isActive: tab.activity.isActive,
      // Enhanced semantic content analysis
      hasCode: tab.content?.technicalInfo?.hasCode || false,
      hasForms: tab.content?.technicalInfo?.hasForms || false,
      hasVideos: tab.content?.technicalInfo?.hasVideos || false,
      framework: tab.content?.technicalInfo?.framework || '',
      language: tab.content?.technicalInfo?.language || '',
      topics: tab.content?.semanticInfo?.topics || [],
      sentiment: tab.content?.semanticInfo?.sentiment || 'neutral',
      readingTime: tab.content?.semanticInfo?.readingTime || 0,
      // Additional semantic content
      pageDescription: tab.content?.metaDescription || '',
      headings: tab.content?.headings || [],
      articleTitle: tab.content?.semanticInfo?.articleTitle || '',
      author: tab.content?.semanticInfo?.author || '',
      publishDate: tab.content?.semanticInfo?.publishDate || '',
      // Content summary for semantic analysis
      contentSummary: tab.content?.text?.slice(0, 500) || '', // First 500 chars for context
      mainContent: tab.content?.mainContent || '',
      // Time-based analysis for conservative filtering
      timeSinceLastActive: Date.now() - tab.activity.lastActive,
      timeSinceOpened: Date.now() - (tab.activity.lastActive - tab.activity.timeSpent),
      isRecentlyUsed: (Date.now() - tab.activity.lastActive) < 1800000, // 30 minutes
      isLongUnused: (Date.now() - tab.activity.lastActive) > 3600000, // 1 hour
      usagePattern: this.calculateUsagePattern(tab.activity)
    }));
    
    return {
      currentBrowsingContext: {
        activeTabs,
        primaryDomain,
        browsingMode,
        focusStability
      },
      sessionPatterns: {
        sessionDuration,
        totalTabsOpened: totalTabs,
        tabSwitchingFrequency: this.tabSwitchCount / (sessionDuration / 60000), // switches per minute
        averageTabDwellTime,
        mostEngagedTabs,
        categoryDistribution,
        distractionLevel
      },
      behavioralInsights: {
        attentionSpan,
        multitaskingLevel,
        productivityScore,
        distractionTriggers
      },
      tabAnalysis: {
        totalTabs: tabAnalysis.length,
        tabs: tabAnalysis,
        activeTabs: tabAnalysis.filter(tab => tab.isActive),
        recentlyUsedTabs: tabAnalysis
          .filter(tab => Date.now() - tab.lastActive < 300000) // Last 5 minutes
          .sort((a, b) => b.lastActive - a.lastActive),
        highEngagementTabs: tabAnalysis
          .filter(tab => tab.engagementScore > 70)
          .sort((a, b) => b.engagementScore - a.engagementScore)
      }
    };
  }

  /**
   * Calculate usage pattern for a tab
   */
  private calculateUsagePattern(activity: TabActivity): string {
    const timeSpent = activity.timeSpent;
    const switchCount = activity.switchCount;
    const focusDuration = activity.focusDuration;
    
    if (timeSpent > 300000 && switchCount < 3) { // 5+ minutes, few switches
      return 'focused';
    } else if (switchCount > 10) { // Many switches
      return 'frequent_switching';
    } else if (timeSpent < 30000) { // Less than 30 seconds
      return 'brief_visit';
    } else if (focusDuration > 120000) { // 2+ minutes focused
      return 'deep_engagement';
    } else {
      return 'moderate_usage';
    }
  }

  /**
   * Clean up old activity data
   */
  cleanup() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Remove tabs that haven't been active in over an hour
    for (const [tabId, activity] of this.tabActivityMap.entries()) {
      if (activity.lastActive < oneHourAgo) {
        this.tabActivityMap.delete(tabId);
      }
    }
  }

  /**
   * Close tabs matching specific URLs or patterns
   */
  async closeTabs(urlsToClose: string[]): Promise<{ success: boolean; closedCount: number; error?: string }> {
    try {
      const tabs = await this.listTabs();
      let closedCount = 0;

      console.log(`[ChromeMonitor] Found ${tabs.length} total tabs`);
      console.log('[ChromeMonitor] All tab URLs:', tabs.map(t => t.url));

      for (const tab of tabs) {
        // Check if this tab's URL matches any of the URLs to close
        const shouldClose = urlsToClose.some(urlPattern => {
          try {
            // Support both exact matches and domain matches
            if (tab.url.includes(urlPattern)) {
              console.log(`[ChromeMonitor] ✓ Match found: ${tab.url} contains ${urlPattern}`);
              return true;
            }
            
            // Try to parse as URL for hostname matching
            if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
              const hostname = new URL(tab.url).hostname;
              
              // Check if hostname matches the pattern (with or without www.)
              if (hostname.includes(urlPattern)) {
                console.log(`[ChromeMonitor] ✓ Match found: hostname ${hostname} contains ${urlPattern}`);
                return true;
              }
              
              // Also check if pattern matches hostname without www.
              const hostnameWithoutWww = hostname.replace(/^www\./, '');
              const patternWithoutWww = urlPattern.replace(/^www\./, '');
              
              if (hostnameWithoutWww === patternWithoutWww || hostnameWithoutWww.endsWith('.' + patternWithoutWww)) {
                console.log(`[ChromeMonitor] ✓ Match found: ${hostnameWithoutWww} matches ${patternWithoutWww}`);
                return true;
              }
            }
            
            return false;
          } catch (err) {
            // If URL parsing fails, just do string matching
            return tab.url.includes(urlPattern);
          }
        });

        if (shouldClose) {
          try {
            console.log(`[ChromeMonitor] Attempting to close tab: ${tab.title} (${tab.url})`);
            // Use CDP to close the tab
            const client = await CDP({ target: tab.id, port: this.cdpPort });
            const { Target } = client;
            await Target.closeTarget({ targetId: tab.id });
            await client.close();
            closedCount++;
            console.log(`[ChromeMonitor] ✓ Successfully closed tab: ${tab.title}`);
          } catch (err) {
            console.error(`[ChromeMonitor] ✗ Failed to close tab ${tab.id}:`, err);
          }
        }
      }

      console.log(`[ChromeMonitor] Final result: closed ${closedCount} tabs`);
      return { success: true, closedCount };
    } catch (error) {
      console.error('[ChromeMonitor] Error closing tabs:', error);
      return { 
        success: false, 
        closedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Close the monitor and clean up
   */
  async close() {
    this.isConnected = false;
    this.tabActivityMap.clear();
    console.log('[ChromeMonitor] Closed');
  }
}

// Singleton instance
let monitorInstance: ChromeMonitor | null = null;

export function getChromeMonitor(port: number = 9222): ChromeMonitor {
  if (!monitorInstance) {
    monitorInstance = new ChromeMonitor(port);
  }
  return monitorInstance;
}

