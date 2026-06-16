import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import {
  getComments,
  addComment,
  updateComment,
  deleteComment,
} from '../../services/postService.js';
import { getCache, setCache } from '../../utils/cache.js';
import { useAuth } from '../../context/useAuth.js';
import { usePersistentState } from '../../hooks/usePersistentState.js';
import styles from '../../styles/PostArticle.module.css';

/**
 * PostArticle — Instagram-style feed card.
 * Renders post + lazy-loaded comments. Edit/Delete on the post itself only
 * appears when the active user owns it; same rule applies per-comment.
 */
export default function PostArticle({ post, author, onEdit, onDelete }) {
  const { user } = useAuth();

  const [showComments, setShowComments] = usePersistentState(
    `posts-${post.id}-show-comments`,
    false
  );
  const [comments, setComments] = useState(null);
  const [loadingComments, setLoadingComments] = useState(false);

  const [newComment, setNewComment] = usePersistentState(
    `posts-${post.id}-comment-draft`,
    ''
  );
  const [posting, setPosting] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const [liked, setLiked] = usePersistentState(`posts-${post.id}-liked`, false);
  const [saved, setSaved] = usePersistentState(`posts-${post.id}-saved`, false);

  const commentsCacheKey = `post-${post.id}-comments`;

  // Lazy-load comments only when the user opens them — and skip the
  // request if we already loaded them earlier in the session.
  useEffect(() => {
    if (!showComments || comments !== null) return;
    const cached = getCache(commentsCacheKey);
    let cancelled = false;

    if (cached) {
      Promise.resolve().then(() => {
        if (!cancelled) setComments(cached);
      });
      return () => { cancelled = true; };
    }

    Promise.resolve().then(() => {
      if (!cancelled) setLoadingComments(true);
    });
    getComments(post.id)
      .then((list) => {
        if (cancelled) return;
        setComments(list);
        setCache(commentsCacheKey, list);
      })
      .catch(() => { if (!cancelled) setComments([]); })
      .finally(() => { if (!cancelled) setLoadingComments(false); });
    return () => { cancelled = true; };
  }, [showComments, comments, post.id, commentsCacheKey]);

  function persistComments(next) {
    setComments(next);
    setCache(commentsCacheKey, next);
  }

  const initials = (author?.name || author?.username || '??')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const isOwnPost = String(post.userId) === String(user.id);

  async function handleAddComment(e) {
    e.preventDefault();
    const body = newComment.trim();
    if (!body) return;
    setPosting(true);
    try {
      const created = await addComment({
        postId: post.id,
        userId: user.id,
        name: user.username,
        email: user.email,
        body,
      });
      persistComments([...(comments || []), created]);
      setNewComment('');
    } finally {
      setPosting(false);
    }
  }

  function startEditComment(c) {
    setEditingId(c.id);
    setEditingText(c.body);
  }

  async function saveComment() {
    const body = editingText.trim();
    if (!body) { setEditingId(null); return; }
    const id = editingId;
    setEditingId(null);
    await updateComment(id, { body });
    // Server PATCH returns `{}` — apply the patch locally.
    persistComments(comments.map((c) => (c.id === id ? { ...c, body } : c)));
  }

  async function removeComment(c) {
    persistComments(comments.filter((x) => x.id !== c.id));
    try {
      await deleteComment(c.id);
    } catch {
      persistComments([...comments, c]);
    }
  }

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div className={styles.avatarRing}>
          <div className={styles.avatarInner}>
            <span>{initials}</span>
          </div>
        </div>
        <div className={styles.headText}>
          <div className={styles.username}>{author?.username || 'unknown'}</div>
          <div className={styles.meta}>{author?.address?.city || 'Pulse'} · Post #{post.id}</div>
        </div>
        <div className={styles.headActions}>
          {isOwnPost && (
            <>
              <button className={styles.headBtn} onClick={onEdit} aria-label="Edit post" title="Edit">
                <Pencil size={16} />
              </button>
              <button
                className={`${styles.headBtn} ${styles.headBtnDanger}`}
                onClick={onDelete}
                aria-label="Delete post"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
          <button className={styles.headBtn} aria-label="More options"><MoreHorizontal size={18} /></button>
        </div>
      </header>

      <div className={styles.cover}>
        {post.imageUrl ? (
          <img src={post.imageUrl} alt={post.title} className={styles.coverImg} loading="lazy" />
        ) : (
          <>
            <div className={styles.coverGrad} />
            <div className={styles.coverOverlay} />
            <div className={styles.coverText}>
              <h2 className={styles.coverTitle}>{post.title}</h2>
              <p className={styles.coverSub}>Post #{post.id}</p>
            </div>
          </>
        )}
      </div>

      <div className={styles.actions}>
        <button
          className={`${styles.iconAction} ${liked ? styles.iconActionLiked : ''}`}
          onClick={() => setLiked((v) => !v)}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <Heart size={22} fill={liked ? '#ED4956' : 'none'} stroke={liked ? '#ED4956' : 'currentColor'} />
        </button>
        <button
          className={styles.iconAction}
          onClick={() => setShowComments((v) => !v)}
          aria-label="Toggle comments"
        >
          <MessageCircle size={22} />
        </button>
        <button className={styles.iconAction} aria-label="Share"><Send size={22} /></button>
        <button
          className={styles.iconActionRight}
          onClick={() => setSaved((v) => !v)}
          aria-label={saved ? 'Unsave' : 'Save'}
        >
          <Bookmark size={22} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className={styles.likesLine}>
        {liked ? '1 like' : '0 likes'}
      </div>

      <div className={styles.caption}>
        <span className={styles.captionUser}>{author?.username || 'unknown'}</span>{' '}
        {post.body}
      </div>

      <button
        className={styles.viewComments}
        onClick={() => setShowComments((v) => !v)}
      >
        {showComments
          ? 'Hide comments'
          : `View ${comments ? `all ${comments.length}` : ''} comments`}
      </button>

      {showComments && (
        <div className={styles.commentList}>
          {loadingComments && <div className={styles.commentEmpty}>Loading…</div>}
          {!loadingComments && comments?.length === 0 && (
            <div className={styles.commentEmpty}>No comments yet. Be the first to reply.</div>
          )}
          {!loadingComments &&
            comments?.map((c) => {
              const isMine = String(c.userId) === String(user.id);
              return (
                <div key={c.id} className={styles.commentRow}>
                  <div className={styles.commentBody}>
                    <span className={styles.commentUser}>{c.name}</span>{' '}
                    {editingId === c.id ? (
                      <input
                        autoFocus
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveComment();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onBlur={saveComment}
                        className={styles.commentEdit}
                      />
                    ) : (
                      <span>{c.body}</span>
                    )}
                  </div>
                  {isMine && editingId !== c.id && (
                    <div className={styles.commentTools}>
                      <button onClick={() => startEditComment(c)} aria-label="Edit comment">edit</button>
                      <span aria-hidden="true">·</span>
                      <button onClick={() => removeComment(c)} aria-label="Delete comment">delete</button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      <form onSubmit={handleAddComment} className={styles.addComment}>
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={`Add a comment as ${user.username}…`}
          className={styles.addCommentInput}
        />
        <button
          type="submit"
          disabled={!newComment.trim() || posting}
          className={styles.addCommentBtn}
        >
          Post
        </button>
      </form>
    </article>
  );
}
