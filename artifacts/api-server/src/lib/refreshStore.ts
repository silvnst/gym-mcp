const store = new Map<string, number>(); // refresh_token → expiry timestamp (ms)

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

setInterval(() => {
  const now = Date.now();
  for (const [token, exp] of store) {
    if (now > exp) store.delete(token);
  }
}, 60_000).unref();

export const refreshStore = {
  add(token: string, ttlMs = TTL_MS): void {
    store.set(token, Date.now() + ttlMs);
  },
  valid(token: string): boolean {
    const exp = store.get(token);
    return exp != null && Date.now() <= exp;
  },
  delete(token: string): void {
    store.delete(token);
  },
};
