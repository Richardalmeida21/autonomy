type RateLimitOptions = {
  identifier: string;
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export function checkRateLimit({
  identifier,
  limit,
  windowMs
}: RateLimitOptions) {
  const now = Date.now();
  const current = buckets.get(identifier);

  if (!current || current.resetAt <= now) {
    buckets.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((current.resetAt - now) / 1000)
    };
  }

  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}
