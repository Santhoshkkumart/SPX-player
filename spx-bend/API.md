# Pulse Player API

## Public

- `GET /health` - server health and storage mode.
- `POST /auth/register` - register a normal user with `username`, `email`, and `password`.
- `POST /auth/login` - login with `email` and `password`.
- `POST /auth/refresh` - rotate refresh token and return a new access token.

## Authenticated

Requires `Authorization: Bearer <accessToken>`.

- `POST /auth/logout` - revoke the current refresh token/session.
- `GET /auth/me` - return the current user.
- `GET /songs` - list songs with short-lived signed media URLs.
- `GET /stream/:song` - stream local audio by bearer token or signed media token.
- `GET /cover/:song` - return embedded cover art by bearer token or signed media token.
- `GET /playlists` - list only the current user's playlists.
- `POST /playlists` - create a playlist for the current user.
- `PUT /playlists/:id` - update only the current user's playlist.
- `DELETE /playlists/:id` - delete only the current user's playlist.
- `GET /likes` - list only the current user's liked song IDs.
- `POST /likes` - like a song with `{ "songId": "..." }`.
- `DELETE /likes/:songId` - unlike a song.

## Admin Only

Requires a valid access token for a user with `role: "admin"`.

- `POST /upload` - upload an audio file.

## First Admin

There is no public endpoint for admin promotion. Create the first admin locally on the server:

```bash
cd spx-bend
set FIRST_ADMIN_USERNAME=admin
set FIRST_ADMIN_EMAIL=admin@example.com
set FIRST_ADMIN_PASSWORD=ChangeMe12345
npm run create-admin
```

Use PowerShell syntax if preferred:

```powershell
$env:FIRST_ADMIN_USERNAME="admin"
$env:FIRST_ADMIN_EMAIL="admin@example.com"
$env:FIRST_ADMIN_PASSWORD="ChangeMe12345"
npm run create-admin
```
