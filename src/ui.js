import { MEMOJI_DEFAULTS, TRACKING_CONFIG } from './config.js';

export function createUI() {
  const elements = {
    startCameraButton: document.querySelector('#startCameraButton'),
    toggleFaceLandmarks: document.querySelector('#toggleFaceLandmarks'),
    toggleHandLandmarks: document.querySelector('#toggleHandLandmarks'),
    toggleAvatarAnimation: document.querySelector('#toggleAvatarAnimation'),
    avatarModelSelect: document.querySelector('#avatarModelSelect'),
    randomizeMemojiButton: document.querySelector('#randomizeMemojiButton'),
    cameraStatus: document.querySelector('#cameraStatus'),
    fpsValue: document.querySelector('#fpsValue'),
    gestureValue: document.querySelector('#gestureValue'),
    handValue: document.querySelector('#handValue'),
    debugMetrics: document.querySelector('#debugMetrics'),
    faceShapeInput: document.querySelector('#faceShapeInput'),
    skinColorInput: document.querySelector('#skinColorInput'),
    hairStyleInput: document.querySelector('#hairStyleInput'),
    hairColorInput: document.querySelector('#hairColorInput'),
    eyeSizeInput: document.querySelector('#eyeSizeInput'),
    eyebrowTiltInput: document.querySelector('#eyebrowTiltInput'),
    noseLengthInput: document.querySelector('#noseLengthInput'),
    mouthWidthInput: document.querySelector('#mouthWidthInput'),
    accessoryInput: document.querySelector('#accessoryInput'),
  };

  function setStatus(text) {
    elements.cameraStatus.textContent = text;
  }

  function setMetrics({ fps, gesture, hands, combinedAction, face }) {
    elements.fpsValue.textContent = `${fps.toFixed(0)}`;
    elements.gestureValue.textContent = combinedAction && combinedAction !== 'single hand' ? combinedAction : gesture;
    elements.handValue.textContent = `${hands}`;
    elements.debugMetrics.innerHTML = [
      `Head rotation — pitch ${face.rotation.x.toFixed(2)}, yaw ${face.rotation.y.toFixed(2)}, roll ${face.rotation.z.toFixed(2)}`,
      `Blink — left ${face.expressions.blinkLeft.toFixed(2)}, right ${face.expressions.blinkRight.toFixed(2)}`,
      `Mouth open — ${face.expressions.mouthOpen.toFixed(2)}`,
      `Brow lift — ${face.expressions.brow.toFixed(2)}`,
      `Dominant gesture — ${gesture}`,
      `Combined hand action — ${combinedAction}`,
      `Smoothing — face ${TRACKING_CONFIG.expressionSmoothing}, rotation ${TRACKING_CONFIG.rotationSmoothing}`,
    ]
      .map((line) => `<li>${line}</li>`)
      .join('');
  }

  function getMemojiSettings() {
    return {
      faceShape: Number(elements.faceShapeInput.value),
      skinColor: elements.skinColorInput.value,
      hairStyle: elements.hairStyleInput.value,
      hairColor: elements.hairColorInput.value,
      eyeSize: Number(elements.eyeSizeInput.value),
      eyebrowTilt: Number(elements.eyebrowTiltInput.value),
      noseLength: Number(elements.noseLengthInput.value),
      mouthWidth: Number(elements.mouthWidthInput.value),
      accessory: elements.accessoryInput.value,
    };
  }

  function setMemojiSettings(settings) {
    elements.faceShapeInput.value = settings.faceShape;
    elements.skinColorInput.value = settings.skinColor;
    elements.hairStyleInput.value = settings.hairStyle;
    elements.hairColorInput.value = settings.hairColor;
    elements.eyeSizeInput.value = settings.eyeSize;
    elements.eyebrowTiltInput.value = settings.eyebrowTilt;
    elements.noseLengthInput.value = settings.noseLength;
    elements.mouthWidthInput.value = settings.mouthWidth;
    elements.accessoryInput.value = settings.accessory;
  }

  function randomizeMemoji() {
    const skinPalette = ['#f1c27d', '#c68642', '#8d5524', '#ffdbac', '#e0ac69'];
    const hairPalette = ['#2b1d0e', '#6d4c41', '#b45309', '#111827', '#7c2d12'];
    const accessories = ['none', 'glasses', 'visor', 'earrings'];
    const hairStyles = ['cap', 'swoop', 'bun', 'mohawk'];
    const random = {
      faceShape: Math.random().toFixed(2),
      skinColor: skinPalette[Math.floor(Math.random() * skinPalette.length)],
      hairStyle: hairStyles[Math.floor(Math.random() * hairStyles.length)],
      hairColor: hairPalette[Math.floor(Math.random() * hairPalette.length)],
      eyeSize: (0.75 + Math.random() * 0.65).toFixed(2),
      eyebrowTilt: (-0.4 + Math.random() * 0.8).toFixed(2),
      noseLength: (0.75 + Math.random() * 0.7).toFixed(2),
      mouthWidth: (0.75 + Math.random() * 0.7).toFixed(2),
      accessory: accessories[Math.floor(Math.random() * accessories.length)],
    };

    const castRandom = {
      faceShape: Number(random.faceShape),
      skinColor: random.skinColor,
      hairStyle: random.hairStyle,
      hairColor: random.hairColor,
      eyeSize: Number(random.eyeSize),
      eyebrowTilt: Number(random.eyebrowTilt),
      noseLength: Number(random.noseLength),
      mouthWidth: Number(random.mouthWidth),
      accessory: random.accessory,
    };

    setMemojiSettings(castRandom);
    return castRandom;
  }

  setMemojiSettings(MEMOJI_DEFAULTS);

  return {
    elements,
    setStatus,
    setMetrics,
    getMemojiSettings,
    setMemojiSettings,
    randomizeMemoji,
  };
}
