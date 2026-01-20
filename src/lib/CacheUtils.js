/**
 * Cache utilities for frequently accessed data
 * Uses localStorage with TTL (Time To Live) for automatic expiration
 */

const CACHE_PREFIX = 'disciple_life_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default TTL

/**
 * Get cache key with prefix
 */
const getCacheKey = (key) => `${CACHE_PREFIX}${key}`;

/**
 * Set data in cache with TTL
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 */
export const setCache = (key, data, ttl = DEFAULT_TTL) => {
  try {
    const cacheKey = getCacheKey(key);
    const now = Date.now();
    const cacheData = {
      data,
      timestamp: now,
      ttl,
      expiresAt: now + ttl
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    return true;
  } catch (error) {
    console.warn('Cache set error:', error);
    // If localStorage is full, try to clear old entries
    if (error.name === 'QuotaExceededError') {
      clearExpiredCache();
      try {
        const cacheKey = getCacheKey(key);
        const now = Date.now();
        const cacheData = {
          data,
          timestamp: now,
          ttl,
          expiresAt: now + ttl
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        return true;
      } catch (retryError) {
        console.error('Cache set retry failed:', retryError);
        return false;
      }
    }
    return false;
  }
};

/**
 * Get data from cache if not expired
 * @param {string} key - Cache key
 * @returns {any|null} - Cached data or null if expired/not found
 */
export const getCache = (key) => {
  try {
    const cacheKey = getCacheKey(key);
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      return null;
    }

    const { data, expiresAt } = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is expired
    if (now > expiresAt) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('Cache get error:', error);
    return null;
  }
};

/**
 * Clear specific cache entry
 * @param {string} key - Cache key
 */
export const clearCache = (key) => {
  try {
    const cacheKey = getCacheKey(key);
    localStorage.removeItem(cacheKey);
    return true;
  } catch (error) {
    console.warn('Cache clear error:', error);
    return false;
  }
};

/**
 * Clear all expired cache entries
 */
export const clearExpiredCache = () => {
  try {
    const now = Date.now();
    const keys = Object.keys(localStorage);
    let clearedCount = 0;

    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const { expiresAt } = JSON.parse(cached);
            if (now > expiresAt) {
              localStorage.removeItem(key);
              clearedCount++;
            }
          }
        } catch (error) {
          // If parsing fails, remove the corrupted entry
          localStorage.removeItem(key);
          clearedCount++;
        }
      }
    });

    if (clearedCount > 0) {
      console.log(`Cleared ${clearedCount} expired cache entries`);
    }

    return clearedCount;
  } catch (error) {
    console.warn('Clear expired cache error:', error);
    return 0;
  }
};

/**
 * Clear all cache entries (with prefix)
 */
export const clearAllCache = () => {
  try {
    const keys = Object.keys(localStorage);
    let clearedCount = 0;

    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
        clearedCount++;
      }
    });

    console.log(`Cleared ${clearedCount} cache entries`);
    return clearedCount;
  } catch (error) {
    console.warn('Clear all cache error:', error);
    return 0;
  }
};

/**
 * Get cache statistics
 * @returns {object} - Cache stats
 */
export const getCacheStats = () => {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    let totalEntries = 0;
    let expiredEntries = 0;
    let validEntries = 0;
    let totalSize = 0;

    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        totalEntries++;
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            totalSize += cached.length;
            const { expiresAt } = JSON.parse(cached);
            if (now > expiresAt) {
              expiredEntries++;
            } else {
              validEntries++;
            }
          }
        } catch (error) {
          expiredEntries++;
        }
      }
    });

    return {
      totalEntries,
      validEntries,
      expiredEntries,
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`
    };
  } catch (error) {
    console.warn('Cache stats error:', error);
    return {
      totalEntries: 0,
      validEntries: 0,
      expiredEntries: 0,
      totalSize: '0 KB'
    };
  }
};

/**
 * Cache with async function wrapper
 * If cache exists and is valid, return cached data
 * Otherwise, execute the function, cache the result, and return it
 * @param {string} key - Cache key
 * @param {Function} asyncFn - Async function to execute if cache miss
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 * @returns {Promise<any>} - Cached or fresh data
 */
export const getOrSetCache = async (key, asyncFn, ttl = DEFAULT_TTL) => {
  // Try to get from cache first
  const cached = getCache(key);
  if (cached !== null) {
    console.log(`Cache hit: ${key}`);
    return cached;
  }

  // Cache miss, execute function and cache result
  console.log(`Cache miss: ${key}`);
  try {
    const data = await asyncFn();
    setCache(key, data, ttl);
    return data;
  } catch (error) {
    console.error(`Cache async function error for ${key}:`, error);
    throw error;
  }
};

// Clear expired cache on module load
if (typeof window !== 'undefined') {
  clearExpiredCache();
}
