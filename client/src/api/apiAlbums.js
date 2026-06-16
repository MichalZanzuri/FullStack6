import { request } from './api.js';

const enc = encodeURIComponent;

export async function getAlbumsByUserId(userId) {
  return await request(`/albums?userId=${enc(userId)}`);
}

export async function getAlbumByAlbumId(albumId) {
  return await request(`/albums/${albumId}`);
}

export async function fetchPhotosPage(albumId, page = 1, perPage = 12) {
  return await request(
    `/photos?albumId=${enc(albumId)}&_page=${page}&_per_page=${perPage}`
  );
}

export async function createAlbum(album) {
  return await request('/albums', 'POST', album);
}

export async function patchAlbum(id, patch) {
  return await request(`/albums/${id}`, 'PATCH', patch);
}

export async function deleteAlbum(albumId) {
  return await request(`/albums/${albumId}`, 'DELETE');
}
