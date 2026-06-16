# Legacy (archived)

`server.js` here is the **old** json-server-based backend from פרק ה'. It has
been fully replaced by the NodeJS + Express + MySQL server in `../src/`.

It is kept only for reference and is **not** wired into the project anymore
(its old dependencies were removed from `package.json`). The real server is:

```bash
npm run db:up && npm run seed && npm start   # src/index.js
```
