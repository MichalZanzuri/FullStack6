// User routes (mounted at /users). Registration (POST /users) lives in
// auth.routes.js. These cover reads + profile/password/role management.
import { Router } from 'express';
import * as users from '../queries/users.queries.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth, requireAdmin } from '../middleware/currentUser.js';

const router = Router();

// Only the user themselves or an admin may modify a given account.
function selfOrAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role === 'admin' || req.user.id === req.params.id) return next();
  return res.status(403).json({ error: 'You can only modify your own account' });
}

// GET /users — list. LEAN projection only (id, name, username) so we never leak
// everyone's email/phone (#3 minimum). The list is ALWAYS paginated/capped — it
// never returns every row, so a huge user base can't blow up the response.
//   ?username=  → single lookup (one-element array)
//   ?_page= &_per_page=  → page through (default 50, max 100 per page)
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  if (typeof req.query.username === 'string') {
    const u = await users.findByUsername(req.query.username);
    if (!u) return res.json([]);
    const { id, name, username } = u;
    return res.json([{ id, name, username }]);
  }
  res.json(await users.findAllLean({ page: req.query._page, perPage: req.query._per_page }));
}));

// GET /users/:id — the FULL profile only for the user themselves (or an admin);
// anyone else gets the lean projection (#3 minimum exposure).
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const isSelfOrAdmin = req.user.role === 'admin' || req.user.id === req.params.id;
  const u = isSelfOrAdmin
    ? await users.findById(req.params.id)
    : await users.findByIdLean(req.params.id);
  if (!u) return res.status(404).json({ error: 'Not found' });
  res.json(u);
}));

// PUT /users/:id — full profile update (client sends the merged user).
router.put('/:id', requireAuth, selfOrAdmin, asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body || {};
  const updated = await users.update(req.params.id, { name, email, phone });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
}));

// PATCH /users/:id — partial profile update.
router.patch('/:id', requireAuth, selfOrAdmin, asyncHandler(async (req, res) => {
  const updated = await users.update(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
}));

// PATCH /users/:id/password — change password.
//   * self: must provide correct currentPassword
//   * admin: may reset without currentPassword
router.patch('/:id/password', requireAuth, selfOrAdmin, asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 4) {
    return res.status(400).json({ error: 'newPassword must be at least 4 characters' });
  }
  if (req.user.role !== 'admin') {
    const ok = await users.checkPassword(id, currentPassword || '');
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
  }
  await users.changePassword(id, newPassword);
  res.json({ success: true });
}));

// PATCH /users/:id/block — admin blocks/unblocks a user. Body: { blocked: bool }
// An admin may NOT block their own account (would lock themselves out).
router.patch('/:id/block', requireAdmin, asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: "You can't block your own account" });
  }
  const blocked = req.body?.blocked !== false; // default to blocking
  await users.setBlocked(req.params.id, blocked);
  res.json({ success: true, blocked });
}));

// DELETE /users/:id — admin soft-deletes a user (but never their own account).
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: "You can't delete your own account" });
  }
  const ok = await users.softDelete(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
}));

export default router;
