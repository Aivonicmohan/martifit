interface CacheEntry {
  data: any;
  timestamp: number;
  lastAccess: number;
}

const memberCache = new Map<string, CacheEntry>();

// Short TTL keeps member lists responsive without allowing stale data to persist.
// A hard limit prevents an attacker or long-running process from growing memory
// indefinitely through unique search strings.
const CACHE_TTL_MS = 30 * 1000;
const MAX_CACHE_ENTRIES = 128;

function evictExpiredEntries(): void {
  const now = Date.now();

  for (const [key, entry] of memberCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      memberCache.delete(key);
    }
  }
}

function enforceCacheLimit(): void {
  while (memberCache.size > MAX_CACHE_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestAccess = Number.POSITIVE_INFINITY;

    for (const [key, entry] of memberCache.entries()) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (!oldestKey) break;
    memberCache.delete(oldestKey);
  }
}

export function getCachedMembers(tenantId: string, search: string, status: string): any | null {
  evictExpiredEntries();

  const cacheKey = `${tenantId}:${status}:${search}`;
  const entry = memberCache.get(cacheKey);

  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL_MS) {
    memberCache.delete(cacheKey);
    return null;
  }

  entry.lastAccess = now;
  return entry.data;
}

export function setCachedMembers(
  tenantId: string,
  search: string,
  status: string,
  data: any
): void {
  evictExpiredEntries();

  const now = Date.now();
  const cacheKey = `${tenantId}:${status}:${search}`;

  memberCache.set(cacheKey, {
    data,
    timestamp: now,
    lastAccess: now,
  });

  enforceCacheLimit();
}

export function invalidateMemberCache(tenantId?: string): void {
  if (!tenantId) {
    memberCache.clear();
    return;
  }

  const prefix = `${tenantId}:`;
  for (const key of memberCache.keys()) {
    if (key.startsWith(prefix)) {
      memberCache.delete(key);
    }
  }
}
