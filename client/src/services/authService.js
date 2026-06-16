import { request, setToken } from '../api/api.js';
import {
  createUser,
  getUserById,
  patchUser,
  changeUserPassword,
} from '../api/apiUsers.js';

// The server returns the public user plus a session `token`. We peel the token
// off into Local Storage (via setToken) and hand the bare user to the caller.
function storeTokenAndStripUser(payload) {
  if (payload && payload.token) {
    setToken(payload.token);
    const user = { ...payload };
    delete user.token;
    return user;
  }
  return payload;
}

export async function loginUser(username, password) {
  // Credentials are verified server-side via POST /login. The endpoint
  // returns 401 on bad creds and never echoes the stored password back.
  try {
    const payload = await request('/login', 'POST', { username, password });
    return storeTokenAndStripUser(payload);
  } catch (err) {
    if (err.status === 401 || err.status === 400 || err.status === 403) {
      throw new Error('Incorrect username or password. Try again.', { cause: err });
    }
    throw err;
  }
}

export async function registerUser(newUser) {
  // The server's POST /users enforces username uniqueness (409 on conflict) and
  // issues a session token so the new user is authenticated immediately.
  try {
    const payload = await createUser(newUser);
    return storeTokenAndStripUser(payload);
  } catch (err) {
    if (err.status === 409) {
      throw new Error('That username is already taken. Try another one.', { cause: err });
    }
    throw err;
  }
}

// Called on logout to drop the session token.
export function clearToken() {
  setToken(null);
}

// Lightweight check used by the register form to nudge the user before
// they fill out step 2. Calls /username-available which returns only a
// boolean — no profile data of an existing user is exposed.
export async function checkUsernameAvailable(username) {
  const enc = encodeURIComponent(username);
  const result = await request(`/username-available?username=${enc}`);
  return !!result?.available;
}

export async function refreshUser(id) {
  return await getUserById(id);
}

// PATCH — updates only the provided fields, not the whole user object.
export async function updateUserProfile(id, changes) {
  return await patchUser(id, changes);
}

// Change password (advanced "פעולות הנוגעות למשתמשים – שינוי סיסמה").
export async function changePassword(id, currentPassword, newPassword) {
  try {
    return await changeUserPassword(id, currentPassword, newPassword);
  } catch (err) {
    if (err.status === 401) {
      throw new Error('Current password is incorrect.', { cause: err });
    }
    if (err.status === 400) {
      throw new Error('New password must be at least 4 characters.', { cause: err });
    }
    throw err;
  }
}
