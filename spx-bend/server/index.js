require('dotenv').config();

const cors = require('cors');
const express = require('express');
const fs = require('fs');
const mm = require('music-metadata');
const multer = require('multer');
const os = require('os');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;
const PROJECT_ROOT = path.resolve(__dirname, '..');
const MUSIC_DIR = path.resolve(PROJECT_ROOT, 'music');
const PLAYLISTS_FILE = path.resolve(PROJECT_ROOT, 'playlists.json');
const UPLOADS_DIR = path.resolve(PROJECT_ROOT, '.uploads');
const CLOUDINARY_AUDIO_FOLDER = sanitizeFolder(process.env.CLOUDINARY_AUDIO_FOLDER || 'pulse-player');
const CLOUDINARY_CONFIGURED = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);
const AUDIO_EXTENSIONS = new Set(['.aac', '.flac', '.m4a', '.mp3', '.oga', '.ogg', '.wav']);

if (CLOUDINARY_CONFIGURED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

app.set('trust proxy', true);
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*'],
}));
app.use(express.json());

function sanitizeFolder(value) {
  return String(value || '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/{2,}/g, '/');
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function getAudioContentType(filename) {
  const ext = path.extname(String(filename || '')).toLowerCase();
  switch (ext) {
    case '.mp3':
      return 'audio/mpeg';
    case '.m4a':
    case '.mp4':
      return 'audio/mp4';
    case '.aac':
      return 'audio/aac';
    case '.wav':
      return 'audio/wav';
    case '.flac':
      return 'audio/flac';
    case '.ogg':
    case '.oga':
      return 'audio/ogg';
    default:
      return 'audio/mpeg';
  }
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
  const safeBase = baseName
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'upload';

  return `${Date.now()}-${safeBase}${ext}`;
}

const SUPPORTED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/x-mp3',
  'audio/x-mpeg',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/x-flac',
  'audio/aac',
  'audio/ogg',
  'application/octet-stream',
]);

function isSupportedUpload(file) {
  if (!file) return false;

  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimeType = (file.mimetype || '').toLowerCase();

  if (AUDIO_EXTENSIONS.has(ext)) return true;
  if (SUPPORTED_MIME_TYPES.has(mimeType) || mimeType.startsWith('audio/')) return true;

  return false;
}

function getDisplayTitle(rawName) {
  const basename = path.basename(String(rawName || ''), path.extname(String(rawName || '')));
  if (!basename) return 'Untitled Song';

  const withoutUploadPrefix = basename.replace(/^\d{13,}-/, '');
  return withoutUploadPrefix
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || basename;
}

function isPathInside(target, base) {
  const relative = path.relative(base, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function getRequestBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function getCloudinaryPrefix() {
  return CLOUDINARY_AUDIO_FOLDER ? `${CLOUDINARY_AUDIO_FOLDER}/` : undefined;
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
    if (err.code !== 'ENOENT') {
      console.error('Failed to remove temporary upload:', err);
    }
  }
}

async function readPlaylists() {
  try {
    const data = await fs.promises.readFile(PLAYLISTS_FILE, 'utf8');
    return ensureArray(JSON.parse(data));
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

async function writePlaylists(playlists) {
  await fs.promises.writeFile(PLAYLISTS_FILE, JSON.stringify(ensureArray(playlists), null, 2));
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
    streamUrl: `${baseUrl}/stream/${encodeURIComponent(safeName)}`,
    coverUrl: `${baseUrl}/cover/${encodeURIComponent(safeName)}`,
  };
}

function buildCloudinarySong(resource) {
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
    streamUrl: resource.secure_url || cloudinary.url(publicId, {
      resource_type: 'video',
      secure: true,
      format,
    }),
    coverUrl: null,
  };
}

async function listLocalSongs(req) {
  await ensureMusicDir();
  const entries = await fs.promises.readdir(MUSIC_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && isAudioFile(entry.name))
    .map((entry) => buildLocalSong(entry.name, req))
    .sort((a, b) => a.title.localeCompare(b.title));
}

async function listCloudinarySongs() {
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

  return resources
    .filter((resource) => isAudioFile(`track.${resource.format || ''}`))
    .map(buildCloudinarySong)
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

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < 0) {
    return null;
  }

  if (start >= size || end >= size || start > end) {
    return null;
  }

  return { start, end };
}

function getLocalIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, normalizeUploadName(file.originalname, file.mimetype));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!isSupportedUpload(file)) {
      cb(new Error('Only MP3 files can be uploaded'));
      return;
    }
    cb(null, true);
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

app.get('/songs', async (req, res) => {
  try {
    const songs = CLOUDINARY_CONFIGURED
      ? await listCloudinarySongs()
      : await listLocalSongs(req);

    res.json(songs);
  } catch (err) {
    console.error('Failed to list songs:', err);
    res.status(500).json({ error: 'Failed to list songs' });
  }
});

app.get('/playlists', async (req, res) => {
  try {
    const playlists = await readPlaylists();
    res.json(playlists);
  } catch (err) {
    console.error('Failed to read playlists:', err);
    res.status(500).json({ error: 'Failed to read playlists' });
  }
});

app.post('/playlists', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const songs = ensureArray(req.body.songs);

    if (!name) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }

    const playlists = await readPlaylists();
    if (playlists.find((playlist) => playlist.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: 'Playlist already exists' });
    }

    const newPlaylist = {
      id: Date.now().toString(),
      name,
      songs,
    };

    playlists.push(newPlaylist);
    await writePlaylists(playlists);
    return res.status(201).json(newPlaylist);
  } catch (err) {
    console.error('Failed to create playlist:', err);
    return res.status(500).json({ error: 'Failed to create playlist' });
  }
});

app.put('/playlists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const nextName = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const hasSongs = Array.isArray(req.body.songs);
    const playlists = await readPlaylists();
    const index = playlists.findIndex((playlist) => playlist.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (nextName) {
      playlists[index].name = nextName;
    }

    if (hasSongs) {
      playlists[index].songs = req.body.songs;
    }

    await writePlaylists(playlists);
    return res.json(playlists[index]);
  } catch (err) {
    console.error('Failed to update playlist:', err);
    return res.status(500).json({ error: 'Failed to update playlist' });
  }
});

app.delete('/playlists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const playlists = await readPlaylists();
    const remaining = playlists.filter((playlist) => playlist.id !== id);

    if (remaining.length === playlists.length) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    await writePlaylists(remaining);
    return res.json({ message: 'Playlist deleted successfully' });
  } catch (err) {
    console.error('Failed to delete playlist:', err);
    return res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

app.post('/upload', async (req, res) => {
  try {
    await ensureUploadsDir();
  } catch (err) {
    console.error('Failed to prepare upload folder:', err);
    return res.status(500).json({ error: 'Failed to prepare upload folder' });
  }

  upload.single('song')(req, res, async (err) => {
    if (err) {
      console.error('Failed to upload song:', err);
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File is too large' });
      }
      return res.status(400).json({ error: err.message || 'Failed to upload song' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded' });
    }

    try {
      if (CLOUDINARY_CONFIGURED) {
        const uploaded = await cloudinary.uploader.upload(req.file.path, {
          resource_type: 'video',
          folder: CLOUDINARY_AUDIO_FOLDER || undefined,
          use_filename: true,
          unique_filename: true,
          overwrite: false,
        });

        await cleanupUploadedFile(req.file.path);
        return res.status(201).json({
          message: 'Song uploaded successfully',
          song: buildCloudinarySong(uploaded),
        });
      }

      await ensureMusicDir();
      const destinationPath = path.resolve(MUSIC_DIR, req.file.filename);
      await fs.promises.rename(req.file.path, destinationPath);

      return res.status(201).json({
        message: 'Song uploaded successfully',
        song: path.basename(destinationPath),
      });
    } catch (uploadErr) {
      await cleanupUploadedFile(req.file.path);
      console.error('Failed to finalize upload:', uploadErr);
      return res.status(500).json({ error: 'Failed to upload song' });
    }
  });
});

app.get('/cover/:song', async (req, res) => {
  if (CLOUDINARY_CONFIGURED) {
    return res.status(404).json({ error: 'Cover art is not available for Cloudinary songs' });
  }

  const song = req.params.song;
  if (!isAudioFile(song)) {
    return res.status(400).json({ error: 'Only audio files have cover art' });
  }

  const songPath = path.resolve(MUSIC_DIR, song);
  if (!isPathInside(songPath, MUSIC_DIR)) {
    return res.status(403).json({ error: 'Invalid song path' });
  }

  try {
    const metadata = await mm.parseFile(songPath);
    const picture = metadata.common.picture && metadata.common.picture[0];

    if (!picture) {
      return res.status(404).json({ error: 'No cover art found' });
    }

    res.set('Content-Type', picture.format);
    return res.send(picture.data);
  } catch (err) {
    console.error('Failed to extract cover art:', err);
    return res.status(500).json({ error: 'Failed to extract cover art' });
  }
});

app.get('/stream/:song', async (req, res) => {
  const song = req.params.song;

  if (!isAudioFile(song)) {
    return res.status(415).json({ error: 'Only audio files can be streamed' });
  }

  const songPath = path.resolve(MUSIC_DIR, song);
  if (!isPathInside(songPath, MUSIC_DIR)) {
    return res.status(403).json({ error: 'Invalid song path' });
  }

  try {
    const stats = await fs.promises.stat(songPath);
    const fileSize = stats.size;
    const range = req.headers.range;

    const streamSong = (options) => {
      const stream = fs.createReadStream(songPath, options);
      stream.on('error', (streamErr) => {
        console.error('Stream error:', streamErr);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to stream song' });
        } else {
          res.end();
        }
      });
      stream.pipe(res);
    };

    const contentType = getAudioContentType(songPath);

    if (range) {
      const parsed = parseRangeHeader(range, fileSize);
      if (!parsed) {
        return res.status(416).end();
      }

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

    res.set({
      'Accept-Ranges': 'bytes',
      'Content-Length': fileSize,
      'Content-Type': contentType,
    });

    streamSong();
    return undefined;
  } catch (err) {
    console.error('Unable to stream song:', err);
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'Song not found' });
    }
    return res.status(500).json({ error: 'Unable to stream song' });
  }
});

async function startServer() {
  try {
    await Promise.all([ensureMusicDir(), ensureUploadsDir()]);
    const localIps = getLocalIps();

    app.listen(PORT, '0.0.0.0', () => {
      console.log('Server running at:');
      console.log(`  - Local:   http://localhost:${PORT}`);
      if (localIps.length > 0) {
        localIps.forEach(ip => {
          console.log(`  - Network: http://${ip}:${PORT}`);
        });
      } else {
        console.log(`  - Network: No active network interfaces found`);
      }
      console.log(`Storage mode: ${CLOUDINARY_CONFIGURED ? `Cloudinary (${CLOUDINARY_AUDIO_FOLDER || 'root'})` : `Local folder ${MUSIC_DIR}`}`);
      console.log(`Note for Android Emulator: Use http://10.0.2.2:${PORT} to connect to this server.`);
    });
  } catch (err) {
    console.error('Failed to start Pulse Player server:', err);
    process.exit(1);
  }
}

startServer();
