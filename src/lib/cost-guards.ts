import crypto from "crypto";

// In-memory session token budgets (simplified; use Redis for distributed systems)
const sessionBudgets = new Map<string, { tokens: number; lastReset: number }>();
const BUDGET_RESET_INTERVAL_MS = 3600_000; // 1 hour
const SESSION_TOKEN_BUDGET = parseInt(process.env.CEREBRAS_SESSION_BUDGET || "50000", 10);

// In-memory result cache (simplified; use Redis for distributed systems)
const resultCache = new Map<string, { result: unknown; timestamp: number }>();
const CACHE_TTL_MS = 86400_000; // 24 hours

/**
 * Get or create session budget for a client IP
 */
export function getSessionBudget(clientIp: string): { remaining: number; total: number } {
  const now = Date.now();
  let session = sessionBudgets.get(clientIp);

  if (!session || now - session.lastReset > BUDGET_RESET_INTERVAL_MS) {
    session = { tokens: SESSION_TOKEN_BUDGET, lastReset: now };
    sessionBudgets.set(clientIp, session);
  }

  return {
    remaining: session.tokens,
    total: SESSION_TOKEN_BUDGET,
  };
}

/**
 * Deduct tokens from session budget
 */
export function deductTokens(clientIp: string, tokens: number): boolean {
  const budget = getSessionBudget(clientIp);

  if (budget.remaining < tokens) {
    return false; // Budget exceeded
  }

  const session = sessionBudgets.get(clientIp);
  if (session) {
    session.tokens -= tokens;
  }

  return true;
}

/**
 * Calculate cache key for a lens analysis result
 * Hash: location + lens + question to avoid storing exact queries
 */
export function getCacheKey(
  lat: number,
  lng: number,
  lensId: string,
  questionHash: string,
): string {
  return crypto
    .createHash("sha256")
    .update(`${lat.toFixed(4)}-${lng.toFixed(4)}-${lensId}-${questionHash}`)
    .digest("hex");
}

/**
 * Get cached result if available and not expired
 */
export function getCachedResult(cacheKey: string): unknown | null {
  const cached = resultCache.get(cacheKey);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL_MS) {
    resultCache.delete(cacheKey);
    return null;
  }

  return cached.result;
}

/**
 * Cache a result
 */
export function cacheResult(cacheKey: string, result: unknown): void {
  resultCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
  });

  // Log cache hit metric to Sentry
  if (process.env.NODE_ENV === "production") {
    // In production, could emit to metrics service
  }
}

/**
 * Hash a question string for caching
 */
export function hashQuestion(question: string): string {
  return crypto.createHash("sha256").update(question).digest("hex").substring(0, 16);
}

/**
 * Clean up expired cache entries (called periodically)
 */
export function cleanupExpiredCache(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, value] of resultCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      resultCache.delete(key);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats(): {
  size: number;
  sessionCount: number;
  cacheSize: number;
} {
  return {
    size: sessionBudgets.size,
    sessionCount: sessionBudgets.size,
    cacheSize: resultCache.size,
  };
}
