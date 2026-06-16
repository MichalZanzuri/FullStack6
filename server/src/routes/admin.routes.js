// Admin routes (mounted at /admin, all behind requireAdmin). Lightweight
// management surface for the advanced "חשבון מנהל" stage.
import { Router } from 'express';
import { query } from '../db.js';
import * as users from '../queries/users.queries.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAdmin } from '../middleware/currentUser.js';

const router = Router();
router.use(requireAdmin);

// GET /admin/stats — counts across all resources (active rows only).
router.get('/stats', asyncHandler(async (_req, res) => {
  const tables = ['users', 'todos', 'posts', 'comments', 'albums', 'photos'];
  const stats = {};
  for (const t of tables) {
    const [row] = await query(`SELECT COUNT(*) AS cnt FROM ${t} WHERE is_deleted = 0`);
    stats[t] = row.cnt;
  }
  res.json(stats);
}));

// GET /admin/users — full list (paginated + capped). Even with a million users
// this returns at most one page (default 50, max 100); ?_page=&_per_page= to walk
// through them. Response is the { data, next, last, pages, items, ... } wrapper.
router.get('/users', asyncHandler(async (req, res) => {
  res.json(await users.findAll({ page: req.query._page, perPage: req.query._per_page }));
}));

// PATCH /admin/users/:id/role — promote/demote. Body: { role: 'user'|'admin' }
// An admin may NOT demote their own account (would strip their own access).
router.patch('/users/:id/role', asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: "You can't change your own role" });
  }
  const role = req.body?.role === 'admin' ? 'admin' : 'user';
  await users.setRole(req.params.id, role);
  res.json({ success: true, role });
}));

export default router;
