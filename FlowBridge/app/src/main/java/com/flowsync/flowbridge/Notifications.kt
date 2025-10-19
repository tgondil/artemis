package com.flowsync.flowbridge

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import androidx.core.app.NotificationCompat

object Notifications {
    private const val CHANNEL_ID = "FlowBridgeBootstrap"
    private const val EVENT_CHANNEL_ID = "FlowBridgeEvents"

    private fun ensureChannel(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            CHANNEL_ID,
            "FlowBridge Control",
            NotificationManager.IMPORTANCE_LOW
        )
        manager.createNotificationChannel(channel)
    }

    fun createPersistent(context: Context): Notification {
        ensureChannel(context)
        return NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle("Artemis")
            .setContentText("Bootstrap server active on :3001")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .build()
    }

    private fun ensureEventChannel(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            EVENT_CHANNEL_ID,
            "FlowBridge Events",
            NotificationManager.IMPORTANCE_HIGH
        )
        manager.createNotificationChannel(channel)
    }

    fun showThrottleApplied(context: Context, bandwidthLabel: String) {
        ensureEventChannel(context)
        val notification = NotificationCompat.Builder(context, EVENT_CHANNEL_ID)
            .setContentTitle("Artemis")
            .setContentText("Artemis has blocked your bandwidth and notifications")
            .setSmallIcon(android.R.drawable.stat_sys_warning)
            .setAutoCancel(true)
            .build()
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.notify(2001, notification)
    }

    fun showThrottleRestored(context: Context) {
        ensureEventChannel(context)
        val notification = NotificationCompat.Builder(context, EVENT_CHANNEL_ID)
            .setContentTitle("Artemis")
            .setContentText("Artemis has reinstated your bandwidth and notifications")
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setAutoCancel(true)
            .build()
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.notify(2002, notification)
    }
}


