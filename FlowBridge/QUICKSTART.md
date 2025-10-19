# 🚀 FlowBridge Quick Start

## Setup

### 1. Open in Android Studio
```bash
# Open Android Studio
# File → Open → Select FlowBridge folder
# Wait for Gradle sync
```

### 2. Build and Run
```bash
# Connect Android device or start emulator
# Click Run button (green triangle)
# Grant VPN permission when prompted
```

### 3. Start FlowBridge
- Tap "Start" button in the app
- Grant VPN permission
- FlowBridge is now active!

## Testing

### Test from Computer

```bash
# Find your phone's IP address (in phone's Wi-Fi settings)
# Test status endpoint
curl http://<PHONE_IP>:3000/api/status

# Test throttling (FlowScore = 0.3 → 200 kbit/s)
curl -X POST http://<PHONE_IP>:3000/api/focus \
  -H "Content-Type: application/json" \
  -d '{"flowScore": 0.3}'

# Test restore (FlowScore = 0.8 → unlimited)
curl -X POST http://<PHONE_IP>:3000/api/focus \
  -H "Content-Type: application/json" \
  -d '{"flowScore": 0.8}'
```

### Verify Throttling

1. **Before throttling**: Open fast.com on phone → Note speed
2. **Send throttle command**: `curl ... '{"flowScore": 0.3}'`
3. **After throttling**: Refresh fast.com → Should show ~200 Kbps
4. **Restore**: `curl ... '{"flowScore": 0.8}'` → Speed returns to normal

## Integration with FlowSync

### From Raspberry Pi
```bash
# On your Pi (assuming phone IP is 192.168.12.150)
curl -X POST http://192.168.12.150:3000/api/focus \
  -H "Content-Type: application/json" \
  -d '{"flowScore": 0.3}'
```

### From Node.js/Express
```javascript
async function updatePhoneBandwidth(flowScore) {
    const response = await fetch('http://192.168.12.150:3000/api/focus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowScore })
    });
    return await response.json();
}

// Usage
updatePhoneBandwidth(0.3);  // Throttle to 200 kbit/s
updatePhoneBandwidth(0.8);  // Restore to normal
```

## FlowScore → Bandwidth Mapping

| FlowScore | Bandwidth  | Mode            |
|-----------|------------|-----------------|
| ≥ 0.7     | Unlimited  | Normal Mode     |
| 0.5-0.69  | 500 kbit/s | Focus Warmup    |
| 0.3-0.49  | 200 kbit/s | Deep Focus      |
| < 0.3     | 100 kbit/s | Extreme Focus   |

## Troubleshooting

### VPN Permission Denied
- Go to Settings → Apps → FlowBridge → Permissions
- Enable VPN permission

### API Not Responding
- Check phone's IP address
- Ensure phone and computer are on same network
- Check phone's firewall settings

### Throttling Not Working
- Verify VPN is active (check notification)
- Test with fast.com
- Check logs in Android Studio Logcat

## Architecture

```
FlowSync Backend → POST /api/focus
        ↓
FlowBridge App (Ktor Server)
        ↓
ThrottleManager (computes bandwidth limit)
        ↓
ThrottleVpnService (applies throttling)
        ↓
TokenBucket (rate limiter)
        ↓
Network Traffic (throttled)
```

## 🎯 Success!

Your FlowBridge is now controlling your phone's bandwidth based on FlowScore! 🚀📱

