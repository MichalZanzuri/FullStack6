import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../context/useAuth.js';
import {
  getPostsPage,
  addPost,
  updatePost,
  deletePost,
} from '../../services/postService.js';
import { removeCache } from '../../utils/cache.js';
import { usePersistentState } from '../../hooks/usePersistentState.js';

import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import Dialog from '../../components/ui/Dialog.jsx';
import PostArticle from './PostArticle.jsx';
import styles from '../../styles/Posts.module.css';

const POSTS_PAGE_SIZE = 5;

export default function Posts() {
  const { user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Pagination: we hold the highest page we've already fetched, plus a flag
     that flips off once the server returns a short page. Posts are appended
     across "Load more" clicks rather than re-fetched as a giant array. */
  const [postsPage, setPostsPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = usePersistentState('posts-search', '');
  const [showOnlyMine, setShowOnlyMine] = usePersistentState('posts-show-only-mine', false);
  const [selectedId, setSelectedId] = usePersistentState('posts-selected-id', null);

  const [editing, setEditing] = useState(null); // null | 'new' | post
  const [pendingDelete, setPendingDelete] = useState(null);

  /* Initial load: just the first page of posts. Each post already carries its
     author's name/username (from a server-side JOIN), so we DON'T fetch the
     whole users table — that wouldn't scale to a large user base. */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);

    getPostsPage(1, POSTS_PAGE_SIZE)
      .then((firstPage) => {
        if (cancelled) return;
        setPosts(firstPage.data);
        setPostsPage(1);
        setHasMorePosts(firstPage.hasMore);
      })
      .catch(() => { if (!cancelled) toast("Couldn't load posts."); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    // Depend on the id, not the user object — AuthContext refreshes the user
    // shortly after mount and that swap (same id, new reference) would
    // otherwise re-run this effect and re-fetch page 1.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadMorePosts() {
    if (loadingMore || !hasMorePosts) return;
    setLoadingMore(true);
    try {
      const next = postsPage + 1;
      const result = await getPostsPage(next, POSTS_PAGE_SIZE);
      setPosts((prev) => [...prev, ...result.data]);
      setPostsPage(next);
      setHasMorePosts(result.hasMore);
    } catch {
      toast("Couldn't load more posts.");
    } finally {
      setLoadingMore(false);
    }
  }

  const minePosts = useMemo(
    () => posts.filter((p) => String(p.userId) === String(user?.id)),
    [posts, user?.id]
  );

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = showOnlyMine ? minePosts : posts;
    if (!q) return result;
    return result.filter(
      (p) => String(p.id) === q || p.title.toLowerCase().includes(q)
    );
  }, [posts, minePosts, search, showOnlyMine]);

  const selectedPost = posts.find((p) => String(p.id) === String(selectedId)) || null;

  /* ----------- actions ----------- */

  async function savePost({ title, body }, existing) {
    try {
      if (existing) {
        await updatePost(existing.id, { title, body });
        // Server PATCH returns `{}` — apply the patch locally.
        setPosts((prev) => prev.map((p) => (p.id === existing.id ? { ...p, title, body } : p)));
        toast('Changes saved');
      } else {
        const created = await addPost({
          userId: user.id,
          title,
          body,
        });
        setPosts((prev) => [created, ...prev]);
        setSelectedId(created.id);
        toast('Post published');
      }
      setEditing(null);
    } catch {
      toast("Couldn't save post.");
    }
  }

  async function removePost(post) {
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    if (String(selectedId) === String(post.id)) setSelectedId(null);
    try {
      // The server cascades the delete to this post's comments (including ones
      // written by other users), so we only need to delete the post itself.
      await deletePost(post.id);
      removeCache(`post-${post.id}-comments`);
      toast('Post deleted');
    } catch {
      setPosts((prev) => [...prev, post]);
      toast("Couldn't delete post. Try again.");
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Posts</h1>
          <p className={styles.sub}>
            {posts.length} posts · {minePosts.length} of yours
          </p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus size={16} /> New post
        </Button>
      </header>

      <div className={styles.layout}>
        <aside className={styles.aside}>
          <label className={styles.mineToggle}>
            <input
              type="checkbox"
              checked={showOnlyMine}
              onChange={(e) => setShowOnlyMine(e.target.checked)}
            />
            Show only my posts
          </label>

          <label className={styles.searchWrap}>
            <Search size={14} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by id or title…"
              className={styles.searchInput}
            />
          </label>

          {loading ? (
            <div className={styles.empty}>Loading…</div>
          ) : filteredPosts.length === 0 ? (
            <div className={styles.empty}>
              {posts.length === 0 ? 'No posts yet.' : `No posts match "${search}".`}
            </div>
          ) : (
            <ul className={styles.postList}>
              {filteredPosts.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`${styles.postRow} ${
                      String(p.id) === String(selectedId) ? styles.postRowActive : ''
                    }`}
                  >
                    <span className={styles.postId}>#{p.id}</span>
                    <span className={styles.postTitle}>{p.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!loading && hasMorePosts && (
            <Button onClick={loadMorePosts} disabled={loadingMore} fullWidth>
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
          )}
        </aside>

        <section className={styles.detail}>
          {selectedPost ? (
            <PostArticle
              key={selectedPost.id}
              post={selectedPost}
              author={{ name: selectedPost.authorName, username: selectedPost.authorUsername }}
              onEdit={() => setEditing(selectedPost)}
              onDelete={() => setPendingDelete(selectedPost)}
            />
          ) : (
            <div className={styles.placeholder}>
              <div className={styles.placeholderIcon}>📝</div>
              <h2>Select a post to view</h2>
              <p>Pick an item from the list to see it as a feed card with comments.</p>
            </div>
          )}
        </section>
      </div>

      {editing && (
        <PostFormDialog
          post={editing === 'new' ? null : editing}
          onSave={savePost}
          onClose={() => setEditing(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this post?"
          body={`"${pendingDelete.title}" and its comments will be permanently removed. This can't be undone.`}
          confirmLabel="Delete post"
          cancelLabel="Keep post"
          onConfirm={() => removePost(pendingDelete)}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

/* ---------- New / edit post dialog ---------- */

function PostFormDialog({ post, onSave, onClose }) {
  const isEdit = !!post;
  const [title, setTitle] = useState(post?.title || '');
  const [body, setBody] = useState(post?.body || '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const issues = {};
    if (!title.trim()) issues.title = 'Add a title for your post';
    if (!body.trim()) issues.body = "Posts can't be empty";
    setErrors(issues);
    if (Object.keys(issues).length) return;

    setSaving(true);
    await onSave({ title: title.trim(), body: body.trim() }, post);
    setSaving(false);
  }

  return (
    <Dialog
      title={isEdit ? 'Edit post' : 'New post'}
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>
            {isEdit ? 'Save changes' : 'Publish'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <label>
          <span className={styles.formLabel}>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your post a title"
            className={styles.formInput}
          />
          {errors.title && <div className={styles.formError}>{errors.title}</div>}
        </label>

        <label>
          <span className={styles.formLabel}>Body</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What's on your mind?"
            rows={6}
            className={styles.formTextarea}
          />
          {errors.body && <div className={styles.formError}>{errors.body}</div>}
        </label>
      </form>
    </Dialog>
  );
}
