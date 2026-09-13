# Pulse Player Project Overview

Pulse Player is a self-hosted LAN music streaming project with two parts:

- `spx-fron/` - an Expo / React Native mobile app
- `spx-bend/` - an Express.js backend that serves music over the local network

The goal of the project is simple: put MP3 files in the backend `music/` folder, run the server, and use the mobile app to browse and play them on the same Wi-Fi network.

## How The Pieces Fit Together

1. The backend scans `spx-bend/music/` for `.mp3` files.
2. It exposes HTTP endpoints for:
   - listing songs
   - streaming audio
   - serving embedded cover art
   - reporting server health
3. The mobile app fetches the song list from the backend.
4. When a user taps a song, the app streams it directly from the backend.

## Frontend

Location: `spx-fron/`

This is the Pulse Player mobile client built with Expo and React Native.

### Main behavior

- Loads songs from the backend on startup.
- Lets the user change the backend URL from an in-app settings modal.
- Shows a home view with:
  - server status / connection state
  - a search field
  - a playlist section
  - a recently played list
- Opens a player view with:
  - album art
  - playback progress
  - play / pause controls
  - skip, repeat, and volume icons

### Important frontend details

- Default backend URL is hardcoded in `App.js`.
- The app uses `expo-av` for audio playback.
- It uses `BlurView` and `LinearGradient` for the UI styling.
- It has Android-specific fallback logic for `10.0.2.2` and `localhost`.

### Frontend entry points

- `spx-fron/App.js` - main app UI and playback logic
- `spx-fron/app.json` - Expo config
- `spx-fron/app.config.js` - dynamic Expo config
- `spx-fron/babel.config.js` - Babel config

## Backend

Location: `spx-bend/`

This is the music server that the mobile app talks to.

### Main behavior

- Ensures the `music/` directory exists.
- Lists MP3 files in that directory.
- Streams songs with HTTP range support.
- Extracts embedded cover art from MP3 metadata.
- Exposes a health endpoint for connection checks.

### API endpoints

- `GET /health`
  - Returns `{ status: 'ok' }`

- `GET /songs`
  - Returns a JSON array of MP3 filenames in `music/`

- `GET /stream/:song`
  - Streams the requested MP3 file
  - Supports partial content via `Range` headers

- `GET /cover/:song`
  - Returns embedded cover art if the MP3 contains artwork
  - Returns `404` if no cover art exists

### Backend entry points

- `spx-bend/index.js` - simple launcher that loads the server
- `spx-bend/server/index.js` - Express app and route definitions

## Data Flow

1. A user starts the backend server.
2. The server reads audio files from `spx-bend/music/`.
3. The mobile app connects to the backend URL.
4. The app requests `/songs` to build its library view.
5. When a song is selected, the app requests `/stream/:song` to play it.
6. If artwork is available, the app loads `/cover/:song` for visuals.

## Repository Structure

```text
spx-project/
|-- spx-fron/        # Expo mobile app
|-- spx-bend/        # Express music server
`-- AGENTS.md        # Local development instructions
```

## Local Development

### Frontend

```bash
cd spx-fron
npm install
npm start
```

### Backend

```bash
cd spx-bend
npm install
npm start
```

## Runtime Expectations

- The backend listens on port `3000` by default.
- The backend should be reachable over LAN from a phone or emulator.
- Android emulators can use `http://10.0.2.2:3000`.
- Physical devices should use the machine's LAN IP.

## Notes

- Only `.mp3` files are handled by the backend.
- The backend refuses invalid paths to avoid directory traversal.
- The frontend currently uses placeholder artwork when no local art is available.
- There is no test suite configured for the backend yet.
