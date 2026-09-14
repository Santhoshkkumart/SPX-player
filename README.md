# SPX Player 🎵

**SPX Player** is a self-hosted, local network (LAN) music streaming application. It allows you to host your personal music collection on a central computer and stream high-quality audio to mobile devices over your home Wi-Fi network.

---

## 🛠️ Architecture

This repository is structured as a monorepo containing two main packages:

```
SPX-project/
├── spx-fron/             # Expo / React Native Mobile Application
│   ├── App.js            # Main application component & layout
│   ├── app.config.js     # Dynamic Expo configuration & native permissions
│   ├── components/       # UI components (MiniPlayer, SongRow, Modals, AuthScreen)
│   ├── hooks/            # Custom React hooks (useAudio, useAuth, useSongs, etc.)
│   └── assets/           # App icons, adaptive icons, and splash screen
│
└── spx-bend/             # Express.js Backend LAN Streaming Server
    ├── server/
    │   ├── index.js      # Main Express server, API routes, and media streaming
    │   ├── auth.js       # JWT authentication & media token security
    │   └── db.js         # SQLite database initialization & migrations
    └── music/            # Local directory for stored audio files
```

---

## ✨ Features

- **🔐 User Authentication**: Secure JWT access & refresh token authentication system.
- **🌐 Dynamic LAN Server IP**: Change your server LAN IP directly on the login screen or in settings.
- **🎧 High-Quality Audio Playback**: Built with `expo-audio` supporting MP3, FLAC, AAC, WAV, and OGG formats.
- **📱 Background Playback**: Supports background audio playback with lock screen media controls.
- **❤️ Custom Playlists & Favorites**: Create custom playlists and save your favorite songs.
- **📤 Media Upload**: Upload music files directly with automatic metadata and artwork extraction.
- **🎨 Glassmorphism Dark UI**: Premium dark-mode user interface designed for mobile and web.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Expo Go**: Available on iOS App Store & Android Google Play Store (for development testing)

---

### 1. Backend Server Setup (`spx-bend`)

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd spx-bend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```
   *The server will start on port `3000` (listening on `0.0.0.0`) and display your local network IP (e.g., `http://192.168.31.243:3000`).*

---

### 2. Mobile App Setup (`spx-fron`)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd spx-fron
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npm start
   ```
   *Or start in tunnel mode:*
   ```bash
   npm run tunnel
   ```

4. Scan the generated QR code using **Expo Go** on your phone (or press `w` to open in browser).

---

## 📦 Building Standalone Android APK

To build a standalone Android `.apk` file using Expo Application Services (EAS):

1. Install EAS CLI (if not already installed):
   ```bash
   npm install -g eas-cli
   ```

2. Run the build command inside `spx-fron`:
   ```bash
   cd spx-fron
   npx eas build -p android --profile preview
   ```

3. Once the build completes, download and install the generated `.apk` file on your Android device.

---

## 📡 API Endpoints

### Authentication
- `POST /auth/register` - Create a new user account
- `POST /auth/login` - Sign in and receive JWT access & refresh tokens
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Revoke current session
- `GET /auth/me` - Get current user profile

### Songs & Playlists
- `GET /songs` - Fetch all available songs
- `GET /stream/:id` - High-performance audio stream endpoint
- `GET /playlists` - Fetch user playlists
- `POST /playlists` - Create a new playlist
- `POST /upload` - Upload new audio files (Admin only)

---

## 🛡️ License

Private repository. Created for personal media streaming.
