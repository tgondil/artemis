# 🧠 FlowBridge — FlowSync Android Bandwidth Controller

## 1. Overview

FlowBridge is a lightweight system-level **focus-aware network throttler** for Android.
When the FlowSync backend detects a user's FlowScore drop, it sends a REST call to this Android app, which dynamically lowers the device's bandwidth using an on-device **VPN service** with a configurable rate limiter.

---

## 2. Problem Statement

Students and professionals struggle with digital distractions during work.
FlowSync measures cognitive focus in real time (via sensors, webcam, or browser activity).
However, without direct device control, focus feedback has no behavioral impact.
We need an **OS-level enforcement layer** that enforces "Focus Mode" by throttling all network activity on the user's phone.

---

## 3. Goal

Create an Android app that:

* Receives focus updates (`flowScore`) from the FlowSync backend or desktop client.
* Uses a local `VpnService` to route all traffic through a throttled tunnel.
* Dynamically adjusts speed limits (e.g., 100 kbit/s, 500 kbit/s, 1 Mbit/s) based on FlowScore thresholds.
* Provides a visible notification ("Focus Mode Active — Bandwidth Limited to 200 kbps").

---

## 4. Functional Requirements

| Feature                 | Description                                                                       | Priority |
| ----------------------- | --------------------------------------------------------------------------------- | -------- |
| REST API Listener       | Local Express/Ktor server inside the app listening on `localhost:3000/api/focus`  | High     |
| FlowScore Parsing       | Accept `{ "flowScore": float }` JSON body                                         | High     |
| Bandwidth Mapping       | Map flowScore → preset (>= 0.7 = unlimited, 0.5–0.7 = 500 kbps, < 0.5 = 200 kbps) | High     |
| VPN Service             | `VpnService` creates TUN interface routing all traffic                            | High     |
| Token Bucket Limiter    | Apply per-byte throttling according to selected preset                            | High     |
| Foreground Notification | Show current mode and speed                                                       | Medium   |
| Manual Toggle           | UI button to enable/disable throttling                                            | Medium   |
| Logging                 | Console log of all API calls and throttle changes                                 | Low      |

---

## 5. API Contract (from FlowSync)

**Endpoint:**
`POST http://<phone-ip>:3000/api/focus`

**Headers:**
`Content-Type: application/json`

**Body Example:**

```json
{
  "flowScore": 0.32
}
```

**Response:**

```json
{
  "status": "throttled",
  "flowScore": 0.32,
  "bandwidth": "200kbit",
  "message": "Focus Mode Active"
}
```

---

## 6. System Design

### 6.1 Components

* **FlowSyncBackend** — Sends FlowScore updates over Wi-Fi to the phone.
* **FlowBridge** — Receives updates, applies throttling.
* **ThrottleVpnService** — Handles network routing and enforcement.

### 6.2 Data Flow

1. FlowSyncBackend → POST `/api/focus`
2. Local server parses FlowScore.
3. App computes target bandwidth.
4. App (re)configures VPN service → updates TokenBucket rate.
5. Traffic is shaped in real time.
6. Notification shows new state.

### 6.3 Threading Model

* Main thread: UI, notification updates.
* Service thread: handles TUN read/write loop.
* API thread: lightweight HTTP server (Ktor).

---

## 7. Technical Stack

| Layer              | Technology                              |
| ------------------ | --------------------------------------- |
| Android Networking | Kotlin + VpnService                     |
| Rate Limiting      | Custom TokenBucket algorithm            |
| Local API          | Ktor embedded HTTP server               |
| Storage            | SharedPreferences (save last FlowScore) |
| UI                 | Jetpack Compose or XML                  |
| Testing            | fast.com, wget, cURL                    |

---

## 8. FlowScore → Bandwidth Mapping

| FlowScore | Bandwidth  | Label           |
| --------- | ---------- | --------------- |
| ≥ 0.7     | Unlimited  | "Normal Mode"   |
| 0.5–0.69  | 500 kbit/s | "Focus Warmup"  |
| 0.3–0.49  | 200 kbit/s | "Deep Focus"    |
| < 0.3     | 100 kbit/s | "Extreme Focus" |

---

## 9. User Flow

1. User installs FlowBridge and grants VPN permission.
2. On first launch, VPN is idle ("Normal Mode").
3. FlowSync backend POSTs FlowScore = 0.3 → app throttles to 200 kbit/s.
4. User receives "Focus Mode Active" notification.
5. FlowScore rises above 0.7 → throttling disabled; VPN remains idle.

---

## 10. Future Enhancements

* Per-app throttling (VPN `addAllowedApplication`).
* Focus analytics dashboard.
* Cloud-controlled profiles.
* Multi-device sync via MQTT.

---

## 11. Acceptance Criteria

✅ App builds & runs on Android 13+.
✅ API call updates speed within 3 s.
✅ fast.com reflects new limit.
✅ User can toggle manually.
✅ VPN reconnects automatically on crash.

---

## 12. Project Structure

```
FlowBridge/
├── app/
│   ├── src/main/
│   │   ├── java/com/flowsync/flowbridge/
│   │   │   ├── MainActivity.kt
│   │   │   ├── ThrottleVpnService.kt
│   │   │   ├── TokenBucket.kt
│   │   │   ├── FlowSyncServer.kt
│   │   │   └── ThrottleManager.kt
│   │   ├── res/
│   │   └── AndroidManifest.xml
│   ├── build.gradle.kts
│   └── proguard-rules.pro
├── gradle/
├── build.gradle.kts
├── settings.gradle.kts
└── README.md
```

---

## 13. Quick Start

```bash
# 1. Open project in Android Studio
# 2. Sync Gradle dependencies
# 3. Build and run on device/emulator
# 4. Grant VPN permission when prompted
# 5. Test API:
curl -X POST http://<PHONE_IP>:3000/api/focus \
  -H "Content-Type: application/json" \
  -d '{"flowScore": 0.3}'
```

---

**FlowBridge: Where Focus Meets Control** 🧠📱

