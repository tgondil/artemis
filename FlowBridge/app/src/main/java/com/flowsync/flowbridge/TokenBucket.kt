package com.flowsync.flowbridge

import kotlin.math.min

/**
 * TokenBucket rate limiter for bandwidth throttling
 * 
 * @param ratePerSecond Bytes per second allowed
 * @param bucketSize Maximum burst size in bytes
 */
class TokenBucket(
    private var ratePerSecond: Long,
    private val bucketSize: Long = ratePerSecond * 2
) {
    private var tokens: Long = bucketSize
    private var lastRefillTime: Long = System.nanoTime()
    
    /**
     * Try to consume tokens. Returns true if allowed, false if rate limit exceeded.
     */
    @Synchronized
    fun tryConsume(bytes: Long): Boolean {
        refill()
        
        if (tokens >= bytes) {
            tokens -= bytes
            return true
        }
        
        return false
    }
    
    /**
     * Update the rate limit dynamically
     */
    @Synchronized
    fun setRate(newRatePerSecond: Long) {
        ratePerSecond = newRatePerSecond
    }
    
    /**
     * Refill tokens based on elapsed time
     */
    private fun refill() {
        val now = System.nanoTime()
        val elapsed = now - lastRefillTime
        val tokensToAdd = (elapsed * ratePerSecond) / 1_000_000_000L
        
        if (tokensToAdd > 0) {
            tokens = min(bucketSize, tokens + tokensToAdd)
            lastRefillTime = now
        }
    }
    
    /**
     * Get current rate in kbit/s for display
     */
    fun getRateKbps(): Int = ((ratePerSecond * 8) / 1000).toInt()
}

