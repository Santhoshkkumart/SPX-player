# SPX-player: Project Notes

Developer-facing notes on how Pulse Player is put together, what state it is in, and the gotchas worth remembering. For setup and usage, see `README.md`.

## What it is

A self-hosted music streaming platform in one monorepo:

- `spx-fron/`: Expo + React Native Android app (shows as *SPX Player*)
- `spx-bend/`: Node.js + Express + SQLite backend that serves and manages the music

The server runs on an old laptop (Ubuntu Server) and is reached from the phone over Tailscale, or over the home LAN.

## How the pieces fit

1. The user logs in. The app receives a short-lived **access token** and a rotating **refresh token**.
2. The app calls `GET /songs`. The backend lists tracks from the local `music/` folder, or from Cloudinary if configured.
3. When the user plays a track, the backend issues a **short-lived media token** scoped to that song.
4. The app requests `/stream/:song` (and `/cover/:song`) with that token. The backend validates it and streams the audio with HTTP range support.
5. Admins upload tracks through `POST /upload`. The backend validates the file, reads its ID3 tags, and stores it locally or in Cloudinary.

## Backend map (`spx-bend/server/`)

| File | Responsibility |
| :--- | :--- |
| `index.js` | Express app, middleware, all routes, streaming, uploads, storage-mode switching |
| `auth.js` | Access/refresh/media token signing, refresh rotation, session revocation, `requireAuth`, `requireAdmin`, `requireMediaAccess` |
| `db.js` | SQLite setup (`node:sqlite`), schema and migrations, WAL mode, foreign keys on |
| `config.js` | Paths and environment config; refuses weak or missing secrets in production |
| `validation.js` | Username, email, and password validation |
| `create-admin.js`, `make-admin.js` | One-off admin creation and promotion scripts |

**Tables:** `users`, `sessions`, `playlists`, `playlist_songs`, `likes`.

## Frontend map (`spx-fron/`)

| Area | Files |
| :--- | :--- |
| Root | `App.js` wires the hooks together and renders the main layout |
| Hooks | `useAuth` (login, register, refresh, authenticated requests), `useSongs` (library, backend URL, resync, delete), `useAudio` (playback, queue, seek, buffering), `usePlaylists`, `useLikedSongs` |
| Screens | `PlayerView` (artwork, progress, controls, portrait/landscape) |
| Components | `AuthScreen`, `MiniPlayer`, `SongRow`, `PlaylistCard`, `ProgressBar`, `Modals` (settings, playlists, upload) |
| Native config | `app.config.js`, `eas.json`, `plugins/withNetworkSecurityConfig.js` |

## Storage modes

| Mode | When | Songs live in |
| :--- | :--- | :--- |
| Local | Cloudinary variables missing | `spx-bend/music/` |
| Cloudinary | All three `CLOUDINARY_*` credentials set | Cloudinary (audio as `video` resources) |

The backend picks the mode at startup and `GET /health` reports it. Cloudinary offloads large audio storage and delivery from the laptop's disk, so the laptop only handles auth, the database, and API traffic.

## Deployment

**Current setup:** Ubuntu Server on the laptop, managed over SSH, reached through Tailscale. The app's server URL points at the server's Tailscale address.

**Planned:** a public HTTPS API through a Cloudflare Tunnel (no router port-forwarding), then a production AAB build pointing at `https://api.<domain>`.

## Status

**Done**

- [x] Expo app with auth, library, search, player, mini player, playlists, likes, admin upload
- [x] Express API with SQLite, JWT access and refresh tokens, sessions, roles
- [x] Range streaming, cover art extraction, signed media tokens
- [x] Helmet, CORS, rate limiting, upload validation, path-traversal protection
- [x] Standalone Android APK through EAS Build
- [x] Backend running on the home server, reachable over Tailscale
- [x] Cloudinary integration implemented

**Remaining**

- [ ] Add real Cloudinary credentials and check `/health` reports `cloudinary`
- [ ] Upload and stream test through Cloudinary
- [ ] Cloudflare Tunnel and a public HTTPS domain
- [ ] Production build with the HTTPS backend URL
- [ ] Backend test suite (none yet)

## Gotchas

- **Node version:** the backend uses the built-in `node:sqlite`, so it needs Node 22 or newer.
- **Cleartext HTTP on Android:** release builds block plain HTTP by default. It worked in Expo Go but failed in the standalone APK until `plugins/withNetworkSecurityConfig.js` was added. Tailscale encrypts the traffic in the meantime. A public deployment should use HTTPS.
- **Do not delete `spx-fron/android/`:** EAS uses the existing native project, and Expo's `android.package` value can be ignored while it exists.
- **Playlists moved to SQLite.** Older versions used `playlists.json`, and the backend migrates legacy playlists to the first user.
- **Secrets stay on the server.** Never commit `.env`. Only `.env.example` belongs in git.
- **Older docs may be stale.** If anything here disagrees with the code and `package.json` files, the code wins.

## Common commands

```bash
# Backend
cd spx-bend && npm install && npm start
npm run create-admin
npm run make-admin -- <username>

# App
cd spx-fron && npm install && npm start
eas build --platform android --profile preview
```