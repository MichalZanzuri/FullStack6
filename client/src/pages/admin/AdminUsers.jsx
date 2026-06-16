import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldCheck, ShieldOff, Ban, Check } from 'lucide-react';

import { useAuth } from '../../context/useAuth.js';
import Button from '../../components/ui/Button.jsx';
import {
  fetchStats,
  fetchUsersPage,
  promote,
  demote,
  block,
  unblock,
} from '../../services/adminService.js';
import styles from '../../styles/AdminUsers.module.css';

const PAGE_SIZE = 20;

export default function AdminUsers() {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // Client-side guard (the server enforces requireAdmin regardless).
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchStats(), fetchUsersPage(1, PAGE_SIZE)])
      .then(([s, firstPage]) => {
        if (cancelled) return;
        setStats(s);
        setUsers(firstPage.data);
        setHasMore(firstPage.hasMore);
        setTotal(firstPage.total ?? firstPage.data.length);
        setPage(1);
      })
      .catch(() => toast("Couldn't load the admin panel."))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/home" replace />;

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await fetchUsersPage(next, PAGE_SIZE);
      setUsers((prev) => {
        const seen = new Set(prev.map((u) => u.id));
        return [...prev, ...res.data.filter((u) => !seen.has(u.id))];
      });
      setHasMore(res.hasMore);
      setPage(next);
    } catch {
      toast("Couldn't load more users.");
    } finally {
      setLoadingMore(false);
    }
  }

  // Apply a change locally after a successful server action.
  function patchUser(id, changes) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...changes } : u)));
  }

  async function act(id, fn, changes, okMsg) {
    setBusyId(id);
    try {
      await fn(id);
      patchUser(id, changes);
      toast(okMsg);
    } catch (err) {
      toast(err?.data?.error || "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  const statCards = stats
    ? [
        ['Users', stats.users], ['Todos', stats.todos], ['Posts', stats.posts],
        ['Comments', stats.comments], ['Albums', stats.albums], ['Photos', stats.photos],
      ]
    : [];

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Admin · Users</h1>
          <p className={styles.sub}>
            {total} user{total === 1 ? '' : 's'} in the system
          </p>
        </div>
      </header>

      {stats && (
        <div className={styles.stats}>
          {statCards.map(([label, value]) => (
            <div key={label} className={styles.statCard}>
              <div className={styles.statValue}>{value}</div>
              <div className={styles.statLabel}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === user.id;
                const busy = busyId === u.id;
                return (
                  <tr key={u.id} className={u.isBlocked ? styles.blockedRow : ''}>
                    <td>{u.name}</td>
                    <td>@{u.username}</td>
                    <td className={styles.muted}>{u.email || '—'}</td>
                    <td>
                      <span className={u.role === 'admin' ? styles.badgeAdmin : styles.badgeUser}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.isBlocked
                        ? <span className={styles.badgeBlocked}>blocked</span>
                        : <span className={styles.badgeActive}>active</span>}
                    </td>
                    <td className={styles.actions}>
                      {isSelf ? (
                        <span className={styles.muted}>(you)</span>
                      ) : (
                        <>
                          {u.role === 'admin' ? (
                            <Button size="sm" variant="ghost" disabled={busy}
                              onClick={() => act(u.id, demote, { role: 'user' }, `${u.username} is now a user`)}>
                              <ShieldOff size={14} /> Demote
                            </Button>
                          ) : (
                            <Button size="sm" variant="secondary" disabled={busy}
                              onClick={() => act(u.id, promote, { role: 'admin' }, `${u.username} is now an admin`)}>
                              <ShieldCheck size={14} /> Make admin
                            </Button>
                          )}
                          {u.isBlocked ? (
                            <Button size="sm" variant="secondary" disabled={busy}
                              onClick={() => act(u.id, unblock, { isBlocked: false }, `${u.username} unblocked`)}>
                              <Check size={14} /> Unblock
                            </Button>
                          ) : (
                            <Button size="sm" variant="danger" disabled={busy}
                              onClick={() => act(u.id, block, { isBlocked: true }, `${u.username} blocked`)}>
                              <Ban size={14} /> Block
                            </Button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {hasMore && (
            <div className={styles.loadMore}>
              <Button onClick={loadMore} disabled={loadingMore} fullWidth>
                {loadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
