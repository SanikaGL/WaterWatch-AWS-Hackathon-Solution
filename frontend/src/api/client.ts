// Single API wrapper. Base URL comes from VITE_API_URL in production builds;
// in dev it defaults to "/api" which Vite proxies to the local backend.
const BASE = import.meta.env.VITE_API_URL || "/api";

export interface ApiError {
  error: string;
  details?: unknown;
}

// Auth is injected by the AuthProvider. Two modes:
// - Real Cognito: returns { token } -> sent as Authorization: Bearer.
// - Local dev: returns { devGroups } -> sent as x-dev-groups (backend shim).
export interface AuthHeaders {
  token?: string;
  devGroups?: string[];
}
let authProvider: () => AuthHeaders = () => ({});
export function setAuthProvider(fn: () => AuthHeaders) {
  authProvider = fn;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = authProvider();
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  if (auth.devGroups && auth.devGroups.length) headers["x-dev-groups"] = auth.devGroups.join(",");

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw Object.assign(new Error((data as ApiError)?.error || `HTTP ${res.status}`), { status: res.status, data });
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
};
