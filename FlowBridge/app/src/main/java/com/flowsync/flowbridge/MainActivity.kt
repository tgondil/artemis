package com.flowsync.flowbridge

import android.content.Intent
import android.net.VpnService
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class MainActivity : ComponentActivity() {
    
    private val vpnPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            startVpnService()
        } else {
            Toast.makeText(this, "VPN permission denied", Toast.LENGTH_SHORT).show()
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        setContent {
            FlowBridgeTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    FlowBridgeUI()
                }
            }
        }
    }
    
    @Composable
    fun FlowBridgeUI() {
        var isVpnActive by remember { mutableStateOf(false) }
        
        // Check if VPN service is running
        LaunchedEffect(Unit) {
            while (true) {
                isVpnActive = isVpnServiceRunning()
                kotlinx.coroutines.delay(1000)
            }
        }
        
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "🧠 FlowBridge",
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "Focus-Aware Bandwidth Control",
                fontSize = 16.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Spacer(modifier = Modifier.height(48.dp))
            
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = if (isVpnActive) "Active" else "Inactive",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isVpnActive) 
                            MaterialTheme.colorScheme.primary 
                        else 
                            MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Text(
                        text = if (isVpnActive) {
                            "FlowBridge is monitoring your focus and adjusting bandwidth"
                        } else {
                            "Start FlowBridge to enable focus-aware throttling"
                        },
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            Button(
                onClick = {
                    if (isVpnActive) {
                        stopVpnService()
                        isVpnActive = false
                    } else {
                        requestVpnPermission()
                        isVpnActive = true
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
            ) {
                Text(
                    text = if (isVpnActive) "Stop" else "Start",
                    fontSize = 18.sp
                )
            }
            
            Spacer(modifier = Modifier.height(48.dp))
            
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        text = "📡 API Endpoint",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "POST http://<phone-ip>:3000/api/focus",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = """{"flowScore": 0.3}""",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
    
    @Composable
    fun FlowBridgeTheme(content: @Composable () -> Unit) {
        MaterialTheme(
            colorScheme = lightColorScheme(),
            content = content
        )
    }
    
    private fun requestVpnPermission() {
        val intent = VpnService.prepare(this)
        if (intent != null) {
            vpnPermissionLauncher.launch(intent)
        } else {
            startVpnService()
        }
    }
    
    private fun startVpnService() {
        android.util.Log.d("MainActivity", "Starting VPN service...")
        val intent = Intent(this, ThrottleVpnService::class.java)
        intent.action = ThrottleVpnService.ACTION_START
        startService(intent)
        Toast.makeText(this, "FlowBridge started", Toast.LENGTH_SHORT).show()
        android.util.Log.d("MainActivity", "VPN service start requested")
    }
    
    private fun stopVpnService() {
        val intent = Intent(this, ThrottleVpnService::class.java)
        intent.action = ThrottleVpnService.ACTION_STOP
        startService(intent)
        Toast.makeText(this, "FlowBridge stopped", Toast.LENGTH_SHORT).show()
    }
    
    private fun isVpnServiceRunning(): Boolean {
        val activityManager = getSystemService(ACTIVITY_SERVICE) as android.app.ActivityManager
        val runningServices = activityManager.getRunningServices(Integer.MAX_VALUE)
        return runningServices.any { it.service.className == ThrottleVpnService::class.java.name }
    }
}
