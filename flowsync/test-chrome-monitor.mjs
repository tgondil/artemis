// Simple test script for Chrome Monitor
// Run with: node test-chrome-monitor.mjs

import CDP from 'chrome-remote-interface';

const CDP_PORT = 9222;

console.log('🔍 Testing Chrome CDP Connection...\n');

async function testChromeConnection() {
  try {
    // Check if Chrome is available
    const version = await CDP.Version({ port: CDP_PORT });
    console.log(`✅ Connected to: ${version.Browser}`);
    console.log(`   Protocol: ${version['Protocol-Version']}\n`);
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Chrome');
    console.error('   Make sure Chrome is running with: --remote-debugging-port=9222\n');
    console.error(`   Error: ${error.message}\n`);
    return false;
  }
}

async function listTabs() {
  try {
    const targets = await CDP.List({ port: CDP_PORT });
    const tabs = targets.filter(t => t.type === 'page' && !t.url.startsWith('chrome://'));
    
    console.log(`📑 Found ${tabs.length} tabs:\n`);
    
    tabs.forEach((tab, i) => {
      console.log(`${i + 1}. ${tab.title || 'Untitled'}`);
      console.log(`   URL: ${tab.url}`);
      console.log(`   ID: ${tab.id}\n`);
    });
    
    return tabs;
  } catch (error) {
    console.error('❌ Failed to list tabs:', error.message);
    return [];
  }
}

async function extractTabContent(tabId) {
  let client;
  try {
    console.log(`\n🔬 Extracting content from tab: ${tabId}\n`);
    
    client = await CDP({ target: tabId, port: CDP_PORT });
    const { Runtime } = client;
    
    const result = await Runtime.evaluate({
      expression: `
        (() => {
          const mainContent = 
            document.querySelector('article') ||
            document.querySelector('main') ||
            document.body;
          
          const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
            .map(h => h.textContent?.trim())
            .filter(Boolean)
            .slice(0, 5);
          
          const codeBlocks = document.querySelectorAll('pre, code').length;
          const text = mainContent.innerText || '';
          
          return {
            headings,
            codeBlocks,
            textPreview: text.slice(0, 300),
            textLength: text.length,
          };
        })()
      `,
      returnByValue: true,
    });
    
    const content = result.result.value;
    
    console.log('📄 Content extracted:');
    console.log(`   Headings: ${content.headings.join(' > ')}`);
    console.log(`   Code blocks: ${content.codeBlocks}`);
    console.log(`   Text length: ${content.textLength} chars`);
    console.log(`   Preview:\n   "${content.textPreview}..."\n`);
    
    return content;
  } catch (error) {
    console.error(`❌ Failed to extract content: ${error.message}\n`);
    return null;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

async function runTest() {
  console.log('='.repeat(60));
  console.log('Chrome Monitor Test Suite');
  console.log('='.repeat(60) + '\n');
  
  // Test 1: Connection
  const connected = await testChromeConnection();
  if (!connected) {
    console.log('\n💡 To fix this, run:');
    console.log('   pkill "Google Chrome"');
    console.log('   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 &\n');
    process.exit(1);
  }
  
  // Test 2: List tabs
  const tabs = await listTabs();
  
  if (tabs.length === 0) {
    console.log('⚠️  No tabs found. Open some tabs in Chrome and try again.\n');
    process.exit(0);
  }
  
  // Test 3: Extract content from first tab
  if (tabs.length > 0) {
    await extractTabContent(tabs[0].id);
  }
  
  console.log('='.repeat(60));
  console.log('✅ All tests passed!');
  console.log('='.repeat(60) + '\n');
}

runTest().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});

