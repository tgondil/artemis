# 🧠 FlowNotification Setup Guide

## 📱 Android Studio Setup (Recommended)

### Option 1: Open in Android Studio

1. **Open Android Studio**
2. **File → Open** → Navigate to `/Users/devanshkhandelwal/Documents/fall2025/artemis/FlowNotification`
3. **Click "Open"**
4. **Wait for Gradle sync** to complete
5. **Build → Make Project** (Ctrl+F9 / Cmd+F9)
6. **Run → Run 'app'** (Shift+F10 / Ctrl+R)

### Option 2: Command Line (if Android SDK is installed)

```bash
# Navigate to project
cd /Users/devanshkhandelwal/Documents/fall2025/artemis/FlowNotification

# Download Gradle wrapper JAR
mkdir -p gradle/wrapper
curl -o gradle/wrapper/gradle-wrapper.jar https://github.com/gradle/gradle/raw/v8.4.0/gradle/wrapper/gradle-wrapper.jar

# Build the app
./gradlew assembleDebug

# Install on device (if connected)
adb install app/build/outputs/apk/debug/app-debug.apk
```

## 🔧 Manual Setup Steps

### 1. Enable Developer Options on Android

1. **Settings → About Phone**
2. **Tap "Build Number" 7 times**
3. **Go back to Settings → Developer Options**
4. **Enable "USB Debugging"**

### 2. Connect Device

```bash
# Check if device is connected
adb devices

# Should show your device listed
```

### 3. Install the App

```bash
# Build and install
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

## 📱 App Configuration

### 1. Enable Notification Access

1. **Open FlowNotification app**
2. **Tap "Enable Notification Access"**
3. **Find "FlowNotification" in the list**
4. **Toggle it ON**
5. **Grant the permission**

### 2. Connect to FlowSync Server

The app automatically connects to your Mac at `http://192.168.4.153:3000`.

**Make sure:**
- ✅ Mac is running the FlowSync server
- ✅ Both devices are on the same network
- ✅ Server is accessible from phone

## 🧪 Testing the App

### 1. Test Notification Filtering

1. **Set FlowScore to 0.3** (Deep Focus) via Mac web interface
2. **Send test notifications** from WhatsApp, Instagram, etc.
3. **Check app statistics** - should show filtered notifications
4. **Set FlowScore to 0.8** (Unlimited) - all notifications should come through

### 2. Test FlowScore Integration

1. **Open the app** - should show current FlowScore
2. **Change FlowScore** via Mac web interface
3. **App should update** within 5 seconds
4. **Filtering should change** based on new FlowScore

## 🔧 Troubleshooting

### Build Issues

```bash
# Clean and rebuild
./gradlew clean
./gradlew assembleDebug

# If Gradle wrapper issues
rm -rf gradle/wrapper
# Re-download wrapper JAR as shown above
```

### Device Connection Issues

```bash
# Check ADB
adb devices

# Restart ADB
adb kill-server
adb start-server

# Check USB connection
# Try different USB cable/port
```

### App Not Filtering Notifications

1. **Check Notification Access**: Settings → Apps → FlowNotification → Permissions
2. **Check Network**: Ensure phone can reach Mac server
3. **Check Logs**: `adb logcat | grep FlowNotification`
4. **Restart App**: Force close and reopen

### Server Connection Issues

1. **Check Mac IP**: `ifconfig | grep "inet "`
2. **Check Server**: `curl http://192.168.4.153:3000/api/status`
3. **Check Firewall**: Mac firewall might be blocking connections
4. **Check Network**: Both devices must be on same WiFi

## 🎯 Expected Behavior

### FlowScore 0.8+ (Unlimited)
- ✅ All notifications allowed
- ✅ No filtering active
- ✅ App shows "Unlimited Focus"

### FlowScore 0.5-0.69 (Focus Warmup)
- 🚫 Filter distracting apps (WhatsApp, Instagram, etc.)
- ✅ Allow important apps (Phone, Messages)
- ✅ App shows "Focus Warmup"

### FlowScore 0.3-0.49 (Deep Focus)
- 🚫 Filter distracting apps
- 🚫 Filter content keywords ("sale", "like", "game")
- ✅ Allow essential notifications only
- ✅ App shows "Deep Focus"

### FlowScore < 0.3 (Extreme Focus)
- 🚫 Filter almost everything
- ✅ Only system/emergency notifications
- ✅ App shows "Extreme Focus"

## 📊 Monitoring

The app provides real-time statistics:
- **Filtered Count**: Number of notifications blocked
- **Allowed Count**: Number of notifications shown
- **Recent Notifications**: List with filtering status
- **Current FlowScore**: Live updates from server

**FlowNotification helps you maintain deep focus by intelligently filtering distractions!** 🧠📱

