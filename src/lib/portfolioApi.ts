const env = import.meta.env as ImportMetaEnv & {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
};

const API_URL = (env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '');
const API_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? '';
export const ADMIN_PATH = '/_private-console-8a4f2d';
export const ADMIN_HASH_ROUTE = '#/_private-console-8a4f2d';

const SESSION_KEY = 'aditya-portfolio-admin-session';

export type AdminUser = { id: string; email: string };

type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: AdminUser;
};

type ContentRow = { id: string; content: Record<string, unknown>; updated_at?: string };

export const backendConfigured = Boolean(API_URL && API_KEY);

function readSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session: AuthSession | null) {
  if (!session) sessionStorage.removeItem(SESSION_KEY);
  else sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function parseResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let payload: any = null;
  try { payload = raw ? JSON.parse(raw) : null; } catch { payload = raw; }
  if (!response.ok) {
    const message = payload?.msg || payload?.message || payload?.error_description || payload?.error || response.statusText;
    throw new Error(typeof message === 'string' ? message : 'The request could not be completed.');
  }
  return payload as T;
}

function requireBackend() {
  if (!backendConfigured) {
    throw new Error('Admin backend is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to the deployment environment.');
  }
}

async function refreshSession(session: AuthSession): Promise<AuthSession> {
  requireBackend();
  const response = await fetch(`${API_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  const next = await parseResponse<any>(response);
  const updated: AuthSession = {
    access_token: next.access_token,
    refresh_token: next.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + Number(next.expires_in || 3600),
    user: { id: next.user.id, email: next.user.email || session.user.email },
  };
  writeSession(updated);
  return updated;
}

async function usableSession(): Promise<AuthSession> {
  requireBackend();
  let session = readSession();
  if (!session) throw new Error('Please sign in again.');
  if (session.expires_at <= Math.floor(Date.now() / 1000) + 60) {
    session = await refreshSession(session);
  }
  return session;
}

async function rest<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  requireBackend();
  const headers = new Headers(init.headers);
  headers.set('apikey', API_KEY);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}/rest/v1/${path}`, { ...init, headers });
  return parseResponse<T>(response);
}

export async function loadPublicPortfolioContent(): Promise<Record<string, unknown> | null> {
  if (!backendConfigured) return null;
  const rows = await rest<ContentRow[]>('portfolio_content?id=eq.main&select=content&limit=1');
  return rows?.[0]?.content ?? null;
}

export async function signInAdmin(email: string, password: string): Promise<AdminUser> {
  requireBackend();
  const response = await fetch(`${API_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const data = await parseResponse<any>(response);
  const session: AuthSession = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
    user: { id: data.user.id, email: data.user.email || email.trim() },
  };
  writeSession(session);

  try {
    const current = await rest<AdminUser[]>(
      `portfolio_admins?user_id=eq.${encodeURIComponent(session.user.id)}&select=user_id&limit=1`,
      {},
      session.access_token,
    );
    if (!current?.length) throw new Error('This account is not on the portfolio admin allowlist.');
  } catch (error) {
    writeSession(null);
    throw error;
  }
  return session.user;
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  if (!backendConfigured || !readSession()) return null;
  try {
    const session = await usableSession();
    const response = await fetch(`${API_URL}/auth/v1/user`, {
      headers: { apikey: API_KEY, Authorization: `Bearer ${session.access_token}` },
    });
    const user = await parseResponse<any>(response);
    const rows = await rest<AdminUser[]>(
      `portfolio_admins?user_id=eq.${encodeURIComponent(user.id)}&select=user_id&limit=1`,
      {},
      session.access_token,
    );
    if (!rows?.length) {
      writeSession(null);
      return null;
    }
    return { id: user.id, email: user.email || session.user.email };
  } catch {
    writeSession(null);
    return null;
  }
}

export async function signOutAdmin() {
  const session = readSession();
  if (session && backendConfigured) {
    try {
      await fetch(`${API_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: API_KEY, Authorization: `Bearer ${session.access_token}` },
      });
    } catch {
      // Clear the local session even if the remote logout endpoint is unavailable.
    }
  }
  writeSession(null);
}

export async function savePortfolioContent(content: Record<string, unknown>): Promise<void> {
  const session = await usableSession();
  const response = await fetch(`${API_URL}/rest/v1/portfolio_content?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: API_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      id: 'main',
      content,
      updated_at: new Date().toISOString(),
      updated_by: session.user.id,
    }),
  });
  await parseResponse<unknown>(response);
}
