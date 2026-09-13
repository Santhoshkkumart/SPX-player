# AGENTS.md - Pulse Player Development Guide

This is a monorepo with two packages:
- `spx-fron/` - Expo/React Native frontend (Pulse Player mobile app)
- `spx-bend/` - Express.js backend (LAN music streaming server)

---

## Build/Lint/Test Commands

### Frontend (spx-fron)
```bash
cd spx-fron

# Install dependencies
npm install

# Start development server (with --host for LAN access on mobile)
npm start

# Run on Android emulator/device
npm run android

# Run on iOS simulator/device
npm run ios

# Run on web
npm run web

# Run tests (if configured)
npx jest --testPathPattern="ComponentName"

# Type checking (if TypeScript is added)
npx tsc --noEmit

# Linting
npx eslint . --ext .js,.jsx
```

### Backend (spx-bend)
```bash
cd spx-bend

# Install dependencies
npm install

# Start server (port 3000)
npm start

# Run server with auto-reload
npx nodemon server/index.js

# Run tests (currently exits with error - no tests configured)
npm test

# Run a specific test
npx jest --testPathPattern="filename"
npx mocha --file test/setup.js test/filename.test.js
```

---

## Code Style Guidelines

### General
- 2 spaces for indentation, single quotes for strings
- `const` by default; `let` only when reassignment needed; never `var`
- Strict equality (`===` / `!==`)
- Descriptive camelCase variables/functions, PascalCase components

### JavaScript/Node.js (Backend)
- CommonJS `require()` syntax
- Import order: core modules → external packages → local modules
- Use `async/await` over raw Promises
- Always wrap async operations in try/catch
- Return proper HTTP status codes (200, 400, 403, 404, 415, 500)
- Use `console.error()` for errors, `console.log()` for info only

### React Native/Expo (Frontend)
- Functional components with hooks (`useState`, `useEffect`, etc.)
- Use `StyleSheet.create()` for styles (not inline styles)
- Destructure props at function signature
- Clean up subscriptions/audio in useEffect cleanup functions
- Use `Platform.OS` for platform-specific code

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Variables/Functions | camelCase | `fetchSongs`, `isPlaying` |
| Components | PascalCase | `App`, `MiniPlayer` |
| Constants | SCREAMING_SNAKE | `DEFAULT_PORT` |
| Styles | camelCase | `backgroundColor` |
| Component files | PascalCase | `Player.jsx` |
| Other files | camelCase | `audioService.js` |

### Error Handling
- Always wrap async operations in try/catch
- Set user-friendly error messages (not raw error objects)
- Log errors with context: `console.error('Operation failed:', err)`

### Import Order
1. React and React Native core imports
2. Third-party packages (expo, lucide, etc.)
3. Component imports
4. Utility/hook imports
5. Relative imports

---

## File Structure

### Frontend (spx-fron)
```
spx-fron/
├── App.js                 # Main app component
├── app.json              # Expo configuration
├── app.config.js         # Dynamic Expo configuration
├── babel.config.js       # Babel configuration
├── components/           # Reusable UI components
├── screens/              # Screen-level components
├── hooks/                # Custom React hooks
├── utils/                # Helper functions
└── services/             # API/network code
```

### Backend (spx-bend)
```
spx-bend/
├── server/
│   └── index.js          # Main server entry
├── music/                 # Music files directory
└── package.json
```

---

## Testing Guidelines

- Place test files alongside source: `MyComponent.test.js`
- Descriptive test names: `describe('ComponentName')` / `it('should do X')`
- Mock external dependencies (network, file system)
- Test error paths, not just happy paths
- Frontend: React Native Testing Library
- Backend: Jest or Mocha with Supertest

---

## Important Notes

### Mobile Development
- Always use `--host` flag to enable LAN access from mobile devices
- Metro will show `exp://192.168.x.x:8082` instead of `127.0.0.1`
- Android emulator: Use `http://10.0.2.2:3000` for backend
- Physical device: Use your machine's LAN IP (e.g., `http://192.168.1.x:3000`)

### Configuration
- `app.json` - Static Expo configuration
- `app.config.js` - Dynamic Expo configuration (can use environment variables)

---

## Git Workflow
- Feature branches: `git checkout -b feature/my-feature`
- Commit messages: `git commit -m "Add player controls"`
- No committing of `node_modules/` or build artifacts
