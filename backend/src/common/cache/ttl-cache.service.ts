import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Generic in-memory TTL cache.
 *
 * Stores key-value pairs with a configurable time-to-live.
 * Expired entries are lazily evicted on access.
 * Not shared across instances — each injection gets its own store.
 */
@Injectable()
export class TtlCacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  /**
   * Retrieve a cached value. Returns undefined on miss or expiry.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Store a value with a TTL in milliseconds.
   */
  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Check if a non-expired entry exists for the key.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Remove a specific entry.
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Remove all entries.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Number of entries (including potentially expired ones).
   */
  get size(): number {
    return this.store.size;
  }
}
