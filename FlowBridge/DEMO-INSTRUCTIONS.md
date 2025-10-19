# Artemis FlowBridge - Demo Setup Instructions

## Overview
Artemis FlowBridge is an Android app that provides headless bandwidth throttling control via API. It displays notifications when bandwidth is blocked or restored, without requiring UI interaction during demos.

## Prerequisites
- Android device with USB debugging enabled
- Android Studio installed on your computer
- ADB (Android Debug Bridge) available in your PATH
- Phone and computer connected via USB

## Quick Start

### 1. Build and Install the App

```bash
cd /Users/devanshkhandelwal/Documents/fall2025/artemis/artemis/FlowBridge
./gradlew installDebug
```

### 2. Grant Permissions (One-time Setup)
- Open the **Artemis** app on your phone
- Tap **Start** and grant VPN permission when prompted
- Allow notifications when prompted (Android 13+)
- You can now close the app - it will be controlled via API

### 3. Start the Headless Control Service

```bash
# Set up ADB port forwarding (routes localhost:3001 to phone:3001)
adb forward tcp:3001 tcp:3001

# Start the bootstrap server on the phone
adb shell am start-foreground-service -n com.flowsync.flowbridge/.BootstrapServerService
```

You should see a persistent "Artemis" notification on the phone indicating the control server is active.

## API Endpoints

All endpoints are accessible via `http://localhost:3001` (through ADB port forwarding).

### Check Status
```bash
curl http://localhost:3001/api/status
```

**Response:**
```json
{
  "running": true,
  "vpnActive": true,
  "flowScore": 1.0,
  "throttling": false,
  "bandwidth": "2147483647kbit"
}
```

### Start VPN Service
```bash
curl -X POST http://localhost:3001/api/start
```

**Response:**
```json
{
  "status": "starting"
}
```

### Stop VPN Service
```bash
curl -X POST http://localhost:3001/api/stop
```

**Response:**
```json
{
  "status": "stopping"
}
```

### Apply Bandwidth Throttling
```bash
curl -X POST http://localhost:3001/api/focus \
  -H "Content-Type: application/json" \
  -d '{"flowScore": 0.3}'
```

**Response:**
```json
{
  "ok": true,
  "flowScore": 0.3,
  "bandwidth": "200000kbit"
}
```

**FlowScore Mapping:**
| FlowScore | Bandwidth  | Mode          | Notification |
|-----------|------------|---------------|--------------|
| ≥ 0.7     | Unlimited  | Normal Mode   | "Artemis has reinstated your bandwidth and notifications" |
| 0.5-0.69  | 50 MB/s    | Focus Warmup  | (no change) |
| 0.3-0.49  | 25 MB/s    | Deep Focus    | "Artemis has blocked your bandwidth and notifications" |
| < 0.3     | 10 MB/s    | Extreme Focus | "Artemis has blocked your bandwidth and notifications" |

**Note:** Notifications only fire on state transitions (throttled ↔ normal).

### Restore Normal Bandwidth
```bash
curl -X POST http://localhost:3001/api/focus \
  -H "Content-Type: application/json" \
  -d '{"flowScore": 0.8}'
```

## Demo Workflow

### Typical Demo Sequence

1. **Setup** (before demo):
```bash
# Connect phone via USB
adb devices  # Verify phone is connected

# Set up port forwarding
adb forward tcp:3001 tcp:3001

# Start the service
adb shell am start-foreground-service -n com.flowsync.flowbridge/.BootstrapServerService

# Verify it's running
curl http://localhost:3001/api/status
```

2. **During Demo** (show bandwidth blocking):
```bash
# Block bandwidth and trigger notification
curl -X POST http://localhost:3001/api/focus \
  -H "Content-Type: application/json" \
  -d '{"flowScore": 0.3}'
```
→ Phone shows: **"Artemis has blocked your bandwidth and notifications"**

3. **During Demo** (restore bandwidth):
```bash
# Restore bandwidth and trigger notification
curl -X POST http://localhost:3001/api/focus \
  -H "Content-Type: application/json" \
  -d '{"flowScore": 0.8}'
```
→ Phone shows: **"Artemis has reinstated your bandwidth and notifications"**

## Integration with Existing Projects

### Node.js/Express Example
```javascript
const axios = require('axios');

// Function to control phone bandwidth
async function controlPhoneBandwidth(flowScore) {
    try {
        const response = await axios.post('http://localhost:3001/api/focus', {
            flowScore: flowScore
        });
        console.log('Bandwidth updated:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error updating bandwidth:', error.message);
    }
}

// Usage in your demo
async function runDemo() {
    // Block bandwidth during focused work
    await controlPhoneBandwidth(0.3);
    
    // Wait for demo segment
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Restore bandwidth
    await controlPhoneBandwidth(0.8);
}
```

### Python Example
```python
import requests

def control_phone_bandwidth(flow_score):
    """Control phone bandwidth via Artemis API"""
    try:
        response = requests.post(
            'http://localhost:3001/api/focus',
            json={'flowScore': flow_score}
        )
        print(f"Bandwidth updated: {response.json()}")
        return response.json()
    except Exception as e:
        print(f"Error: {e}")

# Usage
control_phone_bandwidth(0.3)  # Block
control_phone_bandwidth(0.8)  # Restore
```

### cURL from Any Script
```bash
#!/bin/bash

# Block bandwidth
curl -X POST http://localhost:3001/api/focus \
  -H "Content-Type: application/json" \
  -d '{"flowScore": 0.3}'

# Wait 5 seconds
sleep 5

# Restore bandwidth
curl -X POST http://localhost:3001/api/focus \
  -H "Content-Type: application/json" \
  -d '{"flowScore": 0.8}'
```

## Troubleshooting

### Service Not Responding
```bash
# Check if service is running
adb shell ps | grep flowbridge

# Check logs
adb shell logcat -d | grep -i "BootstrapServerService"

# Restart service
adb shell am start-foreground-service -n com.flowsync.flowbridge/.BootstrapServerService
```

### Port Forward Not Working
```bash
# Clear existing forwards
adb forward --remove-all

# Re-establish forward
adb forward tcp:3001 tcp:3001

# Verify forward is active
adb forward --list
```

### VPN Permission Denied
- Open the Artemis app
- Tap "Start" and grant VPN permission
- The permission persists; you won't need to do this again

### Notifications Not Showing
- Ensure notifications are enabled for Artemis in phone settings
- Go to: Settings → Apps → Artemis → Notifications → Allow
- Notifications only appear on state transitions (throttled ↔ normal)

### Phone Disconnected
```bash
# Reconnect ADB
adb kill-server
adb start-server
adb devices

# Re-establish port forward and restart service
adb forward tcp:3001 tcp:3001
adb shell am start-foreground-service -n com.flowsync.flowbridge/.BootstrapServerService
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Your Demo App (Laptop)                                │
│  - Node.js / Python / Shell Script                     │
└───────────────┬─────────────────────────────────────────┘
                │ HTTP POST http://localhost:3001/api/focus
                │ {"flowScore": 0.3}
                ▼
┌─────────────────────────────────────────────────────────┐
│  ADB Port Forward (USB Connection)                      │
│  localhost:3001 → phone:3001                            │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  Android Phone - Artemis App                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │ BootstrapServerService (port 3001)                │  │
│  │ - HTTP server for headless control               │  │
│  └───────────────┬───────────────────────────────────┘  │
│                  │ Triggers                              │
│                  ▼                                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │ ThrottleVpnService                                │  │
│  │ - Applies bandwidth throttling                    │  │
│  │ - Routes all traffic through VPN                  │  │
│  └───────────────┬───────────────────────────────────┘  │
│                  │ Updates                               │
│                  ▼                                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Notifications                                     │  │
│  │ - "Artemis has blocked..."                        │  │
│  │ - "Artemis has reinstated..."                     │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Files Reference

### Key Source Files
- `app/src/main/java/com/flowsync/flowbridge/BootstrapServerService.kt` - Headless API server
- `app/src/main/java/com/flowsync/flowbridge/ThrottleVpnService.kt` - VPN bandwidth control
- `app/src/main/java/com/flowsync/flowbridge/ThrottleManager.kt` - FlowScore → bandwidth mapping
- `app/src/main/java/com/flowsync/flowbridge/Notifications.kt` - Notification triggers
- `app/src/main/AndroidManifest.xml` - Permissions and service registration

### Configuration
- `app/build.gradle.kts` - Build configuration
- `app/src/main/res/values/strings.xml` - App name ("Artemis")

## Support

For issues or questions:
1. Check logs: `adb shell logcat -d | grep -i artemis`
2. Verify permissions are granted in the app
3. Ensure phone is connected via USB and authorized
4. Confirm ADB port forwarding is active: `adb forward --list`

## Notes
- The app must remain installed on the phone
- USB connection must remain active during demos (for API control)
- VPN permission is required and persists after initial grant
- Notifications require notification permission (Android 13+)
- The bootstrap service auto-starts on phone boot (if configured)

