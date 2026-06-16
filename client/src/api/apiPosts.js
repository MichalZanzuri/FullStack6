import { request } from './api.js';

const enc = encodeURIComponent;

export async function getPostsByUserId(userId) {
  return await request(`/posts?userId=${enc(userId)}`);
}

export async function getPostsPage(page, perPage) {
  return await request(`/posts?_page=${page}&_per_page=${perPage}`);
}

export async function patchPost(id, patch) {
  return await request(`/posts/${id}`, 'PATCH', patch);
}

export async function createPost(post) {
  return await request('/posts', 'POST', post);
}

export async function deletePost(id) {
  return await request(`/posts/${id}`, 'DELETE');
}
