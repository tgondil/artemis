import CDP from 'chrome-remote-interface';

interface TabMetadata {
  id: string;
  title: string;
  url: string;
  type: string;
  faviconUrl?: string;
  // Enhanced context fields
  domain: string;
  category: 'research' | 'social' | 'entertainment' | 'productivity' | 'development' | 'news' | 'other';
  isWorkRelated: boolean;
  projectContext?: string;
  contentType: 'documentation' | 'code' | 'article' | 'video' | 'social' | 'shopping' | 'other';
}

interface TabContent {
  text: string;
  headings: string[];
  codeBlocks: number;
  scrollPosition: number;
  scrollHeight: number;
  visibleText: string; // First 500 chars of main content
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
  workRelatedRatio: number;
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
}

// Helper functions for tab analysis
function analyzeTabContext(url: string, title: string): Partial<TabMetadata> {
  const domain = new URL(url).hostname;
  
  // Categorize domain
  let category: TabMetadata['category'] = 'other';
  let isWorkRelated = false;
  let contentType: TabMetadata['contentType'] = 'other';
  
  // Work-related domains
  if (domain.includes('github.com') || domain.includes('stackoverflow.com') || 
      domain.includes('developer.mozilla.org') || domain.includes('docs.') ||
      domain.includes('api.') || domain.includes('dev.')) {
    category = 'development';
    isWorkRelated = true;
    contentType = 'documentation';
  } else if (domain.includes('google.com') && title.toLowerCase().includes('search')) {
    category = 'research';
    isWorkRelated = true;
  } else if (domain.includes('youtube.com')) {
    category = 'entertainment';
    contentType = 'video';
  } else if (domain.includes('twitter.com') || domain.includes('facebook.com') || 
             domain.includes('instagram.com') || domain.includes('linkedin.com')) {
    category = 'social';
    contentType = 'social';
  } else if (domain.includes('reddit.com') || domain.includes('hackernews.com')) {
    category = 'news';
    contentType = 'article';
  } else if (domain.includes('notion.so') || domain.includes('trello.com') || 
             domain.includes('asana.com') || domain.includes('slack.com')) {
    category = 'productivity';
    isWorkRelated = true;
  }
  
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

  constructor(cdpPort: number = 9222) {
    this.cdpPort = cdpPort;
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
        .map((t: any) => ({
          id: t.id,
          title: t.title || 'Untitled',
          url: t.url,
          type: t.type,
          faviconUrl: t.faviconUrl,
        }));

      return tabs;
    } catch (error: any) {
      console.error('[ChromeMonitor] Failed to list tabs:', error.message);
      throw error;
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

      // Execute script in page context to extract content
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
                document.body;

              // Extract headings
              const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
                .map(h => h.textContent?.trim())
                .filter(Boolean)
                .slice(0, 10); // Limit to first 10 headings

              // Count code blocks
              const codeBlocks = document.querySelectorAll('pre, code, .highlight').length;

              // Get scroll position
              const scrollPosition = window.scrollY;
              const scrollHeight = document.body.scrollHeight;

              // Extract visible text (limit to avoid huge payloads)
              const text = mainContent.innerText || '';
              const visibleText = text.slice(0, 500); // First 500 chars

              return {
                text: text.slice(0, 5000), // Limit to 5000 chars
                headings,
                codeBlocks,
                scrollPosition,
                scrollHeight,
                visibleText,
              };
            } catch (e) {
              return {
                text: '',
                headings: [],
                codeBlocks: 0,
                scrollPosition: 0,
                scrollHeight: 0,
                visibleText: '',
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

      chromeTabs.push({
        metadata: tabMeta,
        content,
        activity: this.getTabActivity(tabMeta.id),
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

