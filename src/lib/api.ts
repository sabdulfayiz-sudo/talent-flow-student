const API_URL = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const readErrorMessage = (payload: unknown, fallback: string) => {
  if (typeof payload === 'string') {
    const compact = payload.replace(/\s+/g, ' ').trim();
    if (
      compact.includes('<!DOCTYPE') ||
      compact.includes('<html') ||
      compact.toLowerCase().includes('vercel')
    ) {
      return 'The service is temporarily unavailable. Please try again in a moment.';
    }
    if (compact) return compact.slice(0, 180);
  }

  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object' && 'message' in detail) {
      const message = (detail as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
  }

  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }

  return fallback;
};

export const resolveAssetUrl = (url?: string | null) => {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL}${url.startsWith('/') ? url : `/${url}`}`;
};

// Fired when a request fails with 401 and the refresh token cannot mint a
// new access token. App.tsx listens for this to clear auth state and route
// the user to /signin (U1).
export const AUTH_EXPIRED_EVENT = 'tf-auth-expired';

const clearStoredAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
};

const dispatchAuthExpired = () => {
  clearStoredAuth();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
};

// Single-flight refresh: concurrent 401s share one /auth/refresh call so we
// never fire a stampede of refresh requests.
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as
      | { access_token?: string; refresh_token?: string }
      | null;
    if (!data?.access_token) return null;
    localStorage.setItem('token', data.access_token);
    if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
};

export const apiFetch = async <T>(
  path: string,
  init: RequestInit = {},
  isRetry = false,
): Promise<T> => {
  const token = localStorage.getItem('token');
  const headers = new Headers(init.headers);
  const hasFormBody = init.body instanceof FormData;

  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!hasFormBody && init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiError(
      0,
      'Unable to reach TalentFlow right now. Check your connection and try again.',
    );
  }

  // 401 handling (U1): try to silently mint a fresh access token via the
  // refresh token and replay the request once. If that fails, clear auth
  // and signal the app to redirect to /signin. Auth endpoints are exempt so
  // a bad login/refresh surfaces its own error instead of looping.
  if (response.status === 401 && !isRetry && !path.startsWith('/auth/')) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (newToken) {
      return apiFetch<T>(path, init, true);
    }
    dispatchAuthExpired();
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) {
      dispatchAuthExpired();
    }
    throw new ApiError(response.status, readErrorMessage(payload, `Request failed with status ${response.status}`), payload);
  }

  return payload as T;
};

export const buildQuery = (params: Record<string, string | number | boolean | undefined | null>) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });

  const query = search.toString();
  return query ? `?${query}` : '';
};
