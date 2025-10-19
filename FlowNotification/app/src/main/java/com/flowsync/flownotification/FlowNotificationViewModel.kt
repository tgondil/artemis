package com.flowsync.flownotification

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.provider.Settings
import androidx.compose.runtime.*
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

data class NotificationInfo(
    val appName: String,
    val title: String,
    val text: String,
    val wasFiltered: Boolean,
    val timestamp: Long = System.currentTimeMillis()
)

data class FlowNotificationUiState(
    val flowScore: Float = 1.0f,
    val isNotificationAccessEnabled: Boolean = false,
    val isFilteringActive: Boolean = false,
    val filteredCount: Int = 0,
    val allowedCount: Int = 0,
    val recentNotifications: List<NotificationInfo> = emptyList()
)

class FlowNotificationViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(FlowNotificationUiState())
    val uiState: StateFlow<FlowNotificationUiState> = _uiState.asStateFlow()

    private var flowScoreApiUrl = "http://192.168.4.153:3000" // Your Mac's IP
    private var isApiConnected = false

    init {
        startFlowScoreMonitoring()
    }

    private fun startFlowScoreMonitoring() {
        viewModelScope.launch {
            while (true) {
                try {
                    fetchFlowScore()
                    delay(5000) // Check every 5 seconds
                } catch (e: Exception) {
                    // Handle connection errors
                    delay(10000) // Wait longer on error
                }
            }
        }
    }

    private suspend fun fetchFlowScore() {
        try {
            val url = URL("$flowScoreApiUrl/api/status")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 5000
            connection.readTimeout = 5000

            if (connection.responseCode == HttpURLConnection.HTTP_OK) {
                val response = connection.inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(response)
                val flowScore = json.getDouble("flowScore").toFloat()
                
                _uiState.value = _uiState.value.copy(
                    flowScore = flowScore,
                    isFilteringActive = flowScore < 0.7f
                )
                isApiConnected = true
            }
        } catch (e: Exception) {
            // Connection failed, use default values
            isApiConnected = false
        }
    }

    fun setFlowScore(flowScore: Float) {
        viewModelScope.launch {
            try {
                val url = URL("$flowScoreApiUrl/api/focus")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true

                val json = JSONObject().apply {
                    put("flowScore", flowScore)
                }

                connection.outputStream.use { outputStream ->
                    outputStream.write(json.toString().toByteArray())
                }

                if (connection.responseCode == HttpURLConnection.HTTP_OK) {
                    _uiState.value = _uiState.value.copy(
                        flowScore = flowScore,
                        isFilteringActive = flowScore < 0.7f
                    )
                }
            } catch (e: Exception) {
                // Handle error
            }
        }
    }

    fun updateNotificationAccessStatus(context: Context) {
        val isEnabled = Settings.Secure.getString(
            context.contentResolver,
            "enabled_notification_listeners"
        )?.contains("com.flowsync.flownotification") == true

        _uiState.value = _uiState.value.copy(
            isNotificationAccessEnabled = isEnabled
        )
    }
    
    fun updateStatsFromPrefs(context: Context) {
        val prefs = context.getSharedPreferences("FlowNotificationPrefs", Context.MODE_PRIVATE)
        val filteredCount = prefs.getInt("filtered_count", 0)
        val allowedCount = prefs.getInt("allowed_count", 0)
        
        _uiState.value = _uiState.value.copy(
            filteredCount = filteredCount,
            allowedCount = allowedCount
        )
    }

    fun addNotification(notification: NotificationInfo) {
        val currentState = _uiState.value
        val updatedRecent = (listOf(notification) + currentState.recentNotifications).take(10)
        
        val updatedFilteredCount = if (notification.wasFiltered) {
            currentState.filteredCount + 1
        } else {
            currentState.filteredCount
        }
        
        val updatedAllowedCount = if (!notification.wasFiltered) {
            currentState.allowedCount + 1
        } else {
            currentState.allowedCount
        }

        _uiState.value = currentState.copy(
            recentNotifications = updatedRecent,
            filteredCount = updatedFilteredCount,
            allowedCount = updatedAllowedCount
        )
    }

    fun clearRecentNotifications() {
        _uiState.value = _uiState.value.copy(
            recentNotifications = emptyList()
        )
    }
}
