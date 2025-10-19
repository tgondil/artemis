package com.flowsync.flowbridge

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log
import androidx.core.app.NotificationCompat
import java.io.FileInputStream
import java.io.FileOutputStream
import java.nio.ByteBuffer
import kotlin.concurrent.thread

/**
 * VPN Service that routes all traffic through a throttled tunnel
 */
class ThrottleVpnService : VpnService() {
    companion object {
        private const val TAG = "ThrottleVpnService"
        private const val CHANNEL_ID = "FlowBridgeVPN"
        private const val NOTIFICATION_ID = 1
        const val ACTION_START = "com.flowsync.flowbridge.START"
        const val ACTION_STOP = "com.flowsync.flowbridge.STOP"
    }
    
    private var vpnInterface: ParcelFileDescriptor? = null
    private var isRunning = false
    private var flowSyncServer: FlowSyncServer? = null
    
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        Log.i(TAG, "Service created")
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                if (!isRunning) {
                    startVpn()
                }
            }
            ACTION_STOP -> {
                stopVpn()
                stopSelf()
            }
        }
        return START_STICKY
    }
    
    private fun startVpn() {
        try {
            // Configure VPN with proper routing
            val builder = Builder()
                .setSession("FlowBridge")
                .addAddress("10.0.0.2", 32)
                .addRoute("0.0.0.0", 0)  // Route all traffic through VPN
                .addDnsServer("8.8.8.8")
                .addDnsServer("8.8.4.4")
                .setMtu(1500)
                .setBlocking(false)  // Non-blocking mode
            
            vpnInterface = builder.establish()
            
            if (vpnInterface == null) {
                Log.e(TAG, "Failed to establish VPN")
                return
            }
            
            isRunning = true
            
            // Start foreground notification
            startForeground(NOTIFICATION_ID, createNotification())
            
            // Start HTTP server
            flowSyncServer = FlowSyncServer(this)
            flowSyncServer?.start()
            
            // Start packet processing thread
            thread(start = true) {
                processPackets()
            }
            
            Log.i(TAG, "VPN started successfully")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error starting VPN", e)
            stopVpn()
        }
    }
    
    private fun stopVpn() {
        isRunning = false
        
        flowSyncServer?.stop()
        flowSyncServer = null
        
        try {
            vpnInterface?.close()
        } catch (e: Exception) {
            Log.e(TAG, "Error closing VPN interface", e)
        }
        
        vpnInterface = null
        Log.i(TAG, "VPN stopped")
    }
    
    private fun processPackets() {
        val vpn = vpnInterface ?: return
        
        val inputStream = FileInputStream(vpn.fileDescriptor)
        val outputStream = FileOutputStream(vpn.fileDescriptor)
        
        val packet = ByteArray(32767)
        var packetCount = 0
        
        try {
            while (isRunning) {
                // Read packet from TUN interface
                val length = inputStream.read(packet)
                if (length <= 0) {
                    Thread.sleep(1) // Small delay to prevent busy waiting
                    continue
                }
                
                packetCount++
                
                // Apply rate limiting
                if (!ThrottleManager.tryConsume(length.toLong())) {
                    // Rate limit exceeded - drop packet occasionally but not all
                    if (packetCount % 10 == 0) {
                        Log.d(TAG, "Packet dropped due to rate limit")
                        continue
                    }
                }
                
                // Add delay for throttling effect (only when throttling is active)
                if (ThrottleManager.isThrottling()) {
                    val delayMs = when (ThrottleManager.getRateKbps()) {
                        10000 -> 2L  // 10 MB/s - 2ms delay
                        25000 -> 1L  // 25 MB/s - 1ms delay
                        50000 -> 1L  // 50 MB/s - 1ms delay
                        else -> 0L
                    }
                    if (delayMs > 0) {
                        Thread.sleep(delayMs)
                    }
                }
                
                // Always forward the packet (don't block traffic)
                outputStream.write(packet, 0, length)
                outputStream.flush()
                
                // Log every 1000 packets
                if (packetCount % 1000 == 0) {
                    Log.d(TAG, "Processed $packetCount packets")
                }
            }
        } catch (e: Exception) {
            if (isRunning) {
                Log.e(TAG, "Error processing packets", e)
            }
        } finally {
            try {
                inputStream.close()
                outputStream.close()
            } catch (e: Exception) {
                Log.e(TAG, "Error closing streams", e)
            }
        }
    }
    
    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_IMMUTABLE
        )
        
        val mode = ThrottleManager.getModeLabel()
        val bandwidth = if (ThrottleManager.isThrottling()) {
            "${ThrottleManager.getRateKbps()} kbit/s"
        } else {
            "Unlimited"
        }
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("FlowBridge Active")
            .setContentText("$mode — $bandwidth")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }
    
    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "FlowBridge VPN",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "FlowBridge bandwidth throttling status"
        }
        
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(channel)
    }
    
    override fun onDestroy() {
        stopVpn()
        super.onDestroy()
    }
}
