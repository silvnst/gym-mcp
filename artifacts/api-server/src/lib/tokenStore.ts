const store = new Map<string, number>(); // token → expiry timestamp (ms)

setInterval(() => {
  const now = Date.now();
  for (const [token, exp] of store) {
    if (now > exp) store.delete(token);
  }
}, 60_000).unref();

export const tokenStore = {
  add(token: string, ttlMs = 3_600_000): void {
    store.set(token, Date.now() + ttlMs);
  },
  valid(token: string): boolean {
    const exp = store.get(token);
    return exp != null && Date.now() <= exp;
  },
};
