# GEMINI.md - Pulse Player Project Context

## Project Overview
Pulse Player is a self-hosted LAN music streaming application designed for home networks. It allows users to serve MP3 files from a central computer and stream them to a mobile device on the same Wi-Fi network.

### Architecture
The project follows a monorepo structure with two main components:
- **`spx-bend/`**: Express.js backend for music management and streaming.
- **`spx-fron/`**: Expo/React Native frontend mobile application.

### Key Technologies
- **Backend**: Node.js, Express, Multer (uploads), Music-Metadata (artwork extraction), CORS.
- **Frontend**: React Native, Expo, Expo-AV (audio playback), Expo-Blur, Lucide-React-Native (icons), AsyncStorage.

---

## Building and Running

### Prerequisites
- Node.js and npm installed.
- Expo Go app on mobile (for physical device testing).

### Backend (`spx-bend/`)
1. **Navigate**: `cd spx-bend`
2. **Install**: `npm install`
3. **Start**: `npm start` (Runs on port 3000 by default)
4. **Music Folder**: Place MP3 files in `spx-bend/music/`.

### Frontend (`spx-fron/`)
1. **Navigate**: `cd spx-fron`
2. **Install**: `npm install`
3. **Start**: `npm start` (Starts Expo Metro Bundler)
4. **Mobile Access**: Use the QR code with Expo Go or run `npm run android` / `npm run ios`.

---

## Development Conventions

### Coding Style
- **Indentation**: 2 spaces.
- **Quotes**: Single quotes for strings.
- **Variables**: Use `const` by default, `let` for reassignment.
- **Naming**: `camelCase` for variables/functions, `PascalCase` for components/screens.
- **Backend Modules**: CommonJS (`require`).
- **Frontend Components**: Functional components with hooks.

### Important Implementation Details
- **Audio Mode**: Configured in `App.js` to play in background and silent mode.
- **LAN Connectivity**: 
  - Android Emulator: Use `http://10.0.2.2:3000`.
  - Physical Devices: Use the host machine's LAN IP (e.g., `http://192.168.x.x:3000`).
- **Error Handling**: Use `try/catch` for all async operations and provide user-friendly feedback.
- **Playlist Management**: Persistent storage in `spx-bend/playlists.json`.

---

## Key Files

### Backend (`spx-bend/`)
- `server/index.js`: Main server logic, API routes, and file system interactions.
- `package.json`: Dependencies and start scripts.
- `music/`: Directory for audio assets.
- `playlists.json`: (Generated) Persistent playlist data.

### Frontend (`spx-fron/`)
- `App.js`: Monolithic main component containing UI, playback logic, and state.
- `app.json` / `app.config.js`: Expo project configuration.
- `package.json`: Mobile dependencies and Expo scripts.

---

## Testing & Validation
- **Current Status**: No automated test suites are fully configured yet.
- **Manual Verification**: Test playback, playlist creation, song upload, and server connection via the in-app settings.
- **Proposed Stack**: Jest for both backend and frontend.

---

## Project Documentation
- `project.md`: High-level functional overview and data flow.
- `AGENTS.md`: Detailed developer guide, style rules, and folder structure.
