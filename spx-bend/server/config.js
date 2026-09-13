const crypto = require('crypto');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(PROJECT_ROOT, 'data');
const MUSIC_DIR = path.resolve(PROJECT_ROOT, 'music');
const UPLOADS_DIR = path.resolve(PROJECT_ROOT, '.uploads');
const PLAYLISTS_FILE = path.resolve(PROJECT_ROOT, 'playlists.json');

function requiredSecret(name) {
  const value = process.env[name];
  if (value && value.length >= 32) {
    return value;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set to a strong secret in production`);
  }

  const fallback = crypto.createHash('sha256')
    .update(`pulse-player-dev-${name}`)
    .digest('hex');
  console.warn(`${name} is not set. Using a development-only fallback secret.`);
  return fallback;
}

module.exports = {
  PORT: process.env.PORT || 3000,
  PROJECT_ROOT,
  DATA_DIR,
  MUSIC_DIR,
  UPLOADS_DIR,
  PLAYLISTS_FILE,
  DATABASE_PATH: process.env.DATABASE_PATH || path.resolve(DATA_DIR, 'player.db'),
  JWT_ACCESS_SECRET: requiredSecret('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: requiredSecret('JWT_REFRESH_SECRET'),
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || '15m',
  REFRESH_TOKEN_TTL_DAYS: Number.parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '30', 10),
  MEDIA_TOKEN_TTL: process.env.MEDIA_TOKEN_TTL || '15m',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '',
  CLOUDINARY_AUDIO_FOLDER: process.env.CLOUDINARY_AUDIO_FOLDER || 'pulse-player',
  CLOUDINARY_CONFIGURED: Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ),
};
