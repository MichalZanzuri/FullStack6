// Promote (or demote) a user's role from the command line — handy because there
// is no public route that lets just anyone become an admin.
//
//   node scripts/make-admin.js <username>            -> make them an admin
//   node scripts/make-admin.js <username> user       -> demote back to a user
//   node scripts/make-admin.js --list                -> list all admins
//
import { pool, query } from '../src/db.js';

async function main() {
  const arg = process.argv[2];
  const roleArg = (process.argv[3] || 'admin').toLowerCase();
  const role = roleArg === 'user' ? 'user' : 'admin';

  if (!arg || arg === '--list') {
    const admins = await query(`SELECT username FROM users WHERE role='admin' AND is_deleted=0 ORDER BY username`);
    console.log('Current admins:', admins.length ? admins.map((a) => a.username).join(', ') : '(none)');
    await pool.end();
    return;
  }

  const res = await query(`UPDATE users SET role = ? WHERE username = ? AND is_deleted = 0`, [role, arg]);
  if (res.affectedRows === 0) {
    console.error(`No user named "${arg}".`);
    process.exit(1);
  }
  console.log(`✓ "${arg}" is now a ${role}.`);
  await pool.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
