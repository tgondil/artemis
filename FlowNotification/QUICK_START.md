# 🚀 FlowNotification Quick Start

## 🎯 Easiest Method: Android Studio

### 1. Open in Android Studio
```bash
# Open Android Studio
# File → Open → Navigate to:
/Users/devanshkhandelwal/Documents/fall2025/artemis/FlowNotification
```

### 2. Build and Run
- **Build → Make Project** (Ctrl+F9 / Cmd+F9)
- **Run → Run 'app'** (Shift+F10 / Ctrl+R)
- **Select your Android device** when prompted

## 📱 Alternative: Manual APK Creation

If you have Android SDK installed:

```bash
# Navigate to project
cd /Users/devanshkhandelwal/Documents/fall2025/artemis/FlowNotification

# Try building with system Gradle
gradle assembleDebug

# Or use Android Studio's Gradle
# Open Android Studio → Terminal → Run:
./gradlew assembleDebug
```

## 🔧 App Setup (After Installation)

### 1. Enable Notification Access
1. **Open FlowNotification app**
2. **Tap "Enable Notification Access"**
3. **Settings → Apps → FlowNotification → Permissions**
4. **Toggle "Notification Access" ON**

### 2. Connect to FlowSync Server
- App automatically connects to `http://192.168.4.153:3000`
- Make sure your Mac is running the FlowSync server
- Both devices must be on the same network

## 🧪 Test the App

### 1. Test Notification Filtering
1. **Set FlowScore to 0.3** (Deep Focus) via Mac web interface
2. **Send test notifications** from WhatsApp, Instagram, etc.
3. **Check app statistics** - should show filtered notifications

### 2. Test FlowScore Integration
1. **Open the app** - should show current FlowScore
2. **Change FlowScore** via Mac web interface
3. **App should update** within 5 seconds

## 🎯 Expected Behavior

| FlowScore | Mode | Filtering |
|-----------|------|-----------|
| ≥ 0.7 | 🚀 Unlimited | All notifications allowed |
| 0.5-0.69 | ⚡ Focus Warmup | Filter distracting apps |
| 0.3-0.49 | 🎯 Deep Focus | Filter apps + content |
| < 0.3 | 🔥 Extreme Focus | Only essential notifications |

## 🔧 Troubleshooting

### Build Issues
- **Use Android Studio** (recommended)
- **Check Android SDK** is installed
- **Try different Gradle version**

### App Not Working
- **Check Notification Access** is enabled
- **Check network connection** to Mac
- **Check FlowSync server** is running
- **Check device logs**: `adb logcat | grep FlowNotification`

### Server Connection Issues
- **Check Mac IP**: `ifconfig | grep "inet "`
- **Check server**: `curl http://192.168.4.153:3000/api/status`
- **Check firewall** settings on Mac

## 📊 What the App Does

1. **Monitors FlowScore** from your Mac every 5 seconds
2. **Intercepts notifications** using Android's NotificationListenerService
3. **Filters based on rules**:
   - **Distracting Apps**: WhatsApp, Instagram, Facebook, Twitter, TikTok, etc.
   - **Important Apps**: Phone, Messages, System UI (always allowed)
   - **Content Keywords**: "sale", "like", "game", "buy", etc.
4. **Shows statistics** of filtered vs allowed notifications
5. **Real-time updates** when FlowScore changes

**The app helps you maintain deep focus by intelligently filtering distracting notifications!** 🧠📱

