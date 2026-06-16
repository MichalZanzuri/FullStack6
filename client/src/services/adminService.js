import {
  getAdminStats,
  getAdminUsers,
  setUserRole,
  setUserBlocked,
} from '../api/apiAdmin.js';

export async function fetchStats() {
  return getAdminStats();
}

/* Returns one page of users plus a `hasMore` flag derived from the server's
   pagination wrapper, so the page can offer "Load more" without ever pulling
   the whole users table at once. */
export async function fetchUsersPage(page, perPage) {
  const res = await getAdminUsers(page, perPage);
  if (Array.isArray(res)) return { data: res, hasMore: false };
  return { data: res?.data ?? [], hasMore: res?.next != null, total: res?.items ?? 0 };
}

export async function promote(id) {
  return setUserRole(id, 'admin');
}

export async function demote(id) {
  return setUserRole(id, 'user');
}

export async function block(id) {
  return setUserBlocked(id, true);
}

export async function unblock(id) {
  return setUserBlocked(id, false);
}
