import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  getTodosByUserId,
  addTodo as addTodoService,
  updateTodo as updateTodoService,
  deleteTodo as deleteTodoService,
} from '../services/todoService.js';
import { getCache, setCache } from '../utils/cache.js';

/**
 * Owns the loading + state of one user's todos. Uses the in-memory cache so
 * we skip the network on revisits, and rolls back optimistically on failures.
 */
export default function useTodos(userId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const cacheKey = `todos-${userId}`;
    const cached = getCache(cacheKey);
    let cancelled = false;

    if (cached) {
      Promise.resolve().then(() => {
        if (cancelled) return;
        setItems(cached);
        setLoading(false);
      });
      return () => { cancelled = true; };
    }

    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    getTodosByUserId(userId)
      .then((fresh) => {
        if (cancelled) return;
        setItems(fresh);
        setCache(cacheKey, fresh);
      })
      .catch(() => toast("Couldn't load your todos. Try refreshing the page."))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const persist = useCallback(
    (next) => {
      setItems(next);
      setCache(`todos-${userId}`, next);
    },
    [userId]
  );

  const addTodo = useCallback(
    async (title) => {
      try {
        const created = await addTodoService({
          userId,
          title,
          completed: false,
        });
        persist([created, ...items]);
        toast('Todo added');
        return created;
      } catch {
        toast("Couldn't add todo. Try again.");
      }
    },
    [items, persist, userId]
  );

  const toggleTodo = useCallback(
    async (todo) => {
      const next = { ...todo, completed: !todo.completed };
      const optimistic = items.map((t) => (t.id === todo.id ? next : t));
      persist(optimistic);
      try {
        await updateTodoService(todo.id, { completed: next.completed });
      } catch {
        persist(items);
        toast("Couldn't update status.");
      }
    },
    [items, persist]
  );

  const updateTodo = useCallback(
    async (id, patch) => {
      try {
        await updateTodoService(id, patch);
        // Server now returns `{}` on PATCH — apply the patch we just sent.
        persist(items.map((t) => (t.id === id ? { ...t, ...patch } : t)));
        toast('Saved');
      } catch {
        toast("Couldn't save changes.");
      }
    },
    [items, persist]
  );

  const deleteTodo = useCallback(
    async (todo) => {
      const optimistic = items.filter((t) => t.id !== todo.id);
      persist(optimistic);
      try {
        await deleteTodoService(todo.id);
        toast('Todo deleted');
      } catch {
        persist(items);
        toast("Couldn't delete todo.");
      }
    },
    [items, persist]
  );

  return {
    items,
    loading,
    addTodo,
    toggleTodo,
    updateTodo,
    deleteTodo,
  };
}
