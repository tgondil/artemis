# 🧠 FlowNotification - Smart Notification Filtering

An Android app that intelligently filters notifications based on your FlowScore to help maintain focus during deep work sessions.

## 🎯 Features

- **FlowScore Integration**: Connects to your FlowSync backend to receive real-time FlowScore updates
- **Smart Filtering**: Automatically filters distracting notifications based on focus level
- **Customizable Rules**: Define which apps and content types to filter
- **Real-time Monitoring**: Live updates of notification filtering status
- **Focus Modes**: Different filtering levels for different focus states

## 📱 How It Works

### FlowScore-Based Filtering

| FlowScore Range | Mode | Filtering Level |
|----------------|------|-----------------|
| `≥ 0.7` | 🚀 Unlimited Focus | Allow all notifications |
| `0.5 - 0.69` | ⚡ Focus Warmup | Filter distracting apps |
| `0.3 - 0.49` | 🎯 Deep Focus | Filter apps + content keywords |
| `< 0.3` | 🔥 Extreme Focus | Only essential notifications |

### Filtering Rules

**Distracting Apps (filtered during focus):**
- WhatsApp, Facebook, Instagram, Twitter, Snapchat, TikTok
- LinkedIn, Reddit, Discord, Spotify, Netflix, YouTube
- Shopping apps (Amazon, eBay), Dating apps, Games

**Important Apps (always allowed):**
- Phone, Messages, System UI, Settings, Contacts
- Google Services, Emergency apps

**Content Keywords (filtered during deep focus):**
- Sales: "sale", "discount", "offer", "deal"
- Social: "like", "follow", "share", "comment"
- Entertainment: "game", "play", "win", "prize"
- Shopping: "buy", "cart", "checkout", "order"

## 🛠️ Setup

### 1. Build the App

```bash
cd /Users/devanshkhandelwal/Documents/fall2025/artemis/FlowNotification
./gradlew assembleDebug
```

### 2. Install on Android

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 3. Enable Notification Access

1. Open the FlowNotification app
2. Tap "Enable Notification Access"
3. Find "FlowNotification" in the list
4. Toggle it ON
5. Grant the permission

### 4. Connect to FlowSync Backend

The app automatically connects to your Mac's FlowSync server at `http://192.168.4.153:3000`. Make sure:

1. Your Mac is running the FlowSync server
2. Both devices are on the same network
3. The server is accessible from your phone

## 🎮 Usage

### Main Interface

- **FlowScore Display**: Shows current focus level and mode
- **Notification Status**: Shows filtering statistics
- **Flow Controls**: Quick buttons to set different focus levels
- **Recent Notifications**: Shows which notifications were filtered/allowed

### Focus Modes

- **🚀 Unlimited (0.8)**: All notifications allowed
- **⚡ Focus Warmup (0.6)**: Filter distracting apps
- **🎯 Deep Focus (0.4)**: Filter apps + content
- **🔥 Extreme Focus (0.2)**: Only essential notifications

### API Integration

The app connects to your FlowSync backend:

```bash
# Check status
curl http://192.168.4.153:3000/api/status

# Set FlowScore (triggers notification filtering)
curl -X POST http://192.168.4.153:3000/api/focus \
  -H "Content-Type: application/json" \
  -d '{"flowScore": 0.3}'
```

## 🔧 Customization

### Adding Distracting Apps

Edit `FlowNotificationService.kt`:

```kotlin
private val DISTRACTING_APPS = setOf(
    "com.whatsapp",
    "com.facebook.katana",
    "com.instagram.android",
    // Add your distracting apps here
    "com.your.distracting.app"
)
```

### Adding Content Keywords

Edit the `DISTRACTING_KEYWORDS` set:

```kotlin
private val DISTRACTING_KEYWORDS = setOf(
    "sale", "discount", "offer",
    // Add your distracting keywords here
    "your", "distracting", "keywords"
)
```

### Changing Server URL

Update the API URL in `FlowNotificationService.kt`:

```kotlin
private val flowScoreApiUrl = "http://YOUR_MAC_IP:3000"
```

## 📊 Monitoring

The app provides real-time statistics:

- **Filtered Count**: Number of notifications blocked
- **Allowed Count**: Number of notifications shown
- **Recent Notifications**: List of recent notifications with filtering status
- **FlowScore**: Current focus level from FlowSync backend

## 🚨 Troubleshooting

### App Not Filtering Notifications

1. **Check Notification Access**: Make sure it's enabled in Settings
2. **Check Network**: Ensure phone can reach the FlowSync server
3. **Check FlowScore**: Verify the server is sending valid FlowScore values
4. **Check Logs**: Use `adb logcat` to see filtering activity

### Server Connection Issues

1. **Check IP Address**: Make sure the Mac's IP is correct
2. **Check Server**: Ensure FlowSync server is running
3. **Check Network**: Both devices must be on the same network
4. **Check Firewall**: Mac firewall might be blocking connections

### Notifications Still Coming Through

1. **Check App List**: Make sure the app is in the distracting apps list
2. **Check Content**: Some notifications might not match keywords
3. **Check System**: Some system notifications can't be filtered
4. **Check Permissions**: Ensure all required permissions are granted

## 🔒 Privacy & Security

- **No Data Storage**: App doesn't store notification content
- **Local Processing**: All filtering happens on your device
- **No Cloud Sync**: No data is sent to external servers
- **Minimal Permissions**: Only requests necessary permissions

## 🎯 Use Cases

### Deep Work Sessions

1. Set FlowScore to 0.3 (Deep Focus)
2. App filters out social media, shopping, entertainment notifications
3. Only essential notifications (calls, messages) come through
4. Maintain focus without missing important communications

### Focus Warmup

1. Set FlowScore to 0.6 (Focus Warmup)
2. App filters out most distracting apps
3. Some notifications still allowed for gradual transition
4. Good for easing into focus mode

### Extreme Focus

1. Set FlowScore to 0.1 (Extreme Focus)
2. App filters almost everything except essential system notifications
3. Maximum focus with minimal distractions
4. Use for critical work sessions

## 🚀 Future Enhancements

- **Custom Rules**: User-defined filtering rules
- **Time-based Filtering**: Different rules for different times
- **App Whitelist**: Allow specific apps during focus
- **Notification Summaries**: Batch notifications for review
- **Focus Analytics**: Track focus patterns and improvements

**FlowNotification helps you maintain deep focus by intelligently filtering distractions while keeping you connected to what matters most!** 🧠📱

