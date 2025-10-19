package com.flowsync.flownotification

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import android.content.SharedPreferences

class FlowNotificationService : NotificationListenerService() {
    companion object {
        private const val TAG = "FlowNotificationService"
        private const val PREFS_NAME = "FlowNotificationPrefs"
        private const val KEY_FILTERED_COUNT = "filtered_count"
        private const val KEY_ALLOWED_COUNT = "allowed_count"
        
        // Distracting app packages (you can customize this list)
        private val DISTRACTING_APPS = setOf(
            "com.whatsapp",
            "com.facebook.katana",
            "com.instagram.android",
            "com.twitter.android",
            "com.snapchat.android",
            "com.tiktok",
            "com.linkedin.android",
            "com.reddit.frontpage",
            "com.discord",
            "com.spotify.music",
            "com.netflix.mediaclient",
            "com.youtube.app",
            "com.amazon.mShop.android.shopping",
            "com.ebay.mobile",
            "com.slack"
        )
        
        // Important app packages (always allow these)
        private val IMPORTANT_APPS = setOf(
            "com.android.phone",
            "com.android.mms",
            "com.android.systemui",
            "com.google.android.gms",
            "com.android.settings",
            "com.android.dialer",
            "com.android.contacts"
        )
        
        // Distracting keywords in notification content
        private val DISTRACTING_KEYWORDS = setOf(
            "sale", "discount", "offer", "deal", "promotion",
            "like", "follow", "share", "comment", "mention",
            "game", "play", "win", "prize", "contest",
            "dating", "match", "swipe", "chat", "message",
            "shopping", "buy", "cart", "checkout", "order"
        )
    }
    
    private var currentFlowScore = 1.0f
    private var isFilteringActive = false
    private lateinit var prefs: SharedPreferences
    private val processedNotifications = mutableSetOf<String>()
    
    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "FlowNotificationService created")
        
        // Initialize SharedPreferences
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        
        // Start monitoring FlowScore
        startFlowScoreMonitoring()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.i(TAG, "FlowNotificationService destroyed")
    }
    
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        
        sbn?.let { notification ->
            // Create a unique key for this notification to prevent duplicates
            val notificationKey = "${notification.packageName}_${notification.postTime}_${notification.id}"
            
            // Skip if we've already processed this notification
            if (processedNotifications.contains(notificationKey)) {
                Log.d(TAG, "Skipping duplicate notification: $notificationKey")
                return
            }
            
            // Add to processed set
            processedNotifications.add(notificationKey)
            
            // Clean up old entries (keep only last 100)
            if (processedNotifications.size > 100) {
                val toRemove = processedNotifications.take(processedNotifications.size - 100)
                processedNotifications.removeAll(toRemove)
            }
            
            val shouldFilter = shouldFilterNotification(notification)
            val appName = getAppName(notification.packageName)
            val title = getNotificationTitle(notification.notification)
            
            Log.d(TAG, "Notification from $appName: $title - Filtered: $shouldFilter")
            
            // Update statistics in SharedPreferences
            updateNotificationStats(shouldFilter)
            
            // Actually filter the notification if needed
            if (shouldFilter) {
                cancelNotification(notification.key)
            }
        }
    }
    
    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
        Log.d(TAG, "Notification removed: ${sbn?.packageName}")
    }
    
    private fun shouldFilterNotification(notification: StatusBarNotification): Boolean {
        val packageName = notification.packageName
        
        // Always allow important apps
        if (IMPORTANT_APPS.contains(packageName)) {
            return false
        }
        
        // If FlowScore is high (unlimited focus), allow all notifications
        if (currentFlowScore >= 0.7f) {
            return false
        }
        
        // If FlowScore is medium (focus warmup), filter some distracting apps
        if (currentFlowScore >= 0.5f) {
            return DISTRACTING_APPS.contains(packageName)
        }
        
        // If FlowScore is low (deep/extreme focus), filter more aggressively
        if (currentFlowScore >= 0.3f) {
            // Filter distracting apps and check content
            return DISTRACTING_APPS.contains(packageName) || 
                   isDistractingContent(notification.notification)
        }
        
        // Extreme focus - filter almost everything except essential apps
        return !IMPORTANT_APPS.contains(packageName)
    }
    
    private fun isDistractingContent(notification: Notification): Boolean {
        val title = getNotificationTitle(notification)
        val text = getNotificationText(notification)
        
        val content = "$title $text".lowercase()
        
        return DISTRACTING_KEYWORDS.any { keyword ->
            content.contains(keyword.lowercase())
        }
    }
    
    private fun getAppName(packageName: String): String {
        return try {
            val packageManager = packageManager
            val appInfo = packageManager.getApplicationInfo(packageName, 0)
            packageManager.getApplicationLabel(appInfo).toString()
        } catch (e: Exception) {
            packageName
        }
    }
    
    private fun getNotificationTitle(notification: Notification): String {
        return notification.extras?.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
    }
    
    private fun getNotificationText(notification: Notification): String {
        return notification.extras?.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
    }
    
    private fun startFlowScoreMonitoring() {
        CoroutineScope(Dispatchers.IO).launch {
            while (true) {
                try {
                    fetchFlowScore()
                    kotlinx.coroutines.delay(5000) // Check every 5 seconds
                } catch (e: Exception) {
                    Log.e(TAG, "Error fetching FlowScore", e)
                    kotlinx.coroutines.delay(10000) // Wait longer on error
                }
            }
        }
    }
    
    private fun updateNotificationStats(wasFiltered: Boolean) {
        val editor = prefs.edit()
        if (wasFiltered) {
            val currentFiltered = prefs.getInt(KEY_FILTERED_COUNT, 0)
            editor.putInt(KEY_FILTERED_COUNT, currentFiltered + 1)
        } else {
            val currentAllowed = prefs.getInt(KEY_ALLOWED_COUNT, 0)
            editor.putInt(KEY_ALLOWED_COUNT, currentAllowed + 1)
        }
        editor.apply()
    }
    
    private suspend fun fetchFlowScore() {
        try {
            val url = java.net.URL("http://192.168.4.153:3000/api/status")
            val connection = url.openConnection() as java.net.HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 5000
            connection.readTimeout = 5000
            
            if (connection.responseCode == java.net.HttpURLConnection.HTTP_OK) {
                val response = connection.inputStream.bufferedReader().use { it.readText() }
                val json = org.json.JSONObject(response)
                
                // For now, use throttling status to determine FlowScore
                // If throttling is true, assume deep focus (0.3), otherwise unlimited (1.0)
                currentFlowScore = if (json.getBoolean("throttling")) {
                    0.3f  // Deep focus mode
                } else {
                    1.0f  // Unlimited mode
                }
                isFilteringActive = currentFlowScore < 0.7f
                
                Log.d(TAG, "FlowScore updated: $currentFlowScore, Filtering: $isFilteringActive")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to fetch FlowScore", e)
            // Default to deep focus on error for testing
            currentFlowScore = 0.3f
            isFilteringActive = true
        }
    }
}
