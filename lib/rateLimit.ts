import { kv } from "./kv";


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
    feedback: [
        { requests: 20, windowSeconds: 60 },    // 20 per minute
        { requests: 120, windowSeconds: 3600 }, // 120 per hour
    ],
    chat: [
        { requests: 20, windowSeconds: 60 },    // 20 per minute
        { requests: 100, windowSeconds: 3600 }, // 100 per hour
    ],
    prompt: [
        { requests: 30, windowSeconds: 60 },    // 30 per minute
        { requests: 200, windowSeconds: 3600 }, // 200 per hour
    ],
    outcome: [
        { requests: 20, windowSeconds: 60 },
        { requests: 120, windowSeconds: 3600 },
    ],
    events: [
        { requests: 60, windowSeconds: 60 },
        { requests: 600, windowSeconds: 3600 },
    ],
};

/** Rate limiter'ın kullandığı KV parçası (testte sahtesi verilir). */
export interface RateLimitPipeline {
    zremrangebyscore(key: string, min: number, max: number): RateLimitPipeline;
    zadd(key: string, scoreMember: { score: number; member: string }): RateLimitPipeline;
    zcard(key: string): RateLimitPipeline;
    zrange(key: string, min: number, max: number, opts: { withScores: true }): RateLimitPipeline;
    zrem(key: string, member: string): RateLimitPipeline;
    expire(key: string, seconds: number): RateLimitPipeline;
    exec(): Promise<unknown[]>;
}

export interface RateLimitStore {
    pipeline(): RateLimitPipeline;
}

/** Her pencere için pipeline'a eklenen komut sayısı (sonuçları okurken). */
const COMMANDS_PER_WINDOW = 5;

/**
 * Sliding window rate limiter using Vercel KV.
 * Returns the most restrictive limit status.
 *
 * İstek başına TEK KV çağrısı: tüm pencerelerin komutları bir pipeline'da.
 * İstek önce eklenir, sonra sayılır; limit aşıldıysa (nadir yol) ikinci bir
 * pipeline ile aşılan pencereden itibaren geri alınır. Böylece davranış eski
 * sıralı sürümle aynı kalır: limiti aşan pencere ve sonrakiler reddedilen
 * isteği saymaz, öncekiler sayar. KV'ye ulaşılamazsa fail-closed.
 */
export async function checkRateLimit(
    ip: string,
    endpoint: string,
    deps: { store?: RateLimitStore; now?: () => number } = {}
): Promise<RateLimitResult> {
    const limits = RATE_LIMITS[endpoint] || RATE_LIMITS.recommend;
    const store = deps.store ?? (kv as unknown as RateLimitStore);
    const now = Math.floor((deps.now ?? Date.now)() / 1000);

    try {
        const requestId = `${now}:${Math.random().toString(36).slice(2)}`;
        const keys = limits.map((config) => {
            const windowKey = config.windowSeconds === 60 ? "minute" : "hour";
            return `ratelimit:${endpoint}:${ip}:${windowKey}`;
        });

        const pipeline = store.pipeline();
        limits.forEach((config, i) => {
            pipeline
                .zremrangebyscore(keys[i], 0, now - config.windowSeconds)
                .zadd(keys[i], { score: now, member: requestId })
                .zcard(keys[i])
                .zrange(keys[i], 0, 0, { withScores: true })
                .expire(keys[i], config.windowSeconds + 10);
        });
        const results = await pipeline.exec();

        let mostRestrictive: RateLimitResult = {
            success: true,
            limit: limits[0].requests,
            remaining: limits[0].requests,
            reset: limits[0].windowSeconds,
        };

        for (let i = 0; i < limits.length; i++) {
            const config = limits[i];
            // Bu isteği de içeren sayım
            const countWithThis = Number(results[i * COMMANDS_PER_WINDOW + 2]);

            if (countWithThis > config.requests) {
                // Rate limited: bu ve sonraki pencerelerden isteği geri al
                const undo = store.pipeline();
                for (let j = i; j < limits.length; j++) undo.zrem(keys[j], requestId);
                await undo.exec();

                const oldestRequests = results[i * COMMANDS_PER_WINDOW + 3] as unknown[];
                const oldestTimestamp = Array.isArray(oldestRequests) && oldestRequests.length > 1
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

            const remaining = config.requests - countWithThis;
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
        console.error('Rate limit KV error. Failing strict to prevent DDoS in Edge runtime:', error);

        // Edge runtime'da in-memory state isolate'lar arası paylaşılamadığı için
        // KV'ye ulaşılamazsa güvenli kapalı kalma (fail-closed) uyguluyoruz.
        return {
            success: false,
            limit: 0,
            remaining: 0,
            reset: 60, // İstemci 1 dakika sonra tekrar dener
        };
    }
}
