// Concrete resource routers built from the factory, each with its own
// create-payload rules (owner forced to the active user).
import { makeResourceRouter } from './resource.factory.js';
import * as todos from '../queries/todos.queries.js';
import * as posts from '../queries/posts.queries.js';
import * as comments from '../queries/comments.queries.js';
import * as albums from '../queries/albums.queries.js';
import * as photos from '../queries/photos.queries.js';

export const todosRouter = makeResourceRouter({
  queries: todos,
  buildCreate: (body, req) => ({
    userId: req.user.id,            // always create under the active user
    title: body.title,
    completed: body.completed,
  }),
});

export const postsRouter = makeResourceRouter({
  queries: posts,
  buildCreate: (body, req) => ({
    userId: req.user.id,
    title: body.title,
    body: body.body,
  }),
});

export const commentsRouter = makeResourceRouter({
  queries: comments,
  buildCreate: (body, req) => ({
    postId: body.postId,
    userId: req.user.id,
    name: body.name ?? req.user.username,
    email: body.email ?? req.user.email,
    body: body.body,
  }),
});

export const albumsRouter = makeResourceRouter({
  queries: albums,
  buildCreate: (body, req) => ({
    userId: req.user.id,
    title: body.title,
  }),
});

export const photosRouter = makeResourceRouter({
  queries: photos,
  // A photo may only be added to an album the user owns (admins excepted).
  buildCreate: async (body, req) => {
    const albumOwner = await albums.ownerOf(body.albumId);
    if (albumOwner == null) return null;
    if (req.user.role !== 'admin' && albumOwner !== req.user.id) return null;
    return {
      albumId: body.albumId,
      title: body.title,
      url: body.url,
      thumbnailUrl: body.thumbnailUrl,
    };
  },
});
