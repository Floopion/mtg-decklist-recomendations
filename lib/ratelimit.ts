import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiter using Upstash Redis with sliding window algorithm.
 *
 * Limits:
 * - Per-IP: 5 requests per 60 seconds
 * - Global daily cap: 500 requests per day
 *
 * Falls back to allowing requests if Upstash is not configured (local dev).
 */

function isConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

let redis: Redis | null = null;
let perIpLimiter: Ratelimit | null = null;
let globalDailyLimiter: Ratelimit | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

function getPerIpLimiter(): Ratelimit {
  if (!perIpLimiter) {
    perIpLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      prefix: "ratelimit:ip",
    });
  }
  return perIpLimiter;
}

function getGlobalDailyLimiter(): Ratelimit {
  if (!globalDailyLimiter) {
    globalDailyLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(500, "1 d"),
      prefix: "ratelimit:global",
    });
  }
  return globalDailyLimiter;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  reason?: "ip" | "global";
}

/**
 * Check both per-IP and global daily rate limits.
 * Returns allowed: true if both pass, with the tighter remaining count.
 */
export async function checkRateLimit(
  request: Request,
): Promise<RateLimitResult> {
  // Skip rate limiting in local dev if Upstash isn't configured
  if (!isConfigured()) {
    return { allowed: true, remaining: 999, resetMs: 0 };
  }

  const ip = getClientIp(request);

  // Check both limits in parallel
  const [ipResult, globalResult] = await Promise.all([
    getPerIpLimiter().limit(ip),
    getGlobalDailyLimiter().limit("global"),
  ]);

  // Global limit hit
  if (!globalResult.success) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: globalResult.reset,
      reason: "global",
    };
  }

  // Per-IP limit hit
  if (!ipResult.success) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: ipResult.reset,
      reason: "ip",
    };
  }

  return {
    allowed: true,
    remaining: Math.min(ipResult.remaining, globalResult.remaining),
    resetMs: Math.max(ipResult.reset, globalResult.reset),
  };
}

/**
 * Extract client IP from request headers.
 * On Vercel, x-forwarded-for is set by the platform. We take the
 * rightmost IP to prevent spoofing via prepended values.
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim());
    return ips[ips.length - 1];
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Build a 429 Response with appropriate headers.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  const retryAfterSeconds = Math.ceil(
    (result.resetMs - Date.now()) / 1000,
  );

  const message =
    result.reason === "global"
      ? "Daily request limit reached. Please try again tomorrow."
      : "Too many requests. Please wait a moment and try again.";

  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(Math.max(retryAfterSeconds, 1)),
      "X-RateLimit-Remaining": String(result.remaining),
    },
  });
}
