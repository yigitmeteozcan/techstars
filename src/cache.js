class Cache {
  constructor(ttlMs = 60 * 60 * 1000) {
    this.ttlMs = ttlMs;
    this.store = new Map();
  }

  set(key, value) {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  info(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    return {
      expiresAt: new Date(entry.expiresAt).toISOString(),
      ttlRemainingMs: Math.max(0, entry.expiresAt - Date.now()),
    };
  }
}

module.exports = new Cache(Number(process.env.CACHE_TTL_MS) || 60 * 60 * 1000);
