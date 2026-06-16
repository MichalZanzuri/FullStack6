import {
  getTodosByUserId as getTodos,
  createTodo,
  patchTodo,
  deleteTodoById,
} from '../api/apiTodos.js';

export async function getTodosByUserId(userId) {
  return await getTodos(userId);
}

export async function addTodo(todo) {
  return await createTodo(todo);
}

export async function updateTodo(id, patch) {
  return await patchTodo(id, patch);
}

export async function deleteTodo(id) {
  return await deleteTodoById(id);
}
