import { request } from './api.js';

const enc = encodeURIComponent;

export async function getTodosByUserId(userId) {
  return await request(`/todos?userId=${enc(userId)}`);
}

export async function patchTodo(id, patch) {
  return await request(`/todos/${id}`, 'PATCH', patch);
}

export async function createTodo(todo) {
  return await request('/todos', 'POST', todo);
}

export async function deleteTodoById(id) {
  return await request(`/todos/${id}`, 'DELETE');
}
