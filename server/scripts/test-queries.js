// Smoke test for the query layer (שלב ב': "ובדקו את הפונקציות שכתבתם").
// UUID-safe: derives real ids from the seeded data instead of assuming 1,2,3.
import { pool } from '../src/db.js';
import * as users from '../src/queries/users.queries.js';
import * as todos from '../src/queries/todos.queries.js';
import * as posts from '../src/queries/posts.queries.js';
import * as comments from '../src/queries/comments.queries.js';
import * as albums from '../src/queries/albums.queries.js';
import * as photos from '../src/queries/photos.queries.js';

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`); }
}
const isUuid = (v) => typeof v === 'string' && /^[0-9a-f-]{36}$/.test(v);

async function main() {
  console.log('USERS');
  const page = await users.findAll();        // paginated wrapper
  const all = page.data;
  check('findAll is paginated (wrapper)', Array.isArray(page.data) && typeof page.items === 'number');
  check('findAll returns users', all.length >= 6);
  check('ids are UUIDs (not sequential)', all.every((u) => isUuid(u.id)));
  check('no password field leaks', all.every((u) => !('password' in u) && !('password_hash' in u) && !('website' in u)));
  check('per_page is capped (<=100)', (await users.findAll({ perPage: 100000 })).data.length <= 100);
  const U = all[0].id;                       // a real user id to work with
  const u1 = await users.findById(U);
  check('findById', u1 && u1.username);
  check('findByUsername matches', (await users.findByUsername(u1.username))?.id === U);
  check('lean projection hides email', (await users.findAllLean()).data.every((u) => !('email' in u)));
  check('usernameTaken(existing)=true', (await users.usernameTaken(u1.username)) === true);
  check('usernameTaken(nope)=false', (await users.usernameTaken('no_such_user_zzz')) === false);

  console.log('CREDENTIALS / LOGIN');
  check('verifyCredentials wrong password -> null', (await users.verifyCredentials(u1.username, 'definitely-wrong')) === null);

  console.log('TODOS');
  const t = await todos.list({ userId: U, _sort: 'id' });
  check('list by userId', Array.isArray(t) && t.every((x) => x.userId === U));
  const tPage = await todos.list({ userId: U, _page: 1, _per_page: 2 });
  check('pagination wrapper shape', tPage.data && typeof tPage.items === 'number' && 'next' in tPage);
  const newTodo = await todos.create({ userId: U, title: '__test todo__', completed: false });
  check('create todo (UUID id)', newTodo && isUuid(newTodo.id));
  const upd = await todos.update(newTodo.id, { completed: true });
  check('update todo completed', upd.completed === true);
  check('ownerOf todo', (await todos.ownerOf(newTodo.id)) === U);
  check('softDelete todo', (await todos.softDelete(newTodo.id)) === true);
  check('soft-deleted todo not in getById', (await todos.getById(newTodo.id)) === null);

  console.log('POSTS / COMMENTS (+cascade)');
  const np = await posts.create({ userId: U, title: '__t__', body: 'b' });
  const nc = await comments.create({ postId: np.id, userId: U, body: 'hi' });
  check('comment create', nc.postId === np.id);
  check('post ownerOf', (await posts.ownerOf(np.id)) === U);
  await posts.softDelete(np.id);
  check('post soft-deleted', (await posts.getById(np.id)) === null);
  check('comment cascade-deleted with post', (await comments.getById(nc.id)) === null);

  console.log('ALBUMS / PHOTOS (+cascade)');
  const na = await albums.create({ userId: U, title: '__a__' });
  const nph = await photos.create({ albumId: na.id, title: 'p', url: 'x' });
  check('photo create', nph.albumId === na.id);
  check('photo ownerOf via album', (await photos.ownerOf(nph.id)) === U);
  await albums.softDelete(na.id);
  check('album soft-deleted', (await albums.getById(na.id)) === null);
  check('photo cascade-deleted with album', (await photos.getById(nph.id)) === null);

  console.log(`\n${pass} passed, ${fail} failed`);
  await pool.end();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('TEST CRASHED:', e); process.exit(1); });
