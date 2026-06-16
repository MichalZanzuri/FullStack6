// Central error handler — keeps routes free of try/catch boilerplate for
// unexpected failures. Known DB errors get friendly status codes.
export function notFound(_req, res) {
  res.status(404).json({ error: 'Route not found' });
}

export function errorHandler(err, _req, res, _next) {
  // Duplicate key (e.g. username UNIQUE) -> 409
  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Already exists' });
  }
  // FK failures -> 400 (client referenced something that doesn't exist)
  if (err && (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2')) {
    return res.status(400).json({ error: 'Invalid reference' });
  }
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
}

// Wrap an async route handler so thrown errors reach errorHandler.
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
