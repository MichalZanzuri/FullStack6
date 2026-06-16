// Base HTTP helper. Every resource file imports `request` from here.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// The session token is issued by the server at /login (and /register) and kept
// in Local Storage. We attach it as a Bearer token so the server can identify
// the active user and enforce ownership rules.
const TOKEN_KEY = 'pulse.token';

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export async function request(path, method = 'GET', body = null) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const r = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!r.ok) {
    const e = new Error(`Request failed (${r.status})`);
    e.status = r.status;
    throw e;
  }

  // 204 No Content (e.g. DELETE) — there's no body to parse.
  if (r.status === 204) return null;
  return r.json();
}
