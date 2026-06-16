import { useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';

import styles from '../../styles/Todos.module.css';

export default function TodoItem({ todo, onToggle, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(todo.title);

  async function save() {
    const text = value.trim();
    if (!text) {
      cancel();
      return;
    }
    await onUpdate(todo.id, { title: text });
    setEditing(false);
  }

  function cancel() {
    setValue(todo.title);
    setEditing(false);
  }

  return (
    <li className={styles.item}>
      <button
        type="button"
        onClick={() => onToggle(todo)}
        className={`${styles.checkbox} ${todo.completed ? styles.checkboxDone : ''}`}
        aria-label={
          todo.completed
            ? `Mark "${todo.title}" as not done`
            : `Mark "${todo.title}" as done`
        }
      >
        {todo.completed && <Check size={12} strokeWidth={3} />}
      </button>

      <span className={styles.itemId}>#{todo.id}</span>

      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') cancel();
          }}
          className={styles.editInput}
        />
      ) : (
        <span
          className={`${styles.itemTitle} ${todo.completed ? styles.itemTitleDone : ''}`}
          onDoubleClick={() => setEditing(true)}
          title="Double-click to edit"
        >
          {todo.title}
        </span>
      )}

      <div className={styles.itemActions}>
        {editing ? (
          <button
            onClick={cancel}
            className={styles.iconBtn}
            aria-label="Cancel edit"
          >
            <X size={16} />
          </button>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className={styles.iconBtn}
              aria-label="Edit todo"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => onDelete(todo)}
              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
              aria-label="Delete todo"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>
    </li>
  );
}
