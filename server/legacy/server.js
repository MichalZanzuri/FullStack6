// Local JSON-Server for the Pulse React app — wrapped with a thin auth layer.
//
// The assignment requires the "password" to live in each user's `website` field
// (see `פרק ה – יחידות 9 עד 14`). To stop that secret from ever leaving the
// server, this wrapper does two things on top of plain json-server:
//
//   1. Exposes POST /login that compares credentials server-side and returns
//      the user record stripped of `website` (or 401 with no other detail).
//   2. Filters `website` out of every /users response, regardless of method.
//
// Everything else (CRUD on todos/posts/albums/comments/photos and register
// via POST /users) is delegated to json-server unchanged.

import { App } from '@tinyhttp/app';
import { cors } from '@tinyhttp/cors';
import { json } from 'milliparsec';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { createApp } from 'json-server/lib/app.js';
import { watch } from 'chokidar';

const DB_FILE = './db.json';
const PORT = 4000;

const adapter = new JSONFile(DB_FILE);
const db = new Low(adapter, {});
await db.read();

const app = new App();

// CORS for everything we own (json-server has its own internal CORS, but
// /login lives on this outer app so without this the browser blocks the
// actual POST response).
app.use((req, res, next) => cors()(req, res, next));

// POST /login — server-side credential check
app.use('/login', json());
app.post('/login', async (req, res) => {
  await db.read();
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  const user = (db.data.users || []).find((u) => u.username === username);
  if (!user || user.website !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const { website, ...safeUser } = user;
  res.json(safeUser);
});

// Strip the password field from every /users response.
// json-server re-extends `res.json` inside its mounted sub-app, so wrapping
// `res.json` directly gets overwritten. Instead we wrap the raw `res.end` —
// that's what `res.json` eventually calls, and Node.js doesn't reassign it.
function stripWebsite(value) {
  if (!value || typeof value !== 'object') return value;
  const { website, ...rest } = value;
  return rest;
}
app.use('/users', (req, res, next) => {
  const origEnd = res.end.bind(res);
  res.end = (chunk, ...rest) => {
    const ct = String(res.getHeader('content-type') || '');
    if (chunk && ct.includes('application/json')) {
      const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
      try {
        const parsed = JSON.parse(text);
        const sanitized = Array.isArray(parsed)
          ? parsed.map(stripWebsite)
          : stripWebsite(parsed);
        const out = JSON.stringify(sanitized, null, 2);
        res.setHeader('Content-Length', Buffer.byteLength(out));
        return origEnd(out, ...rest);
      } catch {
        // not parseable JSON — fall through unchanged
      }
    }
    return origEnd(chunk, ...rest);
  };
  next();
});

// json-server echoes the affected resource on DELETE/PATCH/PUT. The client
// already knows what it sent (or just removed), so we collapse the body to a
// minimal status payload — the record itself is no longer leaked, and the
// caller still gets a clear "did it work?" signal in the Network tab.
const SILENCE_METHODS = new Set(['DELETE', 'PATCH', 'PUT']);
app.use((req, res, next) => {
  if (!SILENCE_METHODS.has(req.method)) return next();
  const origEnd = res.end.bind(res);
  res.end = (chunk, ...rest) => {
    const ct = String(res.getHeader('content-type') || '');
    if (chunk && ct.includes('application/json')) {
      const ok = res.statusCode >= 200 && res.statusCode < 300;
      const out = JSON.stringify({ success: ok });
      res.setHeader('Content-Length', Buffer.byteLength(out));
      return origEnd(out, ...rest);
    }
    return origEnd(chunk, ...rest);
  };
  next();
});

// Override json-server's POST handler for every collection so new records get
// short sequential numeric ids ("1", "2", ...) instead of nanoid-style random
// strings. Registered BEFORE the json-server mount so these handlers win.
const COLLECTIONS = ['users', 'todos', 'posts', 'comments', 'albums', 'photos'];
function nextNumericId(arr) {
  const max = arr.reduce((m, item) => {
    const n = Number(item.id);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return String(max + 1);
}
// json-server v1 coerces numeric query params to numbers when filtering
// (parse-where.js → coerceValue). So foreign keys must be stored as numbers
// for `?userId=6` to match. Clients tend to send them as strings (since
// user.id from the API is a string), so we coerce on the way in.
function coerceForeignKeys(body) {
  if (!body || typeof body !== 'object') return body;
  const out = { ...body };
  for (const k of Object.keys(out)) {
    if (k === 'id') continue;
    if (!k.endsWith('Id')) continue;
    const v = out[k];
    if (typeof v === 'string' && /^[0-9]+$/.test(v)) out[k] = Number(v);
  }
  return out;
}
COLLECTIONS.forEach((name) => {
  // Chain json() as route-level middleware so it only runs for POST requests
  // on this path. Earlier we had `app.use('/${name}', json())` which fired
  // milliparsec on every method — DELETE with no body hung waiting for an
  // 'end' event that had already been consumed.
  app.post(`/${name}`, json(), async (req, res) => {
    await db.read();
    if (!Array.isArray(db.data[name])) db.data[name] = [];
    const items = db.data[name];
    // For users, enforce username uniqueness server-side so the client doesn't
    // need to pre-fetch (which would leak the existing user's profile data).
    if (name === 'users') {
      const submittedUsername = req.body?.username;
      if (submittedUsername && items.some((u) => u.username === submittedUsername)) {
        return res.status(409).json({ error: 'Username taken' });
      }
    }
    const id = nextNumericId(items);
    const created = { ...coerceForeignKeys(req.body || {}), id };
    items.push(created);
    await db.write();
    if (name === 'users') {
      const { website, ...safe } = created;
      return res.status(201).json(safe);
    }
    res.status(201).json(created);
  });
});

// Lightweight availability check for the register form — returns ONLY the
// boolean so we never leak any data about an existing user.
app.get('/username-available', async (req, res) => {
  await db.read();
  const username = typeof req.query?.username === 'string' ? req.query.username : '';
  if (!username) {
    return res.status(400).json({ error: 'username required' });
  }
  const taken = (db.data.users || []).some((u) => u.username === username);
  res.json({ available: !taken });
});

// Delegate everything else (todos, posts, comments, albums, photos, plus
// POST /users for register) to json-server.
const jsonServerApp = createApp(db, { logger: false });
app.use(jsonServerApp);

// Reload db.json if it changes on disk (matches json-server's CLI behavior).
watch(DB_FILE).on('change', () => {
  db.read().catch(() => {});
});

app.listen(PORT, () => {
  console.log(`JSON Server (with /login) listening on http://localhost:${PORT}`);
});
