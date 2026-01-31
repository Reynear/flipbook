const STORAGE_KEY = "flipbook_anonymous_session";

export function getAnonymousId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function clearAnonymousSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function hasAnonymousSession(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(STORAGE_KEY);
}
