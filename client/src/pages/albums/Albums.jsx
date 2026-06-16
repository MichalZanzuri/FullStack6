import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../context/useAuth.js';
import {
  getAlbumsByUserId,
  addAlbum,
  countPhotosInAlbum,
} from '../../services/albumService.js';
import { getCache, setCache } from '../../utils/cache.js';
import { usePersistentState } from '../../hooks/usePersistentState.js';

import Button from '../../components/ui/Button.jsx';
import Dialog from '../../components/ui/Dialog.jsx';
import styles from '../../styles/Albums.module.css';

export default function Albums() {
  const { user } = useAuth();
  const userId = user?.id;

  const [albums, setAlbums] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = usePersistentState('albums-search', '');
  const [showNew, setShowNew] = useState(false);

  const cacheKey = `user-${userId}-albums`;

  /* Load albums — skip the network call entirely if we have them cached.
     Counts are fetched separately because they can change from other pages. */
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function loadCounts(list) {
      const entries = await Promise.all(
        list.map(async (a) => [
          a.id,
          await countPhotosInAlbum(a.id).catch(() => 0),
        ])
      );
      if (!cancelled) setCounts(Object.fromEntries(entries));
    }

    async function loadAlbums() {
      const cached = getCache(cacheKey);
      if (cached) {
        setAlbums(cached);
        setLoading(false);
        loadCounts(cached);
        return;
      }
      setLoading(true);
      try {
        const list = await getAlbumsByUserId(userId);
        if (cancelled) return;
        setAlbums(list);
        setCache(cacheKey, list);
        loadCounts(list);
      } catch {
        toast("Couldn't load your albums.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAlbums();
    return () => { cancelled = true; };
  }, [userId, cacheKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return albums;
    return albums.filter(
      (a) => String(a.id).toLowerCase().includes(q) || a.title.toLowerCase().includes(q)
    );
  }, [albums, search]);

  async function createAlbum(title) {
    try {
      const created = await addAlbum({
        userId,
        title: title.trim(),
      });
      const next = [created, ...albums];
      setAlbums(next);
      setCache(cacheKey, next);
      setCounts((prev) => ({ ...prev, [created.id]: 0 }));
      toast('Album created');
      setShowNew(false);
    } catch {
      toast("Couldn't create album.");
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Albums</h1>
          <p className={styles.sub}>{albums.length} albums</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus size={16} /> New album
        </Button>
      </header>

      <label className={styles.searchWrap}>
        <Search size={14} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search albums by id or title…"
          className={styles.searchInput}
        />
      </label>

      {loading ? (
        <div className={styles.empty}>Loading your albums…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          {albums.length === 0
            ? 'No albums yet. Create your first album to start saving photos.'
            : `No albums match "${search}".`}
        </div>
      ) : (
        <ul className={styles.grid}>
          {filtered.map((album) => (
            <li key={album.id}>
              <Link
                to={`/users/${user?.username}/albums/${album.id}/photos`}
                className={styles.card}
              >
                <div className={styles.cover} style={coverGradient(album.id)}>
                  <ImageIcon size={28} color="#fff" />
                </div>
                <div className={styles.cardBody}>
                  <span className={styles.cardId}>#{album.id}</span>
                  <span className={styles.cardTitle}>{album.title}</span>
                  <span className={styles.cardMeta}>
                    {counts[album.id] != null ? `${counts[album.id]} photos` : '—'}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showNew && (
        <NewAlbumDialog onCreate={createAlbum} onClose={() => setShowNew(false)} />
      )}
    </div>
  );
}

function coverGradient(id) {
  const grads = [
    'linear-gradient(135deg, #FCAF45, #F77737)',
    'linear-gradient(135deg, #E1306C, #C13584)',
    'linear-gradient(135deg, #C13584, #833AB4)',
    'linear-gradient(135deg, #833AB4, #515BD4)',
    'linear-gradient(135deg, #F77737, #E1306C)',
  ];
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return { background: grads[Math.abs(h) % grads.length] };
}

function NewAlbumDialog({ onCreate, onClose }) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onCreate(title);
    setSaving(false);
  }

  return (
    <Dialog
      title="Create new album"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={!title.trim()}>
            Create album
          </Button>
        </>
      }
    >
      <form onSubmit={submit}>
        <label>
          <span className={styles.formLabel}>Album title</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Summer 2024"
            className={styles.formInput}
          />
        </label>
      </form>
    </Dialog>
  );
}
