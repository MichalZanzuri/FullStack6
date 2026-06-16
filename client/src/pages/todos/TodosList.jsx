import TodoItem from './TodoItem.jsx';
import styles from '../../styles/Todos.module.css';

export default function TodosList({ items, onToggle, onUpdate, onDelete }) {
  return (
    <ul className={styles.list}>
      {items.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
