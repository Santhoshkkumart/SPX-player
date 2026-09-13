const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const { DATABASE_PATH, PLAYLISTS_FILE } = require('./config');

fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });

const db = new DatabaseSync(DATABASE_PATH);
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA journal_mode = WAL');

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      refresh_token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, name)
    );

    CREATE TABLE IF NOT EXISTS playlist_songs (
      playlist_id TEXT NOT NULL,
      song_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (playlist_id, song_id),
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS likes (
      user_id INTEGER NOT NULL,
      song_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, song_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

function migrateLegacyPlaylistsToFirstUser() {
  if (!fs.existsSync(PLAYLISTS_FILE)) return;

  const imported = db.prepare('SELECT COUNT(*) AS count FROM playlists').get().count;
  const firstUser = db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get();
  if (imported > 0 || !firstUser) return;

  try {
    const playlists = JSON.parse(fs.readFileSync(PLAYLISTS_FILE, 'utf8'));
    if (!Array.isArray(playlists)) return;

    const insertPlaylist = db.prepare('INSERT OR IGNORE INTO playlists (id, user_id, name) VALUES (?, ?, ?)');
    const insertSong = db.prepare('INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)');
    db.exec('BEGIN');
    try {
      playlists.forEach((playlist) => {
        const id = String(playlist.id || Date.now());
        const name = String(playlist.name || '').trim();
        if (!name) return;
        insertPlaylist.run(id, firstUser.id, name);
        (Array.isArray(playlist.songs) ? playlist.songs : []).forEach((songId) => {
          insertSong.run(id, String(songId));
        });
      });
      db.exec('COMMIT');
      console.log('Imported legacy playlists.json into SQLite for the first user.');
    } catch (txErr) {
      db.exec('ROLLBACK');
      throw txErr;
    }
  } catch (err) {
    console.error('Failed to import legacy playlists.json:', err);
  }
}

function getPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
  };
}

migrate();

module.exports = {
  db,
  migrateLegacyPlaylistsToFirstUser,
  getPublicUser,
};
