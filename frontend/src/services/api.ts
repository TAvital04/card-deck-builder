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
        ? `API endpoint not found (${path}). Confirm that Express mounted this route.`
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

/** Turn 8 API contracts match the current Express controllers and Mongoose Deck model. */
export type CardGame = 'Yu-Gi-Oh!' | 'MTG';

export interface DeckCard {
  _id?: string;
  name: string;
  count: number;
  category?: string;
  role?: string;
  notes?: string;
}

export interface Deck {
  _id: string;
  name: string;
  game: CardGame;
  cards: DeckCard[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DeckPayload {
  name: string;
  game: CardGame;
  cards: DeckCard[];
}

interface DataResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface SearchCard {
  _id: string;
  name: string;
  game?: string;
  category?: string;
  role?: string;
  description?: string;
}

export interface CardSearchResponse extends DataResponse<SearchCard[]> {
  count: number;
}

export interface SingleProbabilityResult {
  atLeastDesired: number;
  atLeastDesiredPct: number;
  exactDesired: number;
  exactDesiredPct: number;
  zeroCopiesPct: number;
  distribution: { copies: number; probability: number; percentage: number }[];
}

export interface ComboProbabilityResult {
  probability: number;
  percentage: number;
}

function jsonRequest<T>(path: string, method: 'POST' | 'PUT', payload: object): Promise<T> {
  return apiRequest<T>(path, { method, body: JSON.stringify(payload) });
}

export const deckApi = {
  list: () => apiRequest<DataResponse<Deck[]>>('/decks'),
  get: (id: string) => apiRequest<DataResponse<Deck>>(`/decks/${encodeURIComponent(id)}`),
  create: (deck: DeckPayload) => jsonRequest<DataResponse<Deck>>('/decks', 'POST', deck),
  update: (id: string, deck: DeckPayload) => jsonRequest<DataResponse<Deck>>(`/decks/${encodeURIComponent(id)}`, 'PUT', deck),
  remove: (id: string) => apiRequest<{ success: boolean; message: string }>(`/decks/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  exportText: (id: string) => apiRequest<DataResponse<string>>(`/decks/${encodeURIComponent(id)}/export`),
};

export const cardApi = {
  // The backend performs case-insensitive substring matching; AbortSignal prevents stale responses.
  search: (query: string, signal?: AbortSignal) => {
    // Current server uses query text directly in $regex; escape syntax characters
    // so a typed name is treated as a literal substring (e.g. 'C++').
    const literal = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return apiRequest<CardSearchResponse>(`/cards/search?query=${encodeURIComponent(literal)}`, { signal });
  },
};

export const calcApi = {
  single: (parameters: { deckSize: number; targetCopies: number; drawSize: number; minDesired: number }) =>
    jsonRequest<DataResponse<SingleProbabilityResult>>('/calc/single', 'POST', parameters),
  combo: (parameters: { deckSize: number; copiesA: number; copiesB: number; drawSize: number; minA: number; minB: number }) =>
    jsonRequest<DataResponse<ComboProbabilityResult>>('/calc/combo', 'POST', parameters),
};
