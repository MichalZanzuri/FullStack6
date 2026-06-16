import {
  getAlbumsByUserId as getAlbums,
  getAlbumByAlbumId,
  fetchPhotosPage,
  createAlbum,
  patchAlbum,
  deleteAlbum as delAlbum,
} from '../api/apiAlbums.js';
import {
  createPhoto,
  patchPhoto,
  deletePhoto as delPhoto,
} from '../api/apiPhotos.js';

export async function getAlbumsByUserId(userId) {
  return await getAlbums(userId);
}

export async function getAlbum(albumId) {
  return await getAlbumByAlbumId(albumId);
}

export async function addAlbum(album) {
  return await createAlbum(album);
}

export async function updateAlbum(albumId, patch) {
  return await patchAlbum(albumId, patch);
}

export async function deleteAlbum(albumId) {
  return await delAlbum(albumId);
}

/* The server returns a pagination wrapper:
   { first, prev, next, last, pages, items, data: [...] }.
   We return the page's photos plus a `hasMore` flag derived from `next`, so the
   page can offer a "Load more" button and only ever fetch the next chunk —
   never the whole album, and never the same page twice. */
export async function getPhotosPage(albumId, page, perPage) {
  const response = await fetchPhotosPage(albumId, page, perPage);
  if (Array.isArray(response)) return { data: response, hasMore: false };
  return {
    data: response?.data ?? [],
    hasMore: response?.next != null,
  };
}

/* Total photo count for an album — used by the Albums list to show "N photos"
   on each cover. Asks for a single item so the server returns the `items` total
   without shipping the whole album. */
export async function countPhotosInAlbum(albumId) {
  const response = await fetchPhotosPage(albumId, 1, 1);
  if (Array.isArray(response)) return response.length;
  return response?.items ?? 0;
}

export async function addPhoto(photo) {
  return await createPhoto(photo);
}

export async function updatePhoto(id, patch) {
  return await patchPhoto(id, patch);
}

export async function deletePhoto(id) {
  return await delPhoto(id);
}
