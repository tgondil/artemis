package com.flowsync.flowbridge

import android.content.Context
import android.util.Log
import kotlinx.coroutines.*
import java.net.ServerSocket
import java.net.Socket
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.io.StringWriter
import org.json.JSONObject
import org.json.JSONException

/**
 * Simple HTTP server that receives FlowScore updates from FlowSync backend
 */
class FlowSyncServer(
    private val context: Context,
    private val port: Int = 3000
) {
    private val TAG = "FlowSyncServer"
    private var serverSocket: ServerSocket? = null
    private var isRunning = false
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    /**
     * Start the HTTP server
     */
    fun start() {
        scope.launch {
            try {
                serverSocket = ServerSocket(port)
                isRunning = true
                Log.i(TAG, "🚀 FlowSync Server started on port $port")
                
                while (isRunning) {
                    try {
                        val clientSocket = serverSocket?.accept()
                        clientSocket?.let { socket ->
                            launch {
                                handleClient(socket)
                            }
                        }
                    } catch (e: Exception) {
                        if (isRunning) {
                            Log.e(TAG, "Error accepting connection", e)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start server", e)
            }
        }
    }
    
    /**
     * Handle client request
     */
    private suspend fun handleClient(socket: Socket) {
        try {
            val reader = BufferedReader(InputStreamReader(socket.getInputStream()))
            val writer = PrintWriter(socket.getOutputStream(), true)
            
            val request = reader.readLine()
            Log.d(TAG, "Request: $request")
            
            if (request?.startsWith("POST /api/focus") == true) {
                // Read headers to find content length
                var contentLength = 0
                var line: String?
                while (reader.readLine().also { line = it } != null && line != "") {
                    if (line?.startsWith("Content-Length:", ignoreCase = true) == true) {
                        contentLength = line?.substringAfter(":")?.trim()?.toIntOrNull() ?: 0
                    }
                }
                
                // Read JSON body
                val body = CharArray(contentLength)
                reader.read(body, 0, contentLength)
                val jsonBody = String(body)
                
                try {
                    val json = JSONObject(jsonBody)
                    val flowScore = json.getDouble("flowScore").toFloat()

                    // Ensure VPN service is active; if not, start it
                    if (!ThrottleVpnService.isActive) {
                        val intent = android.content.Intent(context, ThrottleVpnService::class.java)
                        intent.action = ThrottleVpnService.ACTION_START
                        context.startService(intent)
                    }
                    
                    // Validate FlowScore
                    if (flowScore < 0f || flowScore > 1f) {
                        sendJsonResponse(writer, mapOf("error" to "Invalid flowScore. Must be between 0 and 1."))
                        return
                    }
                    
                    // Update throttling
                    val wasThrottling = ThrottleManager.isThrottling()
                    ThrottleManager.updateFlowScore(flowScore)
                    val isThrottlingNow = ThrottleManager.isThrottling()
                    if (isThrottlingNow && !wasThrottling) {
                        Notifications.showThrottleApplied(context, "${ThrottleManager.getRateKbps()} kbit/s")
                    } else if (!isThrottlingNow && wasThrottling) {
                        Notifications.showThrottleRestored(context)
                    }
                    
                    // Prepare response
                    val status = if (ThrottleManager.isThrottling()) "throttled" else "normal"
                    val bandwidth = if (ThrottleManager.isThrottling()) {
                        "${ThrottleManager.getRateKbps()}kbit"
                    } else {
                        "unlimited"
                    }
                    
                    val response = mapOf(
                        "status" to status,
                        "flowScore" to flowScore,
                        "bandwidth" to bandwidth,
                        "mode" to "android",
                        "message" to ThrottleManager.getModeLabel()
                    )
                    
                    Log.i(TAG, "FlowScore update: $flowScore → ${ThrottleManager.getModeLabel()}")
                    sendJsonResponse(writer, response)
                    
                } catch (e: JSONException) {
                    Log.e(TAG, "Error parsing JSON", e)
                    sendJsonResponse(writer, mapOf("error" to "Invalid JSON"))
                }
                
            } else if (request?.startsWith("GET /api/status") == true) {
                // Skip headers
                while (reader.readLine() != null && reader.readLine() != "") {
                    // Skip headers
                }
                
                val response = mapOf(
                    "running" to true,
                    "mode" to "android",
                    "flowScore" to ThrottleManager.getFlowScore(),
                    "throttling" to ThrottleManager.isThrottling(),
                    "bandwidth" to "${ThrottleManager.getRateKbps()}kbit"
                )
                sendJsonResponse(writer, response)
            } else {
                sendJsonResponse(writer, mapOf("error" to "Not found"))
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error handling client", e)
        } finally {
            socket.close()
        }
    }
    
    /**
     * Send JSON response
     */
    private fun sendJsonResponse(writer: PrintWriter, data: Map<String, Any>) {
        val json = JSONObject(data).toString()
        writer.println("HTTP/1.1 200 OK")
        writer.println("Content-Type: application/json")
        writer.println("Content-Length: ${json.length}")
        writer.println("Connection: close")
        writer.println()
        writer.println(json)
    }
    
    /**
     * Stop the HTTP server
     */
    fun stop() {
        isRunning = false
        serverSocket?.close()
        scope.cancel()
        Log.i(TAG, "Server stopped")
    }
}
