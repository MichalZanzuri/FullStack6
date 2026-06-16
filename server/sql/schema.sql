-- ============================================================================
-- Pulse — MySQL schema (פרק ו', שלב א')
-- Resources: users, todos, posts, comments, albums, photos.
-- `credentials` is a SEPARATE, protected table for passwords — no route ever
-- reads it except the login logic, and it is never returned to the client.
-- Soft-delete via `is_deleted` answers the assignment's "מה זו מחיקה?" hint.
--
-- IDs are UUIDs (CHAR(36)), NOT sequential auto-increment numbers, so records
-- can't be guessed or enumerated from the URL.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS pulse
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pulse;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          CHAR(36)            PRIMARY KEY DEFAULT (UUID()),
  name        VARCHAR(100)        NOT NULL,
  username    VARCHAR(50)         NOT NULL UNIQUE,
  email       VARCHAR(120)        NULL,
  phone       VARCHAR(40)         NULL,
  role        ENUM('user','admin') NOT NULL DEFAULT 'user',
  is_blocked  BOOLEAN             NOT NULL DEFAULT FALSE,
  is_deleted  BOOLEAN             NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- credentials  (the protected "users + passwords" table)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credentials (
  user_id       CHAR(36)     PRIMARY KEY,
  password_hash VARCHAR(255) NOT NULL,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cred_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- sessions  (simple opaque tokens issued at login)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  token      CHAR(64)  PRIMARY KEY,
  user_id    CHAR(36)  NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session_user (user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- todos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS todos (
  id         CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  user_id    CHAR(36)     NOT NULL,
  title      VARCHAR(255) NOT NULL,
  completed  BOOLEAN      NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_todo_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_todo_user (user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
  id         CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  user_id    CHAR(36)     NOT NULL,
  title      VARCHAR(255) NOT NULL,
  body       TEXT         NULL,
  is_deleted BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_post_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_post_user (user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
  id         CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  post_id    CHAR(36)     NOT NULL,
  user_id    CHAR(36)     NULL,
  name       VARCHAR(100) NULL,
  email      VARCHAR(120) NULL,
  body       TEXT         NULL,
  is_deleted BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comment_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_comment_post (post_id),
  INDEX idx_comment_user (user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- albums  (advanced stage)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS albums (
  id         CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  user_id    CHAR(36)     NOT NULL,
  title      VARCHAR(255) NOT NULL,
  is_deleted BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_album_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_album_user (user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- photos  (advanced stage)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS photos (
  id            CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  album_id      CHAR(36)     NOT NULL,
  title         VARCHAR(255) NULL,
  url           MEDIUMTEXT   NULL,   -- may hold base64 data URIs from the legacy data
  thumbnail_url MEDIUMTEXT   NULL,
  is_deleted    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_photo_album FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
  INDEX idx_photo_album (album_id)
) ENGINE=InnoDB;
