package com.flowsync.flownotification

import android.app.NotificationManager
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            FlowNotificationTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    FlowNotificationUI()
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FlowNotificationUI() {
    val context = LocalContext.current
    val viewModel: FlowNotificationViewModel = viewModel()
    val uiState by viewModel.uiState.collectAsState()
    
    // Check notification access status when UI loads
    LaunchedEffect(Unit) {
        viewModel.updateNotificationAccessStatus(context)
        viewModel.updateStatsFromPrefs(context)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        Text(
            text = "🧠 FlowNotification",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        
        Text(
            text = "Smart notification filtering based on FlowScore",
            fontSize = 16.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        // FlowScore Display
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = when {
                    uiState.flowScore >= 0.7f -> MaterialTheme.colorScheme.primaryContainer
                    uiState.flowScore >= 0.5f -> MaterialTheme.colorScheme.secondaryContainer
                    uiState.flowScore >= 0.3f -> MaterialTheme.colorScheme.tertiaryContainer
                    else -> MaterialTheme.colorScheme.errorContainer
                }
            )
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Current FlowScore",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "${(uiState.flowScore * 100).toInt()}%",
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Text(
                    text = when {
                        uiState.flowScore >= 0.7f -> "🚀 Unlimited Focus"
                        uiState.flowScore >= 0.5f -> "⚡ Focus Warmup"
                        uiState.flowScore >= 0.3f -> "🎯 Deep Focus"
                        else -> "🔥 Extreme Focus"
                    },
                    fontSize = 16.sp,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
        }

        // Notification Status
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Notification Access",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium
                    )
                    if (uiState.isNotificationAccessEnabled) {
                        Text(
                            text = "✅ Enabled",
                            color = MaterialTheme.colorScheme.primary
                        )
                    } else {
                        Text(
                            text = "❌ Disabled",
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
                
                if (!uiState.isNotificationAccessEnabled) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = {
                            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                            context.startActivity(intent)
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Enable Notification Access")
                    }
                }
            }
        }

        // Flow Mode Controls
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "Flow Mode Controls",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { viewModel.setFlowScore(0.8f) },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("🚀 Unlimited")
                    }
                    Button(
                        onClick = { viewModel.setFlowScore(0.6f) },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("⚡ Warmup")
                    }
                }
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { viewModel.setFlowScore(0.4f) },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("🎯 Deep")
                    }
                    Button(
                        onClick = { viewModel.setFlowScore(0.2f) },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("🔥 Extreme")
                    }
                }
            }
        }

        // Notification Filtering Status
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "Notification Filtering",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = "Filtered: ${uiState.filteredCount} notifications",
                    fontSize = 14.sp
                )
                Text(
                    text = "Allowed: ${uiState.allowedCount} notifications",
                    fontSize = 14.sp
                )
                
                if (uiState.isFilteringActive) {
                    Text(
                        text = "🛡️ Filtering Active",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.primary
                    )
                } else {
                    Text(
                        text = "📱 All Notifications Allowed",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // Recent Notifications
        if (uiState.recentNotifications.isNotEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        text = "Recent Notifications",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    LazyColumn(
                        modifier = Modifier.height(200.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        items(uiState.recentNotifications) { notification ->
                            NotificationItem(notification = notification)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun NotificationItem(notification: NotificationInfo) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (notification.wasFiltered) {
                MaterialTheme.colorScheme.errorContainer
            } else {
                MaterialTheme.colorScheme.surfaceVariant
            }
        )
    ) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = notification.appName,
                    fontWeight = FontWeight.Medium,
                    fontSize = 14.sp
                )
                Text(
                    text = if (notification.wasFiltered) "🚫" else "✅",
                    fontSize = 16.sp
                )
            }
            
            Text(
                text = notification.title,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            if (notification.text.isNotEmpty()) {
                Text(
                    text = notification.text,
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
