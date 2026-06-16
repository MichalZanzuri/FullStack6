import { request } from './api.js';

// GET endpoints for photos live in apiAlbums.js (`fetchPhotosPage`) — pagination is
// album-scoped, so it's nicer for the album service to own the read path.

export async function createPhoto(photo) {
  return await request('/photos', 'POST', photo);
}

export async function patchPhoto(id, patch) {
  return await request(`/photos/${id}`, 'PATCH', patch);
}

export async function deletePhoto(photoId) {
  return await request(`/photos/${photoId}`, 'DELETE');
}
