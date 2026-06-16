import { request } from './api.js';

// Admin-only endpoints. The server enforces requireAdmin on all of these — the
// token identifies the user and the role is read from the DB, so these can't be
// called by a non-admin even if the UI were bypassed.

export async function getAdminStats() {
  return request('/admin/stats');
}

// Paginated list of all users (default 20 per page; server caps at 100).
export async function getAdminUsers(page = 1, perPage = 20) {
  return request(`/admin/users?_page=${page}&_per_page=${perPage}`);
}

export async function setUserRole(id, role) {
  return request(`/admin/users/${id}/role`, 'PATCH', { role });
}

export async function setUserBlocked(id, blocked) {
  return request(`/users/${id}/block`, 'PATCH', { blocked });
}
