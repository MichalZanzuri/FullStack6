import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListTodo, MessageSquare, Image as ImageIcon } from 'lucide-react';

import { useAuth } from '../context/useAuth.js';
import { getTodosByUserId } from '../services/todoService.js';
import { getPostsByUserId } from '../services/postService.js';
import { getAlbumsByUserId } from '../services/albumService.js';

import styles from '../styles/Home.module.css';

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todos: { open: '—', done: '—' },
    posts: { count: '—' },
    albums: { count: '—' },
  });

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    Promise.all([
      getTodosByUserId(user.id).catch(() => []),
      getPostsByUserId(user.id).catch(() => []),
      getAlbumsByUserId(user.id).catch(() => []),
    ]).then(([todos, posts, albums]) => {
      if (cancelled) return;
      setStats({
        todos: {
          open: todos.filter((t) => !t.completed).length,
          done: todos.filter((t) => t.completed).length,
        },
        posts: { count: posts.length },
        albums: { count: albums.length },
      });
    });
    return () => { cancelled = true; };
    // Depend on the id, not the user object reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fullName = user?.name || user?.username || '';

  const cards = [
    {
      to: `/users/${user?.username}/todos`,
      title: 'Your todos',
      desc: 'Stay on top of what needs doing.',
      meta: `${stats.todos.open} open · ${stats.todos.done} done`,
      icon: ListTodo,
      grad: 'linear-gradient(135deg, #FCAF45, #F77737)',
    },
    {
      to: '/posts',
      title: 'Posts feed',
      desc: 'See what everyone is sharing on Pulse.',
      meta: `${stats.posts.count} of yours`,
      icon: MessageSquare,
      grad: 'linear-gradient(135deg, #E1306C, #C13584)',
    },
    {
      to: `/users/${user?.username}/albums`,
      title: 'Your albums',
      desc: 'Organize and revisit your memories.',
      meta: `${stats.albums.count} albums`,
      icon: ImageIcon,
      grad: 'linear-gradient(135deg, #C13584, #833AB4)',
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.greeting}>Hi, {fullName} 👋</h1>
        <p className={styles.sub}>What would you like to do today?</p>
      </header>

      <section className={styles.grid} aria-label="Quick actions">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className={styles.card}>
            <span className={styles.cardIcon} style={{ background: c.grad }}>
              <c.icon size={18} color="#fff" />
            </span>
            <div className={styles.cardTitle}>{c.title}</div>
            <div className={styles.cardDesc}>{c.desc}</div>
            <div className={styles.cardMeta}>{c.meta}</div>
          </Link>
        ))}
      </section>
    </div>
  );
}
