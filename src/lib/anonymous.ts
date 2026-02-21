const STORAGE_KEY = "flipbook_session_token";
const SESSION_TOKEN_REGEX = /^sess_[a-f0-9]{64}$/;

function createSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  return `sess_${hex}`;
}

export function getSessionToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  let token = localStorage.getItem(STORAGE_KEY);
  if (!token || !SESSION_TOKEN_REGEX.test(token)) {
    token = createSessionToken();
    localStorage.setItem(STORAGE_KEY, token);
  }
  return token;
}

export function clearSessionToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function hasSessionToken(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(STORAGE_KEY);
}
