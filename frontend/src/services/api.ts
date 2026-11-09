/**
 * Fetch-based frontend client matched to backend/src/routes/authRoutes.js and
 * backend/src/controllers/authController.js in the supplied repository.
 *
 * Vite proxies /api to the Express server on localhost:5000 during development.
 * Use VITE_API_BASE_URL only when the backend is hosted separately.
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: AuthUser;
  /** Current backend exposes this for local testing only. Never display in production. */
  verificationToken?: string;
  /** Current backend exposes this for local testing only. Never display in production. */
  resetToken?: string;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

const TOKEN_KEY = 'card-deck-builder:auth-token';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Browser storage may be disabled.
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Browser storage may be disabled.
    }
  },
};

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const jwt = tokenStorage.get();
  if (jwt) headers.set('Authorization', `Bearer ${jwt}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('Cannot connect to the backend API. Check that the Express server is running.', 0);
  }

  const raw = await response.text();
  let result: unknown = null;
  if (raw.trim()) {
    try {
      result = JSON.parse(raw) as unknown;
    } catch {
      throw new ApiError(
        'The server did not return JSON. Check the backend server and API URL.',
        response.status,
      );
    }
  }

  const body = result && typeof result === 'object' ? result as Record<string, unknown> : null;
  if (!response.ok || body?.success === false) {
    const message = typeof body?.message === 'string'
      ? body.message
      : response.status === 404
        ? `API endpoint not found (${path}). Confirm the backend mounts /api/auth.`
        : `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }
  return result as T;
}

function post(path: string, payload: Record<string, string>): Promise<AuthResponse> {
  return apiRequest<AuthResponse>(path, { method: 'POST', body: JSON.stringify(payload) });
}

/** These routes and payloads match the supplied Express auth router/controller. */
export const authApi = {
  register(name: string, email: string, password: string) {
    return post('/auth/register', { name, email, password });
  },
  login(email: string, password: string) {
    return post('/auth/login', { email, password });
  },
  verifyEmail(token: string) {
    return post('/auth/verify-email', { token });
  },
  forgotPassword(email: string) {
    return post('/auth/forgot-password', { email });
  },
  resetPassword(token: string, password: string) {
    return post('/auth/reset-password', { token, password });
  },
  me() {
    return apiRequest<AuthResponse>('/auth/me');
  },
};
