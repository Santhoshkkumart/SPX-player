# SPX Player 🎵

**SPX Player** is a self-hosted, high-fidelity music streaming ecosystem. It allows you to host your personal lossless and high-quality music collection on a central computer/server and stream uncompressed audio seamlessly to mobile devices, tablets, and web browsers over local Wi-Fi, Tailscale Funnel, or remote HTTPS endpoints with zero delay.

---

## 🌟 Highlights & Key Features

* 🎨 **Obsidian-Violet Luxury Design System**: Handcrafted UI featuring dark glass paneling (`#07090E`), ambient glow halos, claymorphic card textures, high-contrast micro-typography, and a floating bottom navigation island.
* 📀 **Authentic Vinyl LP Turntable Deck**: Full-screen player featuring a 360° rotating vinyl LP record with concentric groove rings, centered album artwork label, silver-violet stylus tonearm overlay, and non-snapping continuous rotation physics.
* ⚡ **High-Performance Gapless Audio Pipeline**: Zero-compression audio playback via `expo-audio` with automatic **background pre-buffering** (pre-fetches the next track 10 seconds before the current song ends for seamless queue transitions).
* 🌐 **Universal Server Endpoint & Tailscale Support**: Seamlessly configure or switch your backend server IP (`http://192.168.x.x:5000`) or Tailscale Funnel domain (`https://your-node.ts.net`) directly from the login screen or settings modal with real-time ping latency indicators.
* 🔐 **JWT Dual-Token Security**: Complete authentication system supporting access and refresh tokens, user registration, and secure media endpoint protection.
* 📤 **Multi-File Batch Uploader**: Fast audio file uploader with real-time speed calculation (`MB/s` / `KB/s`), progress tracking, and server-side metadata/ID3 artwork extraction.
* 📑 **Playlist & Library Control**: Create playlists, batch add tracks, download audio files directly to mobile device storage, delete tracks, and trigger instant server library resyncs.
* 🔀 **Full Transport Controls**: Interactive time slider, volume control, mute toggle, shuffle, loop single (`Repeat1`), repeat queue (`Repeat`), and song like/favorite toggles.

---

## 🛠️ Tech Stack & Architecture

### **Frontend (`spx-fron`)**
* **Framework**: React Native 0.76+ & Expo SDK 52 (Expo Router / Managed Workflow)
* **Audio Engine**: `expo-audio` for low-latency streaming and background audio playback
* **Design & Styling**: Vanilla React Native `StyleSheet`, `expo-blur` (Glassmorphic blur effects), `expo-linear-gradient` (Luxury gradients)
* **Icons & Assets**: `lucide-react-native` vector icon suite
* **Networking**: Fetch API with JWT Interceptor and `XMLHttpRequest` with upload progress tracking

### **Backend (`spx-bend`)**
* **Server Runtime**: Node.js & Express.js
* **Database**: SQLite3 with automatic schema migration and initialization (`db.js`)
* **Audio Processing**: `music-metadata` for ID3 tag extraction (Artist, Title, Album, Embedded Covers)
* **Media Streaming**: Ranged HTTP Streaming (`206 Partial Content`) for instant playback seek capability
* **Authentication**: `jsonwebtoken` (JWT) & `bcryptjs` password hashing

---

## 📁 Repository Structure

```text
SPX-project/
├── spx-fron/                         # Mobile & Web Frontend (Expo / React Native)
│   ├── App.js                        # App root entry point, state management & main layout
│   ├── app.config.js                 # Dynamic Expo configuration & native device permissions
│   ├── screens/
│   │   └── PlayerView.js             # Full-screen vinyl LP turntable deck & playback controls
│   ├── components/
│   │   ├── AuthScreen.js             # Login / Register & server IP input card
│   │   ├── MiniPlayer.js             # Floating island audio mini-player capsule
│   │   ├── SongRow.js                # Track list row with equalizer wave badge & actions
│   │   ├── PlaylistCard.js           # Glass playlist card with gradient tags
│   │   ├── Modals.js                 # Settings, Create Playlist, Add Tracks & Upload modals
│   │   └── ProgressBar.js            # Custom seek slider & audio duration display
│   ├── hooks/
│   │   ├── useAudio.js               # Audio playback lifecycle, queueing & pre-buffering hook
│   │   ├── useAuth.js                # JWT session management & token refresh hook
│   │   └── useSongs.js               # Server fetch, upload, and song list state hook
│   └── utils/
│       └── helpers.js                # URL sanitization, ID extraction & track helpers
│
└── spx-bend/                         # LAN Streaming Backend (Express.js & Node.js)
    ├── server/
    │   ├── index.js                  # Main Express API server, routes & ranged stream handler
    │   ├── auth.js                   # JWT middleware & media access verification
    │   └── db.js                     # SQLite database setup & migrations
    └── music/                        # Local directory for stored audio files & uploads
```

---

## 🚀 Quick Start & Installation

### Prerequisites

* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher
* **Expo Go App**: Installed on your mobile phone (iOS / Android) or an emulator (Android Studio / Xcode)

---

### 1. Backend Setup (`spx-bend`)

1. Open terminal and navigate to the backend directory:
   ```bash
   cd spx-bend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file (or copy `.env.example`):
   ```bash
   cp .env.example .env
   ```
   *Configure your preferred `PORT` (default `5000`) and `JWT_SECRET`.*

4. Start the server:
   ```bash
   npm start
   ```
   *The backend will print your local network IP (e.g., `http://192.168.1.100:5000`).*

---

### 2. Frontend Setup (`spx-fron`)

1. Open a second terminal window and navigate to the frontend directory:
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
   *For network tunneling across different subnets, run:*
   ```bash
   npm run tunnel
   ```

4. Scan the QR code with **Expo Go** on your mobile phone or press `a` for Android / `w` for Web.

5. On the App Login screen, enter your **Server URL** (e.g., `http://192.168.1.100:5000`) and log in or register a new account.

---

## 📡 API Reference

### **Authentication**
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Register a new user account |
| `POST` | `/auth/login` | Authenticate user & receive JWT tokens |
| `POST` | `/auth/refresh` | Refresh an expired access token |
| `GET` | `/auth/me` | Fetch active user profile |
| `POST` | `/auth/logout` | Invalidate current user session |

### **Songs & Streaming**
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/songs` | Fetch all available library songs |
| `GET` | `/stream/:id` | Ranged HTTP high-fidelity audio stream (`206 Partial Content`) |
| `GET` | `/cover/:id` | Fetch embedded song cover artwork |
| `GET` | `/download/:id` | Direct high-speed song download endpoint |
| `DELETE` | `/songs/:id` | Delete a song from server library |
| `POST` | `/resync` | Trigger server directory scan & metadata resync |

### **Playlists**
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/playlists` | Fetch user playlists |
| `POST` | `/playlists` | Create a new playlist |
| `POST` | `/playlists/:id/songs` | Add track to playlist |
| `DELETE` | `/playlists/:id/songs/:songId` | Remove track from playlist |
| `DELETE` | `/playlists/:id` | Delete entire playlist |

### **Upload & System**
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/upload` | Multipart audio file upload endpoint |
| `GET` | `/health` | Server status and connectivity health check |

---

## 📦 Building Standalone Android APK

To build a standalone APK for Android using EAS Build:

1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```

2. Build the preview APK:
   ```bash
   cd spx-fron
   npx eas build -p android --profile preview
   ```

3. Download the generated `.apk` link upon build completion and install on your Android device.

---

## 🛡️ License

Private Repository. Designed and built for high-fidelity personal media streaming.
