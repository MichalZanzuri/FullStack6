import { useState } from 'react';
import { Plus } from 'lucide-react';

import Button from '../../components/ui/Button.jsx';
import { usePersistentState } from '../../hooks/usePersistentState.js';
import styles from '../../styles/Todos.module.css';

export default function AddTodoForm({ onAdd }) {
  const [draft, setDraft] = usePersistentState('todos-draft', '');
  const [adding, setAdding] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;

    setAdding(true);
    try {
      await onAdd(title);
      setDraft('');
    } finally {
      setAdding(false);
    }
  }

  return (
    <form onSubmit={submit} className={styles.addRow}>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="What needs doing?"
        className={styles.addInput}
      />
      <Button type="submit" loading={adding} disabled={!draft.trim()}>
        <Plus size={16} /> Add
      </Button>
    </form>
  );
}
