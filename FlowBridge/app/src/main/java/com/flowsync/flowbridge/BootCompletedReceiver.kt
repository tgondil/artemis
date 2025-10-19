package com.flowsync.flowbridge

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootCompletedReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            try {
                val serviceIntent = Intent(context, BootstrapServerService::class.java)
                context.startService(serviceIntent)
                Log.i("BootCompletedReceiver", "Started BootstrapServerService")
            } catch (e: Exception) {
                Log.e("BootCompletedReceiver", "Failed to start BootstrapServerService", e)
            }
        }
    }
}


