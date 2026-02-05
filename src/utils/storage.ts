/**
 * Safe localStorage wrappers that handle private browsing, quota exceeded, 
 * and other edge cases without throwing.
 */

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    // QuotaExceededError in private browsing or full storage
    console.warn(`Failed to save to localStorage: ${key}`);
    return false;
  }
}

export function safeGetJSON<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as T;
    }
  } catch {
    // Parse error or localStorage unavailable
  }
  return fallback;
}

export function safeSetJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    console.warn(`Failed to save to localStorage: ${key}`);
    return false;
  }
}
