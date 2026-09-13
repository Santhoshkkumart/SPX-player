require('dotenv').config();

const { Readable } = require('stream');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const express = require('express');
const fs = require('fs');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const mm = require('music-metadata');
const multer = require('multer');
const os = require('os');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { v2: cloudinary } = require('cloudinary');

const {
  PORT,
  MUSIC_DIR,
  UPLOADS_DIR,
  CORS_ORIGIN,
  CLOUDINARY_AUDIO_FOLDER,
  CLOUDINARY_CONFIGURED,
  JWT_REFRESH_SECRET,
} = require('./config');
const { db, migrateLegacyPlaylistsToFirstUser, getPublicUser } = require('./db');
const {
  signAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeSession,
  signMediaToken,
  requireAuth,
  requireAdmin,
  requireMediaAccess,
} = require('./auth');
const { validateUsername, validateEmail, validatePassword } = require('./validation');

const app = express();
const AUDIO_EXTENSIONS = new Set(['.aac', '.flac', '.m4a', '.mp3', '.oga', '.ogg', '.wav']);

if (CLOUDINARY_CONFIGURED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') {
      if (
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin) ||
        origin.startsWith('exp://') ||
        origin.includes('.loca.lt') ||
        origin.includes('.ngrok')
      ) {
        return callback(null, true);
      }
    }
    const allowed = CORS_ORIGIN.split(',').map(item => item.trim()).filter(Boolean);
    if (allowed.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '100kb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

function sanitizeFolder(value) {
  return String(value || '').trim().replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/');
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function getAudioContentType(filename) {
  const ext = path.extname(String(filename || '')).toLowerCase();
  switch (ext) {
    case '.mp3': return 'audio/mpeg';
    case '.m4a':
    case '.mp4': return 'audio/mp4';
    case '.aac': return 'audio/aac';
    case '.wav': return 'audio/wav';
    case '.flac': return 'audio/flac';
    case '.ogg':
    case '.oga': return 'audio/ogg';
    default: return 'audio/mpeg';
  }
}

function isAudioFile(name) {
  return AUDIO_EXTENSIONS.has(path.extname(String(name || '')).toLowerCase());
}

function normalizeUploadName(originalName, mimeType) {
  let ext = path.extname(originalName || '').toLowerCase();
  if (!AUDIO_EXTENSIONS.has(ext)) {
    const mime = String(mimeType || '').toLowerCase();
    if (mime.includes('wav')) ext = '.wav';
    else if (mime.includes('m4a') || mime.includes('mp4')) ext = '.m4a';
    else if (mime.includes('aac')) ext = '.aac';
    else if (mime.includes('flac')) ext = '.flac';
    else if (mime.includes('ogg')) ext = '.ogg';
    else ext = '.mp3';
  }

  const baseName = path.basename(originalName || 'upload', path.extname(originalName || 'upload'));
  const safeBase = baseName.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'upload';
  return `${Date.now()}-${safeBase}${ext}`;
}

const SUPPORTED_MIME_TYPES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/x-mp3', 'audio/x-mpeg', 'audio/mp4', 'audio/m4a',
  'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/x-flac', 'audio/aac',
  'audio/ogg', 'application/octet-stream',
]);

function isSupportedUpload(file) {
  if (!file) return false;
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimeType = (file.mimetype || '').toLowerCase();
  return AUDIO_EXTENSIONS.has(ext) && (SUPPORTED_MIME_TYPES.has(mimeType) || mimeType.startsWith('audio/'));
}

function getDisplayTitle(rawName) {
  const basename = path.basename(String(rawName || ''), path.extname(String(rawName || '')));
  if (!basename) return 'Untitled Song';
  return basename.replace(/^\d{13,}-/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() || basename;
}

function isPathInside(target, base) {
  const relative = path.relative(base, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function getSafeSongName(rawSong) {
  const song = String(rawSong || '');
  if (!song || song !== path.basename(song) || song.includes('\\') || song.includes('/') || song.includes('\0')) return null;
  if (!isAudioFile(song)) return null;
  return song;
}

function getLocalSongPath(rawSong) {
  const song = getSafeSongName(rawSong);
  if (!song) return null;
  const songPath = path.resolve(MUSIC_DIR, song);
  if (!isPathInside(songPath, MUSIC_DIR)) return null;
  return songPath;
}

function getRequestBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function getCloudinaryPrefix() {
  const folder = sanitizeFolder(CLOUDINARY_AUDIO_FOLDER);
  return folder ? `${folder}/` : undefined;
}

async function ensureMusicDir() {
  await fs.promises.mkdir(MUSIC_DIR, { recursive: true });
}

async function ensureUploadsDir() {
  await fs.promises.mkdir(UPLOADS_DIR, { recursive: true });
}

async function cleanupUploadedFile(filePath) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Failed to remove temporary upload:', err);
  }
}

function withSignedMediaUrl(baseUrl, route, songId, user, scope) {
  const token = signMediaToken(user, songId, scope);
  return `${baseUrl}/${route}/${encodeURIComponent(songId)}?token=${encodeURIComponent(token)}`;
}

function buildLocalSong(name, req) {
  const safeName = String(name);
  const baseUrl = getRequestBaseUrl(req);
  return {
    id: safeName,
    title: getDisplayTitle(safeName),
    artist: 'Unknown Artist',
    filename: safeName,
    source: 'local',
    hasCover: true,
    streamUrl: withSignedMediaUrl(baseUrl, 'stream', safeName, req.user, 'stream'),
    coverUrl: withSignedMediaUrl(baseUrl, 'cover', safeName, req.user, 'cover'),
  };
}

function buildCloudinarySong(resource, req) {
  const publicId = String(resource.public_id || '');
  const format = String(resource.format || 'mp3').toLowerCase();
  const originalName = resource.original_filename || path.posix.basename(publicId);
  return {
    id: publicId,
    title: getDisplayTitle(originalName),
    artist: 'Unknown Artist',
    filename: originalName,
    source: 'cloudinary',
    hasCover: false,
    bytes: resource.bytes || 0,
    duration: resource.duration || null,
    streamUrl: withSignedMediaUrl(getRequestBaseUrl(req), 'stream-cloud', publicId, req.user, 'stream'),
    coverUrl: null,
    format,
  };
}

async function listLocalSongs(req) {
  await ensureMusicDir();
  const entries = await fs.promises.readdir(MUSIC_DIR, { withFileTypes: true });
  return entries.filter(entry => entry.isFile() && isAudioFile(entry.name))
    .map(entry => buildLocalSong(entry.name, req))
    .sort((a, b) => a.title.localeCompare(b.title));
}

async function listCloudinarySongs(req) {
  const resources = [];
  let nextCursor;
  do {
    const result = await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'video',
      prefix: getCloudinaryPrefix(),
      max_results: 500,
      next_cursor: nextCursor,
    });
    resources.push(...ensureArray(result.resources));
    nextCursor = result.next_cursor;
  } while (nextCursor);

  return resources.filter(resource => isAudioFile(`track.${resource.format || ''}`))
    .map(resource => buildCloudinarySong(resource, req))
    .sort((a, b) => a.title.localeCompare(b.title));
}

function parseRangeHeader(rangeHeader, size) {
  if (!rangeHeader) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) return null;
  const [, startStr, endStr] = match;
  let start;
  let end;
  if (startStr && endStr) {
    start = parseInt(startStr, 10);
    end = parseInt(endStr, 10);
  } else if (startStr) {
    start = parseInt(startStr, 10);
    end = size - 1;
  } else if (endStr) {
    const suffixLength = parseInt(endStr, 10);
    if (!suffixLength) return null;
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    return null;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < 0) return null;
  if (start >= size || end >= size || start > end) return null;
  return { start, end };
}

function getLocalIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
    }
  }
  return ips;
}

function getPlaylistForUser(playlistId, userId) {
  const playlist = db.prepare('SELECT id, name FROM playlists WHERE id = ? AND user_id = ?').get(playlistId, userId);
  if (!playlist) return null;
  const songs = db.prepare('SELECT song_id FROM playlist_songs WHERE playlist_id = ? ORDER BY created_at').all(playlistId);
  return { id: playlist.id, name: playlist.name, songs: songs.map(item => item.song_id) };
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, normalizeUploadName(file.originalname, file.mimetype)),
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!isSupportedUpload(file)) return cb(new Error('Only supported audio files can be uploaded'));
    return cb(null, true);
  },
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    storage: CLOUDINARY_CONFIGURED ? 'cloudinary' : 'local',
    cloudinaryConfigured: CLOUDINARY_CONFIGURED,
    cloudinaryFolder: CLOUDINARY_AUDIO_FOLDER || null,
  });
});

app.post('/auth/register', authLimiter, async (req, res) => {
  try {
    const usernameResult = validateUsername(req.body.username);
    const emailResult = validateEmail(req.body.email);
    const passwordResult = validatePassword(req.body.password);
    const firstError = usernameResult.error || emailResult.error || passwordResult.error;
    if (firstError) return res.status(400).json({ error: firstError });

    const passwordHash = await bcrypt.hash(passwordResult.value, 12);
    const result = db.prepare("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'user')")
      .run(usernameResult.value, emailResult.value, passwordHash);
    const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    const accessToken = signAccessToken(user);
    const refreshToken = createRefreshToken(user);
    migrateLegacyPlaylistsToFirstUser();
    return res.status(201).json({ user: getPublicUser(user), accessToken, refreshToken });
  } catch (err) {
    if (err.code === 'ERR_SQLITE_CONSTRAINT_UNIQUE' || (err.code === 'ERR_SQLITE_ERROR' && String(err.message).includes('UNIQUE constraint failed'))) return res.status(400).json({ error: 'Username or email already exists' });
    console.error('Failed to register user:', err);
    return res.status(500).json({ error: 'Failed to register user' });
  }
});

app.post('/auth/login', authLimiter, async (req, res) => {
  try {
    const emailResult = validateEmail(req.body.email);
    if (emailResult.error || typeof req.body.password !== 'string') return res.status(401).json({ error: 'Invalid credentials' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(emailResult.value);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(req.body.password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    return res.json({ user: getPublicUser(user), accessToken: signAccessToken(user), refreshToken: createRefreshToken(user) });
  } catch (err) {
    console.error('Failed to login:', err);
    return res.status(500).json({ error: 'Failed to login' });
  }
});

app.post('/auth/refresh', authLimiter, (req, res) => {
  try {
    const refreshToken = String(req.body.refreshToken || '');
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token is required' });
    return res.json(rotateRefreshToken(refreshToken));
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

app.post('/auth/logout', requireAuth, (req, res) => {
  try {
    const refreshToken = String(req.body.refreshToken || '');
    if (refreshToken) {
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      if (payload.sid) revokeSession(payload.sid);
    }
    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    return res.json({ message: 'Logged out successfully' });
  }
});

app.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: getPublicUser(req.user) });
});

app.get('/songs', requireAuth, async (req, res) => {
  try {
    const songs = CLOUDINARY_CONFIGURED ? await listCloudinarySongs(req) : await listLocalSongs(req);
    res.json(songs);
  } catch (err) {
    console.error('Failed to list songs:', err);
    res.status(500).json({ error: 'Failed to list songs' });
  }
});

app.get('/playlists', requireAuth, (req, res) => {
  try {
    const playlists = db.prepare('SELECT id, name FROM playlists WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    const songRows = db.prepare('SELECT song_id FROM playlist_songs WHERE playlist_id = ? ORDER BY created_at');
    res.json(playlists.map(playlist => ({
      id: playlist.id,
      name: playlist.name,
      songs: songRows.all(playlist.id).map(item => item.song_id),
    })));
  } catch (err) {
    console.error('Failed to read playlists:', err);
    res.status(500).json({ error: 'Failed to read playlists' });
  }
});

app.post('/playlists', requireAuth, (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const songs = ensureArray(req.body.songs).map(String).slice(0, 500);
    if (!name || name.length > 80) return res.status(400).json({ error: 'Playlist name is required and must be 80 characters or less' });
    const newPlaylist = { id: Date.now().toString(), name, songs };
    const insertPlaylist = db.prepare('INSERT INTO playlists (id, user_id, name) VALUES (?, ?, ?)');
    const insertSong = db.prepare('INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)');
    db.exec('BEGIN');
    try {
      insertPlaylist.run(newPlaylist.id, req.user.id, name);
      songs.forEach(songId => insertSong.run(newPlaylist.id, songId));
      db.exec('COMMIT');
    } catch (txErr) {
      db.exec('ROLLBACK');
      throw txErr;
    }
    return res.status(201).json(newPlaylist);
  } catch (err) {
    if (err.code === 'ERR_SQLITE_CONSTRAINT_UNIQUE' || (err.code === 'ERR_SQLITE_ERROR' && String(err.message).includes('UNIQUE constraint failed'))) return res.status(400).json({ error: 'Playlist already exists' });
    console.error('Failed to create playlist:', err);
    return res.status(500).json({ error: 'Failed to create playlist' });
  }
});

app.put('/playlists/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    if (!getPlaylistForUser(id, req.user.id)) return res.status(404).json({ error: 'Playlist not found' });
    const nextName = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const hasSongs = Array.isArray(req.body.songs);
    if (nextName && nextName.length > 80) return res.status(400).json({ error: 'Playlist name must be 80 characters or less' });
    db.exec('BEGIN');
    try {
      if (nextName) db.prepare('UPDATE playlists SET name = ? WHERE id = ? AND user_id = ?').run(nextName, id, req.user.id);
      if (hasSongs) {
        db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ?').run(id);
        const insertSong = db.prepare('INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)');
        req.body.songs.map(String).slice(0, 500).forEach(songId => insertSong.run(id, songId));
      }
      db.exec('COMMIT');
    } catch (txErr) {
      db.exec('ROLLBACK');
      throw txErr;
    }
    return res.json(getPlaylistForUser(id, req.user.id));
  } catch (err) {
    console.error('Failed to update playlist:', err);
    return res.status(500).json({ error: 'Failed to update playlist' });
  }
});

app.delete('/playlists/:id', requireAuth, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM playlists WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Playlist not found' });
    return res.json({ message: 'Playlist deleted successfully' });
  } catch (err) {
    console.error('Failed to delete playlist:', err);
    return res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

app.get('/likes', requireAuth, (req, res) => {
  try {
    const likes = db.prepare('SELECT song_id FROM likes WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    return res.json(likes.map(item => item.song_id));
  } catch (err) {
    console.error('Failed to read likes:', err);
    return res.status(500).json({ error: 'Failed to read likes' });
  }
});

app.post('/likes', requireAuth, (req, res) => {
  try {
    const songId = String(req.body.songId || '').trim();
    if (!songId || songId.length > 500) return res.status(400).json({ error: 'Song ID is required' });
    db.prepare('INSERT OR IGNORE INTO likes (user_id, song_id) VALUES (?, ?)').run(req.user.id, songId);
    return res.status(201).json({ songId });
  } catch (err) {
    console.error('Failed to like song:', err);
    return res.status(500).json({ error: 'Failed to like song' });
  }
});

app.delete('/likes/:songId', requireAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM likes WHERE user_id = ? AND song_id = ?').run(req.user.id, req.params.songId);
    return res.json({ message: 'Song unliked successfully' });
  } catch (err) {
    console.error('Failed to unlike song:', err);
    return res.status(500).json({ error: 'Failed to unlike song' });
  }
});

app.post('/upload', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ensureUploadsDir();
  } catch (err) {
    console.error('Failed to prepare upload folder:', err);
    return res.status(500).json({ error: 'Failed to prepare upload folder' });
  }

  upload.single('song')(req, res, async (err) => {
    if (err) {
      console.error('Failed to upload song:', err);
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File is too large' });
      return res.status(400).json({ error: err.message || 'Failed to upload song' });
    }
    if (!req.file) return res.status(400).json({ error: 'No file was uploaded' });

    try {
      if (CLOUDINARY_CONFIGURED) {
        const uploaded = await cloudinary.uploader.upload(req.file.path, {
          resource_type: 'video',
          folder: sanitizeFolder(CLOUDINARY_AUDIO_FOLDER) || undefined,
          use_filename: true,
          unique_filename: true,
          overwrite: false,
        });
        await cleanupUploadedFile(req.file.path);
        return res.status(201).json({ message: 'Song uploaded successfully', song: buildCloudinarySong(uploaded, req) });
      }

      await ensureMusicDir();
      const destinationPath = path.resolve(MUSIC_DIR, req.file.filename);
      if (!isPathInside(destinationPath, MUSIC_DIR)) {
        await cleanupUploadedFile(req.file.path);
        return res.status(403).json({ error: 'Invalid upload path' });
      }
      await fs.promises.rename(req.file.path, destinationPath);
      return res.status(201).json({ message: 'Song uploaded successfully', song: buildLocalSong(path.basename(destinationPath), req) });
    } catch (uploadErr) {
      await cleanupUploadedFile(req.file.path);
      console.error('Failed to finalize upload:', uploadErr);
      return res.status(500).json({ error: 'Failed to upload song' });
    }
  });
});

app.get('/cover/:song', requireMediaAccess('cover'), async (req, res) => {
  const songPath = getLocalSongPath(req.params.song);
  if (!songPath) return res.status(400).json({ error: 'Invalid song path' });
  try {
    const metadata = await mm.parseFile(songPath);
    const picture = metadata.common.picture && metadata.common.picture[0];
    if (!picture) return res.status(404).json({ error: 'No cover art found' });
    res.set('Content-Type', picture.format);
    return res.send(picture.data);
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Song not found' });
    console.error('Failed to extract cover art:', err);
    return res.status(500).json({ error: 'Failed to extract cover art' });
  }
});

app.get('/stream/:song', requireMediaAccess('stream'), async (req, res) => {
  const songPath = getLocalSongPath(req.params.song);
  if (!songPath) return res.status(400).json({ error: 'Invalid song path' });
  try {
    const stats = await fs.promises.stat(songPath);
    const fileSize = stats.size;
    const range = req.headers.range;
    const streamSong = (options) => {
      const stream = fs.createReadStream(songPath, options);
      stream.on('error', (streamErr) => {
        console.error('Stream error:', streamErr);
        if (!res.headersSent) res.status(500).json({ error: 'Failed to stream song' });
        else res.end();
      });
      stream.pipe(res);
    };
    const contentType = getAudioContentType(songPath);
    if (range) {
      const parsed = parseRangeHeader(range, fileSize);
      if (!parsed) return res.status(416).end();
      const { start, end } = parsed;
      const chunkSize = end - start + 1;
      res.status(206).set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });
      streamSong({ start, end });
      return undefined;
    }
    res.set({ 'Accept-Ranges': 'bytes', 'Content-Length': fileSize, 'Content-Type': contentType });
    streamSong();
    return undefined;
  } catch (err) {
    console.error('Unable to stream song:', err);
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Song not found' });
    return res.status(500).json({ error: 'Unable to stream song' });
  }
});

app.get('/stream-cloud/:song', requireMediaAccess('stream'), async (req, res) => {
  if (!CLOUDINARY_CONFIGURED) return res.status(404).json({ error: 'Cloudinary storage is not configured' });
  try {
    const publicId = String(req.params.song || '');
    const url = cloudinary.url(publicId, { resource_type: 'video', secure: true });
    const headers = {};
    if (req.headers.range) headers.Range = req.headers.range;
    const response = await fetch(url, { headers });
    if (!response.ok || !response.body) return res.status(response.status).json({ error: 'Unable to stream song' });
    response.headers.forEach((value, key) => {
      if (['content-length', 'content-range', 'content-type', 'accept-ranges'].includes(key.toLowerCase())) res.set(key, value);
    });
    res.status(response.status);
    return Readable.fromWeb(response.body).pipe(res);
  } catch (err) {
    console.error('Unable to stream Cloudinary song:', err);
    return res.status(500).json({ error: 'Unable to stream song' });
  }
});

app.use((err, req, res, next) => {
  if (err.message === 'CORS origin not allowed') return res.status(403).json({ error: 'CORS origin not allowed' });
  console.error('Unhandled request error:', err);
  return res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
  try {
    await Promise.all([ensureMusicDir(), ensureUploadsDir()]);
    migrateLegacyPlaylistsToFirstUser();
    const localIps = getLocalIps();
    app.listen(PORT, '0.0.0.0', () => {
      console.log('Server running at:');
      console.log(`  - Local:   http://localhost:${PORT}`);
      if (localIps.length > 0) localIps.forEach(ip => console.log(`  - Network: http://${ip}:${PORT}`));
      else console.log('  - Network: No active network interfaces found');
      console.log(`Storage mode: ${CLOUDINARY_CONFIGURED ? `Cloudinary (${CLOUDINARY_AUDIO_FOLDER || 'root'})` : `Local folder ${MUSIC_DIR}`}`);
    });
  } catch (err) {
    console.error('Failed to start Pulse Player server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
