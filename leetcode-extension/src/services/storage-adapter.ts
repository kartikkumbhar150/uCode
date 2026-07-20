// ============================================================
// storage-adapter.ts
// Transparent wrapper: uses chrome.storage.local inside the
// extension, and localStorage when running as a standalone
// web app (Vercel, dev server, etc.)
// Also provides JWT token helpers used by api-client.ts
// ============================================================

const IS_EXTENSION =
  typeof chrome !== "undefined" &&
  typeof chrome.storage !== "undefined" &&
  typeof chrome.storage.local !== "undefined";

// ─── Data storage ─────────────────────────────────────────────
export async function adapterGet<T>(key: string, fallback: T): Promise<T> {
  if (IS_EXTENSION) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve((result[key] !== undefined ? result[key] : fallback) as T);
      });
    });
  } else {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }
}

export async function adapterSet<T>(key: string, value: T): Promise<void> {
  if (IS_EXTENSION) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

export async function adapterRemove(key: string): Promise<void> {
  if (IS_EXTENSION) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, resolve);
    });
  } else {
    localStorage.removeItem(key);
  }
}

// ─── JWT Token helpers ─────────────────────────────────────────
const TOKEN_KEY = "leetsync_jwt";
const USER_KEY  = "leetsync_user";

export async function getToken(): Promise<string | null> {
  return adapterGet<string | null>(TOKEN_KEY, null);
}

export async function setToken(token: string): Promise<void> {
  return adapterSet(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  return adapterRemove(TOKEN_KEY);
}

export interface StoredUser {
  id: number | string;
  email: string;
  username?: string;
  name?: string;
}

export async function getStoredUser(): Promise<StoredUser | null> {
  return adapterGet<StoredUser | null>(USER_KEY, null);
}

export async function setStoredUser(user: StoredUser): Promise<void> {
  return adapterSet(USER_KEY, user);
}

export async function clearStoredUser(): Promise<void> {
  return adapterRemove(USER_KEY);
}

export async function logout(): Promise<void> {
  await clearToken();
  await clearStoredUser();
}
