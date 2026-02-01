import { kv } from "@vercel/kv";

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number; // seconds until reset
}

interface RateLimitConfig {
    requests: number;
    windowSeconds: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig[]> = {
    recommend: [
        { requests: 10, windowSeconds: 60 },    // 10 per minute
        { requests: 60, windowSeconds: 3600 },  // 60 per hour
    ],
};

/**
 * Sliding window rate limiter using Vercel KV.
 * Returns the most restrictive limit status.
 */
export async function checkRateLimit(
    ip: string,
    endpoint: string
): Promise<RateLimitResult> {
    const limits = RATE_LIMITS[endpoint] || RATE_LIMITS.recommend;
    const now = Math.floor(Date.now() / 1000);

    try {
        let mostRestrictive: RateLimitResult = {
            success: true,
            limit: limits[0].requests,
            remaining: limits[0].requests,
            reset: limits[0].windowSeconds,
        };

        for (const config of limits) {
            const windowKey = config.windowSeconds === 60 ? "minute" : "hour";
            const key = `ratelimit:${endpoint}:${ip}:${windowKey}`;

            // Get current window data
            const windowStart = now - config.windowSeconds;

            // Use a sorted set for sliding window
            // Score = timestamp, Member = unique request ID
            const requestId = `${now}:${Math.random().toString(36).slice(2)}`;

            // Remove old entries outside the window
            await kv.zremrangebyscore(key, 0, windowStart);

            // Count current requests in window
            const currentCount = await kv.zcard(key);

            if (currentCount >= config.requests) {
                // Rate limited - find when the oldest request expires
                const oldestRequests = await kv.zrange(key, 0, 0, { withScores: true });
                const oldestTimestamp = oldestRequests.length > 1
                    ? Number(oldestRequests[1])
                    : now;
                const resetIn = Math.max(1, (oldestTimestamp + config.windowSeconds) - now);

                return {
                    success: false,
                    limit: config.requests,
                    remaining: 0,
                    reset: resetIn,
                };
            }

            // Add current request to the window
            await kv.zadd(key, { score: now, member: requestId });

            // Set TTL to auto-cleanup (window size + buffer)
            await kv.expire(key, config.windowSeconds + 10);

            const remaining = config.requests - currentCount - 1;
            const resetIn = config.windowSeconds;

            // Track the most restrictive limit
            if (remaining < mostRestrictive.remaining) {
                mostRestrictive = {
                    success: true,
                    limit: config.requests,
                    remaining,
                    reset: resetIn,
                };
            }
        }

        return mostRestrictive;
    } catch (error) {
        // If KV is down, allow the request but log the error
        console.error("[RateLimit] KV error, allowing request:", error);
        return {
            success: true,
            limit: limits[0].requests,
            remaining: limits[0].requests,
            reset: limits[0].windowSeconds,
        };
    }
}
