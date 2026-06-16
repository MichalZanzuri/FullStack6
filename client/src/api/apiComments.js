import { request } from './api.js';

const enc = encodeURIComponent;

export async function getCommentsByPostId(postId) {
  return await request(`/comments?postId=${enc(postId)}`);
}

export async function deleteComment(commentId) {
  return await request(`/comments/${enc(commentId)}`, 'DELETE');
}

export async function createComment(comment) {
  return await request('/comments', 'POST', comment);
}

export async function patchComment(id, patch) {
  return await request(`/comments/${id}`, 'PATCH', patch);
}
