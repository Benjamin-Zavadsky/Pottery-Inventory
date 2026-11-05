// Browser storage can throw (private mode, blocked storage) — drafts are a
// convenience, so every access degrades to "no draft" instead of failing.
export function loadDraft<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function clearDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {}
}
