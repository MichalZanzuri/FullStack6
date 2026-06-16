/**
 * Tiny TTL-aware in-memory cache. Avoids re-fetching the same list across
 * route changes within a session. Mutations call setCache / removeCache to
 * keep the cached data in sync; logout calls clearCache.
 */
const cache = new Map();

export function getCache(key) {
  const entry = cache.get(key);

  if (!entry) return null;

  const isExpired = entry.expiry && Date.now() > entry.expiry;

  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

const FIVE_HOURS = 1000 * 60 * 60 * 5; // ms

export function setCache(key, data, ttl = FIVE_HOURS) {
  cache.set(key, {
    data,
    expiry: Date.now() + ttl,
  });
}

export function removeCache(key) {
  cache.delete(key);
}

export function clearCache() {
  cache.clear();
}

/* Useful for invalidating a paginated bucket — e.g. all
   "photos-<albumId>-page-*" entries when a photo is added. */
export function removeCacheByPrefix(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
