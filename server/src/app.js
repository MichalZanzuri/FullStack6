// Express app assembly: CORS, JSON body parsing, auth context, routers,
// and a central error handler. (שלב ב': "כתבו מסגרת של Express ובנו נתיבים")
import express from 'express';
import cors from 'cors';

import { currentUser } from './middleware/currentUser.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import adminRoutes from './routes/admin.routes.js';
import {
  todosRouter,
  postsRouter,
  commentsRouter,
  albumsRouter,
  photosRouter,
} from './routes/resources.js';

export function createApp() {
  const app = express();

  app.use(cors());
  // Large limit because legacy photos can be base64 data URIs.
  app.use(express.json({ limit: '60mb' }));

  // Resolve req.user from the Authorization token (non-blocking).
  app.use(currentUser);

  // Health check.
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Auth + register live at the root (POST /login, POST /users, ...).
  app.use('/', authRoutes);

  // Resource routers (jsonplaceholder-style paths).
  app.use('/users', usersRoutes);
  app.use('/todos', todosRouter);
  app.use('/posts', postsRouter);
  app.use('/comments', commentsRouter);
  app.use('/albums', albumsRouter);
  app.use('/photos', photosRouter);
  app.use('/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
