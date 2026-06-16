import { Outlet } from 'react-router-dom';
import SideNav from './SideNav.jsx';
import styles from '../../styles/AppShell.module.css';

export default function AppShell() {
  return (
    <div className={styles.root}>
      <SideNav />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
