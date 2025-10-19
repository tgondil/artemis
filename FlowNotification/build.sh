#!/bin/bash

echo "🧠 Building FlowNotification Android App..."

# Check if Android SDK is available
if ! command -v adb &> /dev/null; then
    echo "❌ Android SDK not found. Please install Android Studio or Android SDK."
    exit 1
fi

# Build the app
echo "📱 Building APK..."
./gradlew assembleDebug

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📦 APK location: app/build/outputs/apk/debug/app-debug.apk"
    
    # Check if device is connected
    if adb devices | grep -q "device$"; then
        echo "📱 Installing on connected device..."
        adb install app/build/outputs/apk/debug/app-debug.apk
        if [ $? -eq 0 ]; then
            echo "✅ App installed successfully!"
            echo "🎯 Open the app and enable notification access in Settings"
        else
            echo "❌ Installation failed"
        fi
    else
        echo "📱 No device connected. Install manually:"
        echo "   adb install app/build/outputs/apk/debug/app-debug.apk"
    fi
else
    echo "❌ Build failed"
    exit 1
fi

