type AuthCodeEntry = {
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  clientId: string;
  expiry: number;
};

const store = new Map<string, AuthCodeEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [code, entry] of store) {
    if (now > entry.expiry) store.delete(code);
  }
}, 60_000).unref();

export const authCodeStore = {
  add(
    code: string,
    entry: Omit<AuthCodeEntry, "expiry">,
    ttlMs = 600_000,
  ): void {
    store.set(code, { ...entry, expiry: Date.now() + ttlMs });
  },
  get(code: string): AuthCodeEntry | undefined {
    const entry = store.get(code);
    if (!entry || Date.now() > entry.expiry) {
      store.delete(code);
      return undefined;
    }
    return entry;
  },
  delete(code: string): void {
    store.delete(code);
  },
};
