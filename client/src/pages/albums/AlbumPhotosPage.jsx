import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Link as LinkIcon,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../context/useAuth.js';
import { removeCacheByPrefix } from '../../utils/cache.js';
import {
  getAlbum,
  deleteAlbum as delAlbum,
  updateAlbum,
  getPhotosPage,
  addPhoto,
  updatePhoto,
  deletePhoto as delPhoto,
} from '../../services/albumService.js';
import { readPicture } from '../../utils/imageLoader.js';

import Button from '../../components/ui/Button.jsx';
import Dialog from '../../components/ui/Dialog.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import styles from '../../styles/AlbumPhotosPage.module.css';

const PHOTOS_PAGE_SIZE = 5;   // show 5, then "Load more" fetches the next 5

export default function AlbumPhotosPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const { albumId } = useParams();
  const navigate = useNavigate();

  const [album, setAlbum] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  /* Pagination: the highest page we've fetched, plus a flag that flips off once
     the server returns a short page. Photos are appended across "Load more"
     clicks — each click fetches only the next chunk, never a duplicate. */
  const [photosPage, setPhotosPage] = useState(0);
  const [hasMorePhotos, setHasMorePhotos] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [openPhoto, setOpenPhoto] = useState(null);
  const [renamingAlbum, setRenamingAlbum] = useState(false);
  const [pendingAlbumDelete, setPendingAlbumDelete] = useState(false);
  const [photoDialog, setPhotoDialog] = useState(null); // null | 'new' | photo
  const [pendingPhotoDelete, setPendingPhotoDelete] = useState(null);

  const cacheBaseKey = `photos-${albumId}`;

  /* Load the album metadata. Block access if the album belongs to someone else. */
  useEffect(() => {
    if (!user?.id) return;
    getAlbum(albumId)
      .then((data) => {
        if (String(data.userId) !== String(user.id)) {
          toast("You can only view your own content.");
          navigate('/home', { replace: true });
          return;
        }
        setAlbum(data);
      })
      .catch(() => toast("Couldn't load album."));
    // Depend on the id, not the user object reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId, user?.id, navigate]);

  /* Initial load: just the FIRST page of photos. More are fetched on demand via
     "Load more" — so we never pull the whole album up front. */
  useEffect(() => {
    if (!albumId) return;
    let cancelled = false;
    setLoading(true);
    setPhotos([]);
    setPhotosPage(0);
    setHasMorePhotos(true);

    getPhotosPage(albumId, 1, PHOTOS_PAGE_SIZE)
      .then((firstPage) => {
        if (cancelled) return;
        setPhotos(firstPage.data);
        setPhotosPage(1);
        setHasMorePhotos(firstPage.hasMore);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [albumId]);

  async function loadMorePhotos() {
    if (loadingMore || !hasMorePhotos) return;
    setLoadingMore(true);
    try {
      const next = photosPage + 1;
      const result = await getPhotosPage(albumId, next, PHOTOS_PAGE_SIZE);
      // Guard against accidental duplicates if the same page ever returns twice.
      setPhotos((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...result.data.filter((p) => !seen.has(p.id))];
      });
      setPhotosPage(next);
      setHasMorePhotos(result.hasMore);
    } catch {
      toast("Couldn't load more photos.");
    } finally {
      setLoadingMore(false);
    }
  }

  /* ----- actions ----- */

  async function savePhoto({ title, url, thumbnailUrl }, existing) {
    try {
      if (existing) {
        const patch = { title, url, thumbnailUrl };
        await updatePhoto(existing.id, patch);
        // Server PATCH returns `{}` — apply the patch locally.
        setPhotos((prev) => prev.map((p) => (p.id === existing.id ? { ...p, ...patch } : p)));
        toast('Photo updated');
      } else {
        const created = await addPhoto({
          albumId,
          title,
          url,
          thumbnailUrl: thumbnailUrl || url,
        });
        // Show the new photo immediately at the top of the loaded list.
        setPhotos((prev) => [created, ...prev]);
        toast('Photo added');
      }
      // Photo data invalidated: bust every page bucket for this album.
      removeCacheByPrefix(cacheBaseKey);
      // Album list count is now stale.
      removeCacheByPrefix(`user-${userId}-albums`);
      setPhotoDialog(null);
    } catch {
      toast("Couldn't save photo.");
    }
  }

  async function removePhoto(photo) {
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    try {
      await delPhoto(photo.id);
      removeCacheByPrefix(cacheBaseKey);
      removeCacheByPrefix(`user-${userId}-albums`);
      toast('Photo deleted');
    } catch {
      setPhotos((prev) => [photo, ...prev]);
      toast("Couldn't delete photo.");
    }
  }

  async function saveAlbumTitle(title) {
    try {
      await updateAlbum(album.id, { title });
      // Server PATCH returns `{}` — apply the patch locally.
      setAlbum((a) => ({ ...a, title }));
      removeCacheByPrefix(`user-${userId}-albums`);
      toast('Album updated');
      setRenamingAlbum(false);
    } catch {
      toast("Couldn't save album.");
    }
  }

  async function removeAlbum() {
    try {
      // A single request — the server soft-deletes the album AND cascades to its
      // photos. (No per-photo round-trips from the client.)
      await delAlbum(album.id);
      removeCacheByPrefix(cacheBaseKey);
      removeCacheByPrefix(`user-${userId}-albums`);
      toast('Album deleted');
      navigate(`/users/${user?.username}/albums`, { replace: true });
    } catch {
      toast("Couldn't delete album. Try again.");
    }
  }

  return (
    <div className={styles.page}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link
          to={`/users/${user?.username}/albums`}
          className={styles.crumbLink}
        >
          <ChevronLeft size={14} /> Albums
        </Link>
        <span aria-hidden="true">›</span>
        <span className={styles.crumbCurrent}>{album?.title || '…'}</span>
      </nav>

      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>{album?.title || '…'}</h1>
          <p className={styles.sub}>
            {photos.length} photo{photos.length === 1 ? '' : 's'}
            {!hasMorePhotos && photos.length > 0 ? ' · all loaded' : ' loaded'}
          </p>
        </div>
        <div className={styles.headActions}>
          <Button variant="secondary" onClick={() => setRenamingAlbum(true)}>
            <Pencil size={14} /> Edit album
          </Button>
          <Button variant="secondary" onClick={() => setPendingAlbumDelete(true)}>
            <Trash2 size={14} /> Delete album
          </Button>
          <Button onClick={() => setPhotoDialog('new')}>
            <Plus size={16} /> Add photo
          </Button>
        </div>
      </header>

      {photos.length === 0 && !loading ? (
        <div className={styles.empty}>
          This album is empty. Add your first photo to get started.
        </div>
      ) : (
        <ul className={styles.grid}>
          {photos.map((photo) => (
            <li key={photo.id} className={styles.tile}>
              <button
                type="button"
                onClick={() => setOpenPhoto(photo)}
                className={styles.tileBtn}
                aria-label={`Open ${photo.title}`}
              >
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.title}
                  className={styles.tileImg}
                  loading="lazy"
                />
              </button>
              <div className={styles.tileBar}>
                <span className={styles.tileTitle} title={photo.title}>
                  {photo.title}
                </span>
                <div className={styles.tileTools}>
                  <button onClick={() => setPhotoDialog(photo)} aria-label="Edit photo">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setPendingPhotoDelete(photo)} aria-label="Delete photo">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {loading && (
        <div className={styles.sentinel}>
          <span className={styles.spinner} aria-hidden="true" /> Loading…
        </div>
      )}

      {!loading && hasMorePhotos && photos.length > 0 && (
        <div className={styles.loadMore}>
          <Button onClick={loadMorePhotos} disabled={loadingMore} fullWidth>
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}

      {openPhoto && (
        <div className={styles.lightbox} onClick={() => setOpenPhoto(null)}>
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={() => setOpenPhoto(null)}
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <img
            src={openPhoto.url}
            alt={openPhoto.title}
            className={styles.lightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
          <div className={styles.lightboxCaption}>{openPhoto.title}</div>
        </div>
      )}

      {photoDialog && (
        <PhotoFormDialog
          photo={photoDialog === 'new' ? null : photoDialog}
          onSave={savePhoto}
          onClose={() => setPhotoDialog(null)}
        />
      )}

      {renamingAlbum && (
        <RenameAlbumDialog
          album={album}
          onSave={saveAlbumTitle}
          onClose={() => setRenamingAlbum(false)}
        />
      )}

      {pendingPhotoDelete && (
        <ConfirmDialog
          title="Delete this photo?"
          body={`"${pendingPhotoDelete.title}" will be removed.`}
          confirmLabel="Delete"
          cancelLabel="Keep"
          onConfirm={() => removePhoto(pendingPhotoDelete)}
          onClose={() => setPendingPhotoDelete(null)}
        />
      )}

      {pendingAlbumDelete && (
        <ConfirmDialog
          title="Delete this album?"
          body={`"${album?.title}" and all its photos will be permanently removed. This can't be undone.`}
          confirmLabel="Delete album"
          cancelLabel="Keep album"
          onConfirm={removeAlbum}
          onClose={() => setPendingAlbumDelete(false)}
        />
      )}
    </div>
  );
}

/* ---------------- Add/Edit photo dialog ---------------- */

function PhotoFormDialog({ photo, onSave, onClose }) {
  const isEdit = !!photo;
  const fileInput = useRef(null);

  const [title, setTitle] = useState(photo?.title || '');
  const [preview, setPreview] = useState(photo?.url || '');
  const [thumbnail, setThumbnail] = useState(photo?.thumbnailUrl || '');

  const [urlText, setUrlText] = useState('');

  const [errors, setErrors] = useState({});
  const [working, setWorking] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function pickFile(file) {
    if (!file) return;
    setErrors({});
    setWorking(true);
    try {
      const { url, thumbnailUrl } = await readPicture(file);
      setPreview(url);
      setThumbnail(thumbnailUrl);
    } catch (err) {
      setErrors({ image: err.message });
    } finally {
      setWorking(false);
    }
  }

  function useUrl() {
    const trimmed = urlText.trim();
    if (!trimmed) return;
    setPreview(trimmed);
    setThumbnail(trimmed);
    setUrlText('');
  }

  function clearImage() {
    setPreview('');
    setThumbnail('');
  }

  async function submit(e) {
    e.preventDefault();
    const issues = {};
    if (!title.trim()) issues.title = 'Add a caption';
    if (!preview) issues.image = 'Pick or paste an image';
    setErrors(issues);
    if (Object.keys(issues).length) return;
    setWorking(true);
    await onSave(
      { title: title.trim(), url: preview, thumbnailUrl: thumbnail || preview },
      photo
    );
    setWorking(false);
  }

  return (
    <Dialog
      title={isEdit ? 'Edit photo' : 'Add a photo'}
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={working} disabled={!preview || !title.trim()}>
            {isEdit ? 'Save changes' : 'Add photo'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className={styles.form}>
        {preview ? (
          <div className={styles.previewWrap}>
            <img src={preview} alt="Photo preview" className={styles.preview} />
            <button
              type="button"
              onClick={clearImage}
              className={styles.previewClear}
              aria-label="Replace image"
            >
              <X size={14} /> Replace photo
            </button>
          </div>
        ) : (
          <div
            className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pickFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={28} />
            <div className={styles.dropTitle}>
              {working ? 'Reading image…' : 'Drop a photo here, or click to browse'}
            </div>
            <div className={styles.dropHint}>
              JPG, PNG, WebP, or GIF · resized automatically
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>
        )}

        {errors.image && <div className={styles.formError}>{errors.image}</div>}

        {!preview && (
          <>
            <div className={styles.orDivider}>
              <span>or</span>
            </div>
            <label>
              <span className={styles.formLabel}>
                <LinkIcon size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                Paste an image URL
              </span>
              <div className={styles.urlRow}>
                <input
                  type="url"
                  value={urlText}
                  onChange={(e) => setUrlText(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className={styles.formInput}
                />
                <Button variant="secondary" type="button" onClick={useUrl} disabled={!urlText.trim()}>
                  Use URL
                </Button>
              </div>
            </label>
          </>
        )}

        {/* Edit mode: let the user tweak the current image's URL directly.
            Data URLs (uploaded files) are too long to show in a text input,
            so for those we suggest "Replace photo" instead. */}
        {preview && isEdit && !preview.startsWith('data:') && (
          <label>
            <span className={styles.formLabel}>
              <LinkIcon size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Image URL
            </span>
            <input
              type="url"
              value={preview}
              onChange={(e) => {
                setPreview(e.target.value);
                setThumbnail(e.target.value);
              }}
              placeholder="https://example.com/photo.jpg"
              className={styles.formInput}
            />
          </label>
        )}
        {preview && isEdit && preview.startsWith('data:') && (
          <div className={styles.dropHint} style={{ textAlign: 'center' }}>
            Image was uploaded from a file. Use <strong>Replace photo</strong> to change it.
          </div>
        )}

        <label>
          <span className={styles.formLabel}>Caption</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Describe this photo"
            className={styles.formInput}
          />
          {errors.title && <div className={styles.formError}>{errors.title}</div>}
        </label>
      </form>
    </Dialog>
  );
}

/* ---------------- Rename album dialog ---------------- */

function RenameAlbumDialog({ album, onSave, onClose }) {
  const [title, setTitle] = useState(album?.title || '');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onSave(title.trim());
    setSaving(false);
  }

  return (
    <Dialog
      title="Edit album"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={!title.trim()}>
            Save changes
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
            className={styles.formInput}
          />
        </label>
      </form>
    </Dialog>
  );
}
