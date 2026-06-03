import { useState, useEffect } from "react";

const KEY = "activeSessionId";

export const getActiveSessionId = (): string | null => localStorage.getItem(KEY);
export const setActiveSessionId = (id: string): void => { localStorage.setItem(KEY, id); };
export const clearActiveSessionId = (): void => { localStorage.removeItem(KEY); };

export function useActiveSessionId(): string | null {
  const [id, setId] = useState<string | null>(() => getActiveSessionId());

  useEffect(() => {
    const handler = () => setId(getActiveSessionId());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return id;
}
