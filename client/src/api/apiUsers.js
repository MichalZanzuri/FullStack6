import { request } from './api.js';

const enc = encodeURIComponent;

export async function getUserByUsername(username) {
  const data = await request(`/users?username=${enc(username)}`);
  return data.length > 0 ? data[0] : null;
}

export async function getUserById(id) {
  return await request(`/users/${enc(id)}`);
}

export async function createUser(user) {
  return await request('/users', 'POST', user);
}

export async function patchUser(id, patch) {
  return await request(`/users/${id}`, 'PATCH', patch);
}

export async function changeUserPassword(id, currentPassword, newPassword) {
  return await request(`/users/${id}/password`, 'PATCH', {
    currentPassword,
    newPassword,
  });
}
