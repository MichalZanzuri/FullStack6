// Builds a standard REST router for a resource, wired to its query module.
// Endpoints (jsonplaceholder-style):
//   GET    /            list (with ?filters, ?_sort, ?_page&_per_page)
//   GET    /:id         single
//   POST   /            create (owner forced to the active user where relevant)
//   PUT    /:id         full update  — ownership enforced
//   PATCH  /:id         partial update — ownership enforced
//   DELETE /:id         soft delete  — ownership enforced
//
// `opts`:
//   queries      the resource's query module (list/getById/create/update/softDelete/ownerOf)
//   buildCreate  (body, req) => object passed to queries.create
//   ownership    'self' (default) enforce owner on mutations | 'none' skip
import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/currentUser.js';
import { requireOwner } from '../middleware/ownership.js';

export function makeResourceRouter({ queries, buildCreate, ownership = 'self' }) {
  const router = Router();
  const owner = ownership === 'self' ? [requireOwner(queries)] : [];

  router.get('/', requireAuth, asyncHandler(async (req, res) => {
    res.json(await queries.list(req.query));
  }));

  router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
    const row = await queries.getById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  }));

  router.post('/', requireAuth, asyncHandler(async (req, res) => {
    const payload = await buildCreate(req.body || {}, req);
    if (payload === null) return res.status(403).json({ error: 'Not allowed' });
    const created = await queries.create(payload);
    res.status(201).json(created);
  }));

  router.put('/:id', requireAuth, ...owner, asyncHandler(async (req, res) => {
    const updated = await queries.update(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  }));

  router.patch('/:id', requireAuth, ...owner, asyncHandler(async (req, res) => {
    const updated = await queries.update(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  }));

  router.delete('/:id', requireAuth, ...owner, asyncHandler(async (req, res) => {
    const ok = await queries.softDelete(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  }));

  return router;
}
