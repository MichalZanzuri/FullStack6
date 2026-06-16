# Pulse Server — NodeJS + Express + MySQL (פרק ו')

REST API for the Pulse app, backed by **MySQL** (in Docker) and **Express**.
Replaces the old json-server backend. The React client lives in `../client`.

## Prerequisites
- Node.js 18+ (tested on v22)
- Docker Desktop (for MySQL) — the DB runs in a container, nothing to install globally.

## Quick start

```bash
cd server
npm install

# 1) Start MySQL 8 in Docker (schema auto-loads on first boot)
npm run db:up          # docker compose up -d

# 2) Seed the DB from the legacy db.json (users, todos, posts, ...)
npm run seed           # passwords are hashed into the protected `credentials` table

# 3) Run the API server
npm start              # http://localhost:4000

# in another terminal — run the client
cd ../client
npm install
npm run dev            # http://localhost:5173
```

Useful scripts:

| Command | What it does |
|---------|--------------|
| `npm run db:up` | Start the MySQL container |
| `npm run db:down` | Stop the container (keeps data) |
| `npm run db:reset` | Wipe the volume and recreate the DB |
| `npm run seed` | (Re)load data from `db.json` |
| `npm run test:queries` | Smoke-test the query layer |
| `npm start` / `npm run dev` | Run the API (dev = `--watch`) |

## Test users (seeded from db.json)

| username | password | role |
|----------|----------|------|
| `shaked.h` | `pulse123` | **admin** |
| `maya_c` | `hello456` | user |
| `dan_l` | `sunny789` | user |

> The **first** seeded user is promoted to `admin` so the management endpoints have an entry point.

## Architecture

```
src/
  index.js              entry point (verifies DB, starts listening)
  db.js                 mysql2 connection pool + query/one helpers
  app.js                Express app: CORS, JSON, auth context, routers
  middleware/
    currentUser.js      resolves req.user from the Bearer token
    ownership.js        enforces "only the owner may modify" (posts/comments/...)
    errorHandler.js     central error mapping
  queries/              ← dedicated DB functions ("פונקציות ייעודיות")
    *.queries.js        one module per resource, parameterized SQL only
  routes/               thin Express routers calling the query layer
sql/schema.sql          full DB schema (tables, FKs, indexes)
scripts/seed.js         db.json -> MySQL migration
postman/                Postman collection covering every route
```

## Auth model
- `POST /login` verifies the password (bcrypt) against the **separate, protected
  `credentials` table** and issues an opaque session token.
- The client stores the token in Local Storage and sends it as
  `Authorization: Bearer <token>`.
- `currentUser` middleware resolves `req.user`; `requireAuth` / `requireAdmin` /
  `requireOwner` gate the protected routes.
- The password is **never** returned by any endpoint.

## "What is a delete?"
All deletes are **soft deletes** (`is_deleted = 1`). Rows are never physically
removed, so an admin could restore them and history is preserved. Deleting a
post cascades the soft-delete to its comments.

## Endpoints (summary)

```
POST   /login                      POST   /logout
POST   /users  (register)          GET    /username-available?username=

GET    /users        GET /users/:id    PUT/PATCH /users/:id
PATCH  /users/:id/password          PATCH /users/:id/block   DELETE /users/:id (admin)

GET|POST              /todos        GET|PUT|PATCH|DELETE  /todos/:id
GET|POST              /posts        GET|PUT|PATCH|DELETE  /posts/:id
GET|POST              /comments     GET|PUT|PATCH|DELETE  /comments/:id
GET|POST              /albums       GET|PUT|PATCH|DELETE  /albums/:id
GET|POST              /photos       GET|PUT|PATCH|DELETE  /photos/:id

GET    /admin/stats   GET /admin/users   PATCH /admin/users/:id/role
```

Query params (jsonplaceholder-style): `?userId=`, `?postId=`, `?albumId=`,
`?completed=`, `?_sort=`, `?_order=`, `?_page=`, `?_per_page=`.
Paginated responses use the `{ data, first, prev, next, last, pages, items }` wrapper.

## Testing
- `npm run test:queries` — exercises the query functions against the seeded DB.
- `bash scripts/test-api.sh` — end-to-end HTTP test of every route group
  (auth, ownership, pagination, admin) — requires the server running.
- `postman/pulse.postman_collection.json` — import into Postman; run top-to-bottom.
