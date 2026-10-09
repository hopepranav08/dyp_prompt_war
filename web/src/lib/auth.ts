/**
 * Minimal Identity Platform client over its REST API (no SDK, ~1 KB):
 * email/password and anonymous sign-in, silent token refresh, and a tiny subscription model.
 */
export interface Session {
  idToken: string;
  refreshToken: string;
  expiresAt: number;
  uid: string;
  email?: string;
  anonymous: boolean;
}

const STORAGE_KEY = 'sahayatri.session';
const IDT = 'https://identitytoolkit.googleapis.com/v1/accounts';
const STS = 'https://securetoken.googleapis.com/v1/token';

let apiKey = '';
let session: Session | null = load();
const listeners = new Set<(s: Session | null) => void>();

function load(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function save(next: Session | null) {
  session = next;
  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable: session lives in memory only */
  }
  listeners.forEach((l) => l(next));
}

const FRIENDLY: Record<string, string> = {
  EMAIL_EXISTS: 'That email already has an account. Try signing in.',
  EMAIL_NOT_FOUND: 'No account with that email. Create one instead.',
  INVALID_PASSWORD: 'Wrong password.',
  INVALID_LOGIN_CREDENTIALS: 'Email or password is incorrect.',
  WEAK_PASSWORD: 'Password must be at least 6 characters.',
  INVALID_EMAIL: 'That email address looks invalid.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts. Try again later.',
};

async function post<T>(url: string, body: unknown, form = false): Promise<T> {
  const res = await fetch(`${url}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' },
    body: form ? new URLSearchParams(body as Record<string, string>) : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) {
    const code = data.error?.message?.split(' ')[0] ?? 'UNKNOWN';
    throw new Error(FRIENDLY[code] ?? 'Sign-in failed. Please try again.');
  }
  return data;
}

interface AuthReply {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  email?: string;
}

const fromReply = (r: AuthReply, anonymous: boolean): Session => ({
  idToken: r.idToken,
  refreshToken: r.refreshToken,
  expiresAt: Date.now() + Number(r.expiresIn) * 1000,
  uid: r.localId,
  email: r.email || undefined,
  anonymous,
});

export const auth = {
  configure(key: string) {
    apiKey = key;
  },
  get session() {
    return session;
  },
  subscribe(fn: (s: Session | null) => void) {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
  async signUp(email: string, password: string) {
    save(fromReply(await post<AuthReply>(`${IDT}:signUp`, { email, password, returnSecureToken: true }), false));
  },
  async signIn(email: string, password: string) {
    save(fromReply(await post<AuthReply>(`${IDT}:signInWithPassword`, { email, password, returnSecureToken: true }), false));
  },
  async guest() {
    save(fromReply(await post<AuthReply>(`${IDT}:signUp`, { returnSecureToken: true }), true));
  },
  signOut() {
    save(null);
  },
  /** Returns a fresh ID token (refreshing a minute before expiry), or null for signed-out users. */
  async idToken(): Promise<string | null> {
    if (!session) return null;
    if (session.expiresAt - Date.now() > 60_000) return session.idToken;
    try {
      const r = await post<{ id_token: string; refresh_token: string; expires_in: string }>(STS, { grant_type: 'refresh_token', refresh_token: session.refreshToken }, true);
      save({ ...session, idToken: r.id_token, refreshToken: r.refresh_token, expiresAt: Date.now() + Number(r.expires_in) * 1000 });
      return session.idToken;
    } catch {
      save(null);
      return null;
    }
  },
};
