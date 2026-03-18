# Browser Avatar Puppeteer

A browser-only real-time avatar puppeteering demo built with HTML, CSS, JavaScript, Three.js, and MediaPipe Tasks Vision.

## Features

- Procedural 3D avatars rendered with Three.js, including humanoid, anime, low-poly, cartoon, and Memoji-style variants.
- Real-time face tracking for head rotation, blinking, brows, and mouth movement.
- Real-time two-hand tracking with gesture detection for peace sign, thumbs up, pointing, open palm, fist, pinch, and combined hand actions.
- Memoji-style avatar creator with customization controls and a randomizer.
- Live debug overlays for face and hand landmarks plus tracking metrics.
- Mobile-friendly responsive layout with touch-safe controls.

## Project structure

- `index.html` — page structure and module loading.
- `styles.css` — responsive UI styling.
- `src/camera.js` — camera startup and teardown helpers.
- `src/faceTracking.js` — MediaPipe face landmark + blendshape processing.
- `src/handTracking.js` — MediaPipe hand landmark + gesture processing.
- `src/avatarController.js` — Three.js scene and procedural avatar rig.
- `src/ui.js` — UI bindings and Memoji creator helpers.
- `src/main.js` — app orchestration and animation loop.

## Running locally

Because the application uses camera APIs and module imports, serve it from a local web server instead of opening the HTML file directly.

### Option 1: Python

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

### Option 2: Any static file server

You can use `npx serve`, VS Code Live Server, or another static web server, then open the served URL in a modern browser.

## Notes

- The MediaPipe task models are loaded from public CDNs, so the first run needs internet access.
- On mobile, the front camera is requested using `facingMode: "user"`.
- The avatar is procedural instead of using downloaded GLB/VRM files, which keeps the project installation-free while still supporting multiple styles and Memoji-like customization.
