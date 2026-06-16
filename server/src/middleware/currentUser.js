// Resolves the active user from the opaque token sent in the Authorization
// header (issued at login, stored in the client's Local Storage). Attaches
// `req.user` when valid. Does NOT reject — that's the job of `requireAuth`.
import { one } from '../db.js';

export async function currentUser(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    if (token) {
      const row = await one(
        `SELECT u.id, u.name, u.username, u.email, u.phone, u.role,
                u.is_blocked AS isBlocked
           FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token = ? AND u.is_deleted = 0`,
        [token]
      );
      if (row && !row.isBlocked) req.user = row;
    }
  } catch {
    // ignore — unauthenticated request continues without req.user
  }
  next();
}

// Gate that requires a logged-in user.
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

// Gate that requires an admin user.
export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}
