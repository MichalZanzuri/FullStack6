// Auth routes: login, register, username availability, logout.
import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { query } from '../db.js';
import * as users from '../queries/users.queries.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/currentUser.js';

const router = Router();

function newToken() {
  return randomBytes(32).toString('hex');
}

// POST /login — verify credentials server-side, issue a session token.
// Returns the public user (never the password) + token, or 401.
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  const result = await users.verifyCredentials(username, password);
  if (!result) return res.status(401).json({ error: 'Invalid credentials' });
  if (result.blocked) return res.status(403).json({ error: 'Account is blocked' });

  const token = newToken();
  await query(`INSERT INTO sessions (token, user_id) VALUES (?, ?)`, [token, result.id]);
  res.json({ ...result, token });
}));

// POST /users — register a new user. Enforces username uniqueness (409),
// returns the public user + a session token so the client logs in immediately.
// Server-side mirror of the client's register validation — the client can be
// bypassed, so these rules are enforced here too (#2 defense in depth).
const USERNAME_RE = /^[a-zA-Z0-9._]{3,20}$/;
const MIN_PASSWORD = 6;

router.post('/users', asyncHandler(async (req, res) => {
  const { username, password, name, email, phone } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Invalid username (3–20 chars: letters, numbers, dot, underscore)' });
  }
  if (String(password).length < MIN_PASSWORD) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters` });
  }
  if (await users.usernameTaken(username)) {
    return res.status(409).json({ error: 'Username taken' });
  }
  const user = await users.create({ name, username, email, phone, password });
  const token = newToken();
  await query(`INSERT INTO sessions (token, user_id) VALUES (?, ?)`, [token, user.id]);
  res.status(201).json({ ...user, token });
}));

// GET /username-available?username= — boolean only, leaks no profile data.
router.get('/username-available', asyncHandler(async (req, res) => {
  const username = typeof req.query.username === 'string' ? req.query.username : '';
  if (!username) return res.status(400).json({ error: 'username required' });
  const taken = await users.usernameTaken(username);
  res.json({ available: !taken });
}));

// POST /logout — invalidate the current token.
router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  await query(`DELETE FROM sessions WHERE token = ?`, [token]);
  res.json({ success: true });
}));

export default router;
