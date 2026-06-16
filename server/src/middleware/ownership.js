// Factory that builds an ownership guard for a resource. The resource's query
// module must expose `ownerOf(id) -> userId | null`. Enforces the assignment's
// rule that PUT/DELETE on posts/comments (and albums/photos) only work when the
// item belongs to the active user. Admins bypass the check.
export function requireOwner(queryModule, paramName = 'id') {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Authentication required' });
      const id = req.params[paramName];
      const ownerId = await queryModule.ownerOf(id);
      if (ownerId == null) return res.status(404).json({ error: 'Not found' });
      if (req.user.role === 'admin' || ownerId === req.user.id) return next();
      return res.status(403).json({ error: 'You can only modify your own items' });
    } catch (e) {
      next(e);
    }
  };
}
