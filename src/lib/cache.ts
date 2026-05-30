/**
 * In-memory query cache with TTL support.
 * For 100K+ scale, swap this for Redis — same interface.
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class QueryCache {
  private store = new Map<string, CacheEntry<unknown>>()
  private maxSize = 500
  private defaultTTL = 30_000 // 30 seconds

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.data as T
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    // Evict oldest if at capacity
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value
      if (firstKey) this.store.delete(firstKey)
    }
    this.store.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTL),
    })
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.store.clear()
      return
    }
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) this.store.delete(key)
    }
  }

  /** Wrap an async function with caching */
  async wrap<T>(key: string, fn: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) return cached
    const result = await fn()
    this.set(key, result, ttlMs)
    return result
  }
}

export const queryCache = new QueryCache()
