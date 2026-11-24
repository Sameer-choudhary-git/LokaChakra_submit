interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

interface BlockHashCache {
  value: string;
  timestamp: number;
}

class Cache {
  private static instance: Cache;
  private cache: Map<string, CacheEntry<number | string>>;
  private BLOCK_HASH_KEY = 'latest_blockhash';
  private CACHE_DURATION = 50000; // 50 seconds in milliseconds

  private constructor() {
    this.cache = new Map();
  }

  public static getInstance(): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache();
    }
    return Cache.instance;
  }

  public setBlockHash(blockHash: string): void {
    this.cache.set(this.BLOCK_HASH_KEY, {
      value: blockHash,
      timestamp: Date.now(),
    });
  }

  public getBlockHash(): string | null {
    const entry = this.cache.get(this.BLOCK_HASH_KEY) as BlockHashCache;

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > this.CACHE_DURATION;

    if (isExpired) {
      this.cache.delete(this.BLOCK_HASH_KEY);
      return null;
    }

    return entry.value;
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const cacheManager = Cache.getInstance();
