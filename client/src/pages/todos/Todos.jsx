import { useMemo, useState } from 'react';

import { useAuth } from '../../context/useAuth.js';
import useTodos from '../../hooks/useTodos.js';
import { usePersistentState } from '../../hooks/usePersistentState.js';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';

import AddTodoForm from './AddTodoForm.jsx';
import TodoFilters from './TodoFilters.jsx';
import TodosList from './TodosList.jsx';

import styles from '../../styles/Todos.module.css';

export default function Todos() {
  const { user } = useAuth();
  const { items, loading, addTodo, toggleTodo, updateTodo, deleteTodo } =
    useTodos(user.id);

  const [search, setSearch] = usePersistentState('todos-search', '');
  const [sortBy, setSortBy] = usePersistentState('todos-sortBy', 'id');
  const [showWhich, setShowWhich] = usePersistentState('todos-showWhich', 'all');
  const [pendingDelete, setPendingDelete] = useState(null);

  const { visible, openCount, doneCount } = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items;

    if (showWhich === 'open') list = list.filter((t) => !t.completed);
    if (showWhich === 'done') list = list.filter((t) => t.completed);

    if (q) {
      list = list.filter((t) => {
        if (String(t.id) === q) return true;
        if (t.title.toLowerCase().includes(q)) return true;
        if (q === 'done' && t.completed) return true;
        if ((q === 'open' || q === 'pending') && !t.completed) return true;
        return false;
      });
    }

    const ordered = [...list];
    if (sortBy === 'id') ordered.sort((a, b) => Number(a.id) - Number(b.id));
    if (sortBy === 'title') ordered.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === 'status') ordered.sort((a, b) => Number(a.completed) - Number(b.completed));

    const open = items.filter((t) => !t.completed).length;
    return {
      visible: ordered,
      openCount: open,
      doneCount: items.length - open,
    };
  }, [items, search, sortBy, showWhich]);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Todos</h1>
          <p className={styles.sub}>{items.length} items · {doneCount} done</p>
        </div>
      </header>

      <AddTodoForm onAdd={addTodo} />

      <TodoFilters
        search={search}
        setSearch={setSearch}
        sortBy={sortBy}
        setSortBy={setSortBy}
        showWhich={showWhich}
        setShowWhich={setShowWhich}
        openCount={openCount}
        doneCount={doneCount}
      />

      {loading ? (
        <div className={styles.empty}>Loading your todos…</div>
      ) : visible.length === 0 ? (
        <div className={styles.empty}>
          {items.length === 0
            ? 'No todos yet. Add your first one above to get started.'
            : `No todos match "${search || showWhich}". Try a different search.`}
        </div>
      ) : (
        <TodosList
          items={visible}
          onToggle={toggleTodo}
          onUpdate={updateTodo}
          onDelete={(todo) => setPendingDelete(todo)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this todo?"
          body={`"${pendingDelete.title}" will be removed.`}
          confirmLabel="Delete"
          cancelLabel="Keep"
          onConfirm={() => deleteTodo(pendingDelete)}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
