import { startCamera } from './camera.js';
import { FaceTracker } from './faceTracking.js';
import { HandTracker } from './handTracking.js';
import { AvatarController } from './avatarController.js';
import { createUI } from './ui.js';
import { TRACKING_CONFIG } from './config.js';

const video = document.querySelector('#cameraFeed');
const debugCanvas = document.querySelector('#debugCanvas');
const sceneCanvas = document.querySelector('#sceneCanvas');
const debugContext = debugCanvas.getContext('2d');
const ui = createUI();
const avatarController = new AvatarController(sceneCanvas);
const faceTracker = new FaceTracker();
const handTracker = new HandTracker();

let stream = null;
let running = false;
let previousFrameTime = performance.now();
let smoothedFps = 0;

const state = {
  face: {
    landmarks: [],
    expressions: { blinkLeft: 0, blinkRight: 0, mouthOpen: 0, brow: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  hands: {
    hands: [],
    dominantGesture: 'none',
    combinedAction: 'idle',
  },
};

function resizeDebugCanvas() {
  const width = video.videoWidth || video.clientWidth || 640;
  const height = video.videoHeight || video.clientHeight || 480;
  debugCanvas.width = width;
  debugCanvas.height = height;
}

function drawPoints(points, color, radius = 2.2) {
  debugContext.fillStyle = color;
  for (const point of points) {
    debugContext.beginPath();
    debugContext.arc((1 - point.x) * debugCanvas.width, point.y * debugCanvas.height, radius, 0, Math.PI * 2);
    debugContext.fill();
  }
}

function drawDebug() {
  debugContext.clearRect(0, 0, debugCanvas.width, debugCanvas.height);

  if (ui.elements.toggleFaceLandmarks.checked && state.face.landmarks.length) {
    drawPoints(state.face.landmarks, TRACKING_CONFIG.debugColors.face, 1.6);
  }

  if (ui.elements.toggleHandLandmarks.checked) {
    state.hands.hands.forEach((hand) => {
      const color = hand.handedness === 'Left' ? TRACKING_CONFIG.debugColors.leftHand : TRACKING_CONFIG.debugColors.rightHand;
      drawPoints(hand.landmarks, color, 3.1);
    });
  }
}

async function renderLoop(timestamp) {
  if (!running) return;

  const delta = Math.max(16, timestamp - previousFrameTime);
  previousFrameTime = timestamp;
  smoothedFps = smoothedFps * 0.9 + (1000 / delta) * 0.1;

  const [faceResult, handResult] = await Promise.all([
    faceTracker.update(video, timestamp),
    handTracker.update(video, timestamp),
  ]);

  if (faceResult) state.face = faceResult;
  if (handResult) state.hands = handResult;

  drawDebug();
  avatarController.setAnimationEnabled(ui.elements.toggleAvatarAnimation.checked);
  avatarController.applyTracking(state.face, state.hands);
  avatarController.render();

  ui.setMetrics({
    fps: smoothedFps,
    gesture: state.hands.dominantGesture,
    hands: state.hands.hands.length,
    combinedAction: state.hands.combinedAction,
    face: state.face,
  });

  requestAnimationFrame(renderLoop);
}

async function bootTracking() {
  ui.setStatus('Loading models');
  await Promise.all([faceTracker.init(), handTracker.init()]);
  stream = await startCamera(video, (status) => ui.setStatus(status));
  resizeDebugCanvas();
  running = true;
  previousFrameTime = performance.now();
  requestAnimationFrame(renderLoop);
}

function bindUI() {
  ui.elements.startCameraButton.addEventListener('click', async () => {
    if (running) return;

    try {
      await bootTracking();
    } catch (error) {
      console.error(error);
      ui.setStatus('Camera error');
      ui.elements.debugMetrics.innerHTML = `<li>${error.message}</li>`;
    }
  });

  ui.elements.avatarModelSelect.addEventListener('change', (event) => {
    avatarController.setAvatarStyle(event.target.value);
    if (event.target.value === 'memoji') {
      avatarController.updateMemoji(ui.getMemojiSettings());
    }
  });

  [
    ui.elements.faceShapeInput,
    ui.elements.skinColorInput,
    ui.elements.hairStyleInput,
    ui.elements.hairColorInput,
    ui.elements.eyeSizeInput,
    ui.elements.eyebrowTiltInput,
    ui.elements.noseLengthInput,
    ui.elements.mouthWidthInput,
    ui.elements.accessoryInput,
  ].forEach((element) => {
    element.addEventListener('input', () => {
      avatarController.updateMemoji(ui.getMemojiSettings());
    });
  });

  ui.elements.randomizeMemojiButton.addEventListener('click', () => {
    const randomized = ui.randomizeMemoji();
    ui.elements.avatarModelSelect.value = 'memoji';
    avatarController.setAvatarStyle('memoji');
    avatarController.updateMemoji(randomized);
  });

  window.addEventListener('resize', resizeDebugCanvas);
  video.addEventListener('loadedmetadata', resizeDebugCanvas);
}

bindUI();
avatarController.render();
ui.setStatus('Ready');
