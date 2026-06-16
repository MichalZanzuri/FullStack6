import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import RequireAuth from '../components/layout/RequireAuth.jsx';
import AppShell from '../components/layout/AppShell.jsx';

import Login from '../pages/Login.jsx';
import Register from '../pages/register/Register.jsx';
import Home from '../pages/Home.jsx';
import Todos from '../pages/todos/Todos.jsx';
import Posts from '../pages/posts/Posts.jsx';
import Albums from '../pages/albums/Albums.jsx';
import AlbumPhotosPage from '../pages/albums/AlbumPhotosPage.jsx';
import AdminUsers from '../pages/admin/AdminUsers.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes — share AppShell (sidebar/header + outlet) */}
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/home" element={<Home />} />
          <Route path="/posts" element={<Posts />} />
          <Route path="/users/:username/todos" element={<Todos />} />
          <Route path="/users/:username/albums" element={<Albums />} />
          <Route
            path="/users/:username/albums/:albumId/photos"
            element={<AlbumPhotosPage />}
          />
          {/* Admin-only (the page itself redirects non-admins; server enforces too) */}
          <Route path="/admin" element={<AdminUsers />} />
        </Route>

        {/* Defaults */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
