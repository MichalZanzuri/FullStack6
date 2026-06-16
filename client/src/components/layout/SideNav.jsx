import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Info, ListTodo, MessageSquare, Image, LogOut, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../context/useAuth.js';
import PulseLogo from '../ui/PulseLogo.jsx';
import ProfileSheet from './ProfileSheet.jsx';
import styles from '../../styles/SideNav.module.css';

export default function SideNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  if (!user) return null;

  const initials = (user.name || user.username || '??')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  function handleLogout() {
    logout();
    toast('Logged out');
    navigate('/login', { replace: true });
  }

  const navItems = [
    { to: `/users/${user.username}/todos`, label: 'Todos', icon: ListTodo },
    { to: '/posts', label: 'Posts', icon: MessageSquare },
    { to: `/users/${user.username}/albums`, label: 'Albums', icon: Image },
    // Admin link is only shown to admins (the route + server also enforce this).
    ...(user.role === 'admin'
      ? [{ to: '/admin', label: 'Admin', icon: ShieldCheck }]
      : []),
  ];

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <NavLink to="/home" className={styles.brand} aria-label="Pulse home">
            <PulseLogo variant="mark" size={28} />
            <PulseLogo variant="wordmark" />
          </NavLink>

          <nav className={styles.nav}>
            <NavLink
              to="/home"
              end
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              Home
            </NavLink>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
              >
                <item.icon size={16} aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => setShowProfile(true)}
              title="View your account info"
            >
              <Info size={16} />
              <span>Info</span>
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleLogout}
              title="Log out of Pulse"
            >
              <LogOut size={16} />
              <span>Log out</span>
            </button>
            <div className={styles.avatar} title={user.name}>
              <div className={styles.avatarRing}>
                <div className={styles.avatarInner}>
                  <span>{initials}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {showProfile && <ProfileSheet user={user} onClose={() => setShowProfile(false)} />}
    </>
  );
}
