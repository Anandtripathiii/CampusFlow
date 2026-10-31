// shortcut: in-memory sliding window. OK for single-instance dev + small Vercel
// deploys where each lambda sees enough traffic to self-rate-limit. Upgrade to
// Upstash Redis (@upstash/ratelimit) when you scale past one region.
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);
  if (hits.length >= limit) return false;
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

export function clientKey(req: Request, scope: string): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anon";
  return `${scope}:${ip}`;
}
