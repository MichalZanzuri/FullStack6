import { Search } from 'lucide-react';
import styles from '../../styles/Todos.module.css';

export default function TodoFilters({
  search,
  setSearch,
  sortBy,
  setSortBy,
  showWhich,
  setShowWhich,
  openCount,
  doneCount,
}) {
  return (
    <div className={styles.controls}>
      <label className={styles.searchWrap}>
        <Search size={16} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by id, title, or status…"
          className={styles.searchInput}
        />
      </label>

      <div className={styles.controlGroup}>
        <span className={styles.controlLabel}>Sort by</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className={styles.select}
        >
          <option value="id">ID (ascending)</option>
          <option value="title">Title (A-Z)</option>
          <option value="status">Status (open first)</option>
        </select>
      </div>

      <div className={styles.controlGroup}>
        <span className={styles.controlLabel}>Show</span>
        <select
          value={showWhich}
          onChange={(e) => setShowWhich(e.target.value)}
          className={styles.select}
        >
          <option value="all">All</option>
          <option value="open">Open ({openCount})</option>
          <option value="done">Done ({doneCount})</option>
        </select>
      </div>
    </div>
  );
}
