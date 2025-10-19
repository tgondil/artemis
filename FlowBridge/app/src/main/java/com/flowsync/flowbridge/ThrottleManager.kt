package com.flowsync.flowbridge

import android.util.Log

/**
 * Manages bandwidth throttling based on FlowScore
 */
object ThrottleManager {
    private const val TAG = "ThrottleManager"
    
    // Bandwidth limits in bytes per second
    private const val UNLIMITED = Long.MAX_VALUE
    private const val FOCUS_WARMUP = 50_000_000L      // 50 MB/s
    private const val DEEP_FOCUS = 25_000_000L       // 25 MB/s
    private const val EXTREME_FOCUS = 10_000_000L    // 10 MB/s
    
    private var tokenBucket: TokenBucket = TokenBucket(UNLIMITED)
    private var currentLimit: Long = UNLIMITED
    private var currentFlowScore: Float = 1.0f
    
    /**
     * Update bandwidth limit based on FlowScore
     */
    fun updateFlowScore(flowScore: Float) {
        currentFlowScore = flowScore
        
        val newLimit = when {
            flowScore >= 0.7f -> UNLIMITED
            flowScore >= 0.5f -> FOCUS_WARMUP
            flowScore >= 0.3f -> DEEP_FOCUS
            else -> EXTREME_FOCUS
        }
        
        if (newLimit != currentLimit) {
            currentLimit = newLimit
            tokenBucket.setRate(newLimit)
            
            val mode = getModeLabel()
            Log.i(TAG, "FlowScore: $flowScore → $mode (${getRateKbps()} kbit/s)")
        }
    }
    
    /**
     * Try to pass bytes through the rate limiter
     */
    fun tryConsume(bytes: Long): Boolean {
        if (currentLimit == UNLIMITED) return true
        return tokenBucket.tryConsume(bytes)
    }
    
    /**
     * Get current rate in kbit/s
     */
    fun getRateKbps(): Int = when (currentLimit) {
        UNLIMITED -> Int.MAX_VALUE
        else -> tokenBucket.getRateKbps()
    }
    
    /**
     * Get human-readable mode label
     */
    fun getModeLabel(): String = when (currentLimit) {
        UNLIMITED -> "Normal Mode"
        FOCUS_WARMUP -> "Focus Warmup"
        DEEP_FOCUS -> "Deep Focus"
        EXTREME_FOCUS -> "Extreme Focus"
        else -> "Unknown"
    }
    
    /**
     * Get current FlowScore
     */
    fun getFlowScore(): Float = currentFlowScore
    
    /**
     * Check if throttling is active
     */
    fun isThrottling(): Boolean = currentLimit != UNLIMITED
}
