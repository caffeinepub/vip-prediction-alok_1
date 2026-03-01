const SESSION_KEY = "vip_prediction_session";
const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

interface SessionData {
  loggedIn: boolean;
  expiry: number;
}

export function createSession(): void {
  const session: SessionData = {
    loggedIn: true,
    expiry: Date.now() + SESSION_DURATION_MS,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function isSessionValid(): boolean {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const session: SessionData = JSON.parse(raw);
    if (!session.loggedIn) return false;
    if (Date.now() > session.expiry) {
      clearSession();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
