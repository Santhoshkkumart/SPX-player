# SPX-player Deployment

Pulse Player now supports two storage modes:

- `local`: songs are read from `spx-bend/music/`
- `cloudinary`: songs are listed from Cloudinary and uploads are pushed there

If Cloudinary environment variables are present, the backend automatically uses Cloudinary. If they are missing, it falls back to local files.

## Cloudinary Setup

1. Create or open your Cloudinary product environment.
2. Copy these values from the Cloudinary dashboard:
   - `cloud name`
   - `API key`
   - `API secret`
3. Choose a folder name for this app, for example `pulse-player`.

## Backend Local Setup

1. Open `spx-bend/.env.example`.
2. Create `spx-bend/.env` with:

```env
PORT=3000
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_AUDIO_FOLDER=pulse-player
```

3. Install backend dependencies:

```bash
cd spx-bend
npm install
```

4. Start the backend:

```bash
npm start
```

5. Verify the storage mode:

```bash
http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "storage": "cloudinary",
  "cloudinaryConfigured": true,
  "cloudinaryFolder": "pulse-player"
}
```

## Render Deployment

`render.yaml` now declares the required Cloudinary environment variables.

In Render:

1. Create the Blueprint service from the repo root.
2. Set these environment variables in the `pulse-player-api` service:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - optional: `CLOUDINARY_AUDIO_FOLDER`
3. Deploy.
4. Open `/health` on the deployed service and confirm `storage` is `cloudinary`.

## Frontend Setup

The frontend still talks only to your backend.

1. In `spx-fron`, create `.env` from `.env.example`.
2. Set:

```env
EXPO_PUBLIC_BACKEND_URL=https://your-render-backend.onrender.com
```

3. Install frontend dependencies if needed:

```bash
cd spx-fron
npm install
```

4. Start Expo:

```bash
npm start
```

## Upload Flow

Uploads from the mobile app now work like this:

1. App uploads the MP3 to `POST /upload`
2. Backend uploads the file to Cloudinary
3. `GET /songs` returns song objects with direct `streamUrl` values
4. App streams those Cloudinary URLs directly

## Notes

- Playlists still live in `spx-bend/playlists.json`.
- Likes still live on-device in AsyncStorage.
- Existing local MP3 support remains available when Cloudinary is not configured.
- Cloudinary audio assets are treated as `video` resources by Cloudinary.
