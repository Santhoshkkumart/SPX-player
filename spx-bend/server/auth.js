const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL_DAYS,
  MEDIA_TOKEN_TTL,
} = require('./config');
const { db, getPublicUser } = require('./db');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user.id), role: user.role },
    JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function createRefreshToken(user) {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const token = jwt.sign(
    { sub: String(user.id), sid: sessionId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d` }
  );

  db.prepare(`
    INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, user.id, hashToken(token), expiresAt.toISOString());

  return token;
}

function revokeSession(sessionId) {
  db.prepare(`
    UPDATE sessions
    SET revoked_at = datetime('now')
    WHERE id = ? AND revoked_at IS NULL
  `).run(sessionId);
}

function rotateRefreshToken(refreshToken) {
  const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  if (payload.type !== 'refresh' || !payload.sid || !payload.sub) {
    throw new Error('Invalid refresh token');
  }

  const session = db.prepare(`
    SELECT sessions.*, users.id AS user_id, users.username, users.email, users.role, users.created_at
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.id = ?
  `).get(payload.sid);

  if (!session || session.revoked_at || session.refresh_token_hash !== hashToken(refreshToken)) {
    throw new Error('Invalid refresh token');
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    revokeSession(session.id);
    throw new Error('Refresh token expired');
  }

  revokeSession(session.id);

  const user = {
    id: session.user_id,
    username: session.username,
    email: session.email,
    role: session.role,
    created_at: session.created_at,
  };

  return {
    user: getPublicUser(user),
    accessToken: signAccessToken(user),
    refreshToken: createRefreshToken(user),
  };
}

function signMediaToken(user, songId, scope) {
  return jwt.sign(
    { sub: String(user.id), role: user.role, media: String(songId), scope },
    JWT_ACCESS_SECRET,
    { expiresIn: MEDIA_TOKEN_TTL }
  );
}

function verifyBearer(req) {
  const header = req.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;
  return jwt.verify(match[1], JWT_ACCESS_SECRET);
}

function getAuthUserFromPayload(payload) {
  if (!payload || !payload.sub) return null;
  return db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(payload.sub);
}

function requireAuth(req, res, next) {
  try {
    const payload = verifyBearer(req);
    const user = getAuthUserFromPayload(payload);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}

function requireMediaAccess(scope) {
  return (req, res, next) => {
    try {
      const bearerPayload = verifyBearer(req);
      const bearerUser = getAuthUserFromPayload(bearerPayload);
      if (bearerUser) {
        req.user = bearerUser;
        return next();
      }
    } catch (err) {}

    try {
      const token = String(req.query.token || '');
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const payload = jwt.verify(token, JWT_ACCESS_SECRET);
      const song = String(req.params.song || '');
      if (payload.scope !== scope || payload.media !== song) {
        return res.status(403).json({ error: 'Invalid media token' });
      }

      const user = getAuthUserFromPayload(payload);
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      req.user = user;
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired media token' });
    }
  };
}

module.exports = {
  hashToken,
  signAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeSession,
  signMediaToken,
  requireAuth,
  requireAdmin,
  requireMediaAccess,
};
