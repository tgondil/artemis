# Chrome Monitor Setup & Testing

## Prerequisites

The Chrome Monitor uses the Chrome DevTools Protocol (CDP) to connect to Chrome and extract tab data. Chrome must be launched with remote debugging enabled.

---

## 1. Launch Chrome with Remote Debugging

### macOS

```bash
# Close all Chrome instances first
pkill "Google Chrome"

# Launch Chrome with remote debugging on port 9222
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 &
```

### Linux

```bash
# Close all Chrome instances
pkill chrome

# Launch Chrome with remote debugging
google-chrome --remote-debugging-port=9222 &
```

### Windows

```powershell
# Close all Chrome instances
taskkill /F /IM chrome.exe

# Launch Chrome with remote debugging
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

---

## 2. Verify Chrome is Accessible

Once Chrome is running with remote debugging, you can verify it's working:

### Using curl
```bash
curl http://localhost:9222/json
```

You should see JSON output listing all open tabs.

### Using Browser
Open: `http://localhost:9222`

You'll see the DevTools interface showing all tabs.

---

## 3. Testing the Chrome Monitor

### From Electron Renderer (Browser Console)

Once FlowSync is running, open the DevTools console and test the Chrome API:

```javascript
// Check if Chrome CDP is available
const result = await window.chrome.checkAvailable();
console.log('Chrome available:', result);

// List all tabs (just metadata, fast)
const tabs = await window.chrome.listTabs();
console.log('Tabs:', tabs);

// Get full snapshot with content extraction
const snapshot = await window.chrome.getSnapshot({ extractContent: true });
console.log('Snapshot:', snapshot);

// Inspect a specific tab's content
snapshot.snapshot.tabs.forEach(tab => {
  console.log(`\n=== ${tab.metadata.title} ===`);
  console.log(`URL: ${tab.metadata.url}`);
  console.log(`Time spent: ${tab.activity.timeSpent}s`);
  if (tab.content) {
    console.log(`Headings: ${tab.content.headings.join(', ')}`);
    console.log(`Code blocks: ${tab.content.codeBlocks}`);
    console.log(`Preview: ${tab.content.visibleText.slice(0, 100)}...`);
  }
});
```

### From Node.js (Test Script)

Create a test file to verify the Chrome Monitor works standalone:

```javascript
// test-chrome-monitor.js
import { getChromeMonitor } from './src/services/ChromeMonitor';

async function test() {
  const monitor = getChromeMonitor(9222);
  
  // Check availability
  const available = await monitor.isAvailable();
  console.log('Chrome available:', available);
  
  if (!available) {
    console.error('Chrome not running with --remote-debugging-port=9222');
    process.exit(1);
  }
  
  // Get snapshot
  const snapshot = await monitor.getSnapshot({ extractContent: true });
  
  console.log(`\n📊 Found ${snapshot.totalTabs} tabs\n`);
  
  snapshot.tabs.forEach((tab, i) => {
    console.log(`${i + 1}. ${tab.metadata.title}`);
    console.log(`   URL: ${tab.metadata.url}`);
    console.log(`   Time: ${tab.activity.timeSpent}s`);
    if (tab.content) {
      console.log(`   Headings: ${tab.content.headings.slice(0, 3).join(', ')}`);
      console.log(`   Preview: ${tab.content.visibleText.slice(0, 80)}...`);
    }
    console.log('');
  });
}

test().catch(console.error);
```

---

## 4. What the Chrome Monitor Captures

For each tab, the monitor extracts:

### Metadata
- **ID**: Unique tab identifier
- **Title**: Page title
- **URL**: Current URL
- **Favicon**: Icon URL (if available)

### Content (optional, slower)
- **Text**: Main page content (up to 5000 chars)
- **Visible text**: First 500 chars preview
- **Headings**: H1, H2, H3 elements (up to 10)
- **Code blocks**: Count of `<pre>`, `<code>` elements
- **Scroll position**: Current scroll Y position
- **Scroll height**: Total page height

### Activity Tracking
- **Time spent**: Total seconds active on this tab
- **Last active**: Timestamp of last activity
- **Is active**: Currently visible tab
- **Network active**: Has recent network requests (future)

---

## 5. Example Output

```json
{
  "timestamp": 1729363391000,
  "tabs": [
    {
      "metadata": {
        "id": "12345-6789",
        "title": "React Hooks - useCallback",
        "url": "https://react.dev/reference/react/useCallback",
        "type": "page",
        "faviconUrl": "https://react.dev/favicon.ico"
      },
      "content": {
        "text": "useCallback is a React Hook that lets you cache...",
        "headings": ["Reference", "Usage", "Troubleshooting"],
        "codeBlocks": 8,
        "scrollPosition": 450,
        "scrollHeight": 3200,
        "visibleText": "useCallback is a React Hook that lets you cache a function..."
      },
      "activity": {
        "timeSpent": 240,
        "lastActive": 1729363361000,
        "isActive": true,
        "networkActive": false
      }
    }
  ],
  "activeTabs": [...],
  "totalTabs": 12
}
```

---

## 6. Performance Notes

- **List tabs only**: Fast (~50ms) - just metadata
- **Full snapshot with content**: Slower (~200-500ms per tab) - extracts page content
- **Recommended**: Use `listTabs()` for frequent polling, `getSnapshot()` when you need deep analysis

---

## 7. Next Steps

Once the Chrome Monitor is working:

1. ✅ Capture Chrome tabs with content
2. 🔄 Add active window tracking (`active-win`)
3. 🔄 Integrate with gaze tracking (correlate gaze position with window bounds)
4. 🔄 Build Context Analyzer (semantic understanding with Gemini)
5. 🔄 Implement intelligent tab management (move irrelevant tabs)

---

## Troubleshooting

### "Failed to connect to Chrome"
- Make sure Chrome is running with `--remote-debugging-port=9222`
- Check: `curl http://localhost:9222/json`
- Try closing all Chrome instances and relaunching

### "Cannot read property 'innerText' of null"
- Some pages have security restrictions (extensions, chrome:// URLs)
- The monitor filters these out automatically

### "Permission denied"
- On macOS, you may need to grant accessibility permissions
- System Preferences → Security & Privacy → Privacy → Accessibility

