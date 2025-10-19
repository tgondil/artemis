package com.flowsync.flowbridge

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.ServerSocket
import java.net.Socket

/**
 * Lightweight HTTP server service to allow headless control of FlowBridge.
 * Exposes:
 * - POST /api/start
 * - POST /api/stop
 * - GET  /api/status
 * - POST /api/focus { flowScore: number }
 */
class BootstrapServerService : Service() {
    private val TAG = "BootstrapServerService"
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var serverSocket: ServerSocket? = null
    private var isRunning: Boolean = false
    private val port: Int = 3001 // separate from FlowSyncServer(3000) used once VPN is up

    override fun onCreate() {
        super.onCreate()
        startServer()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Promote to foreground immediately when started as foreground service
        startForeground(1002, Notifications.createPersistent(this))
        if (!isRunning) startServer()
        return START_STICKY
    }

    override fun onDestroy() {
        stopServer()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun startServer() {
        scope.launch {
            try {
                // Force IPv4 by setting system property
                System.setProperty("java.net.preferIPv4Stack", "true")
                serverSocket = ServerSocket(port, 50, java.net.Inet4Address.getByName("0.0.0.0"))
                isRunning = true
                Log.i(TAG, "Bootstrap server listening on 0.0.0.0:$port")
                while (isRunning) {
                    try {
                        val client = serverSocket?.accept()
                        if (client != null) {
                            launch { handleClient(client) }
                        }
                    } catch (e: Exception) {
                        if (isRunning) Log.e(TAG, "Accept failed", e)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to bind bootstrap server", e)
            }
        }
    }

    private fun stopServer() {
        isRunning = false
        try { serverSocket?.close() } catch (_: Exception) {}
        serverSocket = null
        scope.cancel()
        Log.i(TAG, "Bootstrap server stopped")
    }

    private fun handleClient(socket: Socket) {
        socket.use { s ->
            try {
                val reader = BufferedReader(InputStreamReader(s.getInputStream()))
                val writer = PrintWriter(s.getOutputStream(), true)

                val requestLine = reader.readLine() ?: return
                Log.d(TAG, "Request: $requestLine")

                var contentLength = 0
                var line: String?
                while (reader.readLine().also { line = it } != null && line != "") {
                    if (line?.startsWith("Content-Length:", ignoreCase = true) == true) {
                        contentLength = line?.substringAfter(":")?.trim()?.toIntOrNull() ?: 0
                    }
                }

                val path = requestLine.split(" ").getOrNull(1) ?: "/"
                val method = requestLine.split(" ").getOrNull(0) ?: "GET"

                fun sendJson(data: Map<String, Any>) {
                    val json = JSONObject(data).toString()
                    writer.println("HTTP/1.1 200 OK")
                    writer.println("Content-Type: application/json")
                    writer.println("Content-Length: ${json.length}")
                    writer.println("Connection: close")
                    writer.println()
                    writer.println(json)
                }

                if (method == "POST" && path == "/api/start") {
                    // Start VPN service
                    val intent = Intent(this, ThrottleVpnService::class.java).apply {
                        action = ThrottleVpnService.ACTION_START
                    }
                    startService(intent)
                    sendJson(mapOf("status" to "starting"))
                    return
                }

                if (method == "POST" && path == "/api/stop") {
                    val intent = Intent(this, ThrottleVpnService::class.java).apply {
                        action = ThrottleVpnService.ACTION_STOP
                    }
                    startService(intent)
                    sendJson(mapOf("status" to "stopping"))
                    return
                }

                if (method == "GET" && path == "/api/status") {
                    val response = mapOf(
                        "running" to true,
                        "vpnActive" to true, // cannot easily introspect; assume active once started
                        "flowScore" to ThrottleManager.getFlowScore(),
                        "throttling" to ThrottleManager.isThrottling(),
                        "bandwidth" to "${ThrottleManager.getRateKbps()}kbit"
                    )
                    sendJson(response)
                    return
                }

                if (method == "POST" && path == "/api/focus") {
                    val bodyChars = CharArray(contentLength)
                    if (contentLength > 0) reader.read(bodyChars, 0, contentLength)
                    val body = String(bodyChars)
                    try {
                        val json = JSONObject(body)
                        val flowScore = json.getDouble("flowScore").toFloat()
                        // Ensure VPN running before applying
                        if (!ThrottleVpnService.isActive) {
                            val intent = Intent(this, ThrottleVpnService::class.java).apply {
                                action = ThrottleVpnService.ACTION_START
                            }
                            startService(intent)
                        }
                        val wasThrottling = ThrottleManager.isThrottling()
                        ThrottleManager.updateFlowScore(flowScore)
                        val isThrottlingNow = ThrottleManager.isThrottling()
                        if (isThrottlingNow && !wasThrottling) {
                            Notifications.showThrottleApplied(this, "${ThrottleManager.getRateKbps()} kbit/s")
                        } else if (!isThrottlingNow && wasThrottling) {
                            Notifications.showThrottleRestored(this)
                        }
                        sendJson(mapOf(
                            "ok" to true,
                            "flowScore" to flowScore,
                            "bandwidth" to "${ThrottleManager.getRateKbps()}kbit"
                        ))
                    } catch (e: Exception) {
                        sendJson(mapOf("error" to "Invalid JSON"))
                    }
                    return
                }

                sendJson(mapOf("error" to "Not found"))
            } catch (e: Exception) {
                Log.e(TAG, "Handle client error", e)
            }
        }
    }
}


