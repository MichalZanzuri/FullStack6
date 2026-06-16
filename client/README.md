# Pulse · Client (React + Vite)

The web client for Pulse. Talks to the Express + MySQL API in `../server`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173  (API must be running on :4000)
```

## Architecture — how the code is layered

Data flows in one direction, each layer with a single responsibility:

```
pages / components (UI)
        ↓ calls
services/        ← domain logic (token handling, pagination normalization, error messages)
        ↓ calls
api/             ← thin HTTP layer (builds URLs, calls request(), attaches the auth token)
        ↓ fetch
Express API (:4000)
```

Pages never call `api/` directly — they go through `services/`. There is a single
HTTP entry point (`api/api.js` → `request()`), which also stores the session token.

## Folder map

| Folder | Responsibility |
|--------|----------------|
| `src/api/` | One file per resource; builds the URL and calls `request()`. No logic. |
| `src/services/` | Domain logic between API and UI (auth, posts, todos, albums, admin). |
| `src/context/` | `AuthContext` — who is logged in (+ `useAuth` hook). |
| `src/hooks/` | Reusable stateful logic (`useTodos`, `usePersistentState`). |
| `src/routes/` | `AppRoutes` — the single route table (public vs. protected). |
| `src/components/layout/` | App chrome: `AppShell`, `SideNav`, `RequireAuth`, `ProfileSheet`. |
| `src/components/ui/` | Reusable primitives: `Button`, `Dialog`, `TextField`, … |
| `src/pages/` | One folder per feature (`posts/`, `todos/`, `albums/`, `admin/`, `register/`). |
| `src/styles/` | CSS modules (one per component) + `tokens.css` (design tokens). |
| `src/utils/` | Framework-agnostic helpers (`cache.js`, `imageLoader.js`). |

## Trace a feature (example: login)

`pages/Login.jsx` → `useAuth().login` (`context/AuthContext.jsx`) →
`loginUser` (`services/authService.js`) → `request('/login')` (`api/api.js`).
The token returned by the server is stored by `api/api.js` and sent as a
`Bearer` header on every later request.
