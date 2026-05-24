import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function createLimiter(requests: number, window: `${number} s` | `${number} m`) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
  });
}

export const apiLimiter = createLimiter(60, "1 m");
export const authLimiter = createLimiter(10, "1 m");

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; remaining?: number }> {
  if (!limiter) return { success: true };
  const { success, remaining } = await limiter.limit(identifier);
  return { success, remaining };
}
