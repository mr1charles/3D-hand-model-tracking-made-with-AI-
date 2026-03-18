import { TRACKING_CONFIG } from './config.js';

const FACE_LANDMARKS_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';

function smoothValue(previous, next, alpha) {
  return previous + (next - previous) * alpha;
}

function safeBlendshape(categoryName, blendshapes) {
  return blendshapes.find((item) => item.categoryName === categoryName)?.score ?? 0;
}

export class FaceTracker {
  constructor() {
    this.detector = null;
    this.lastState = {
      blinkLeft: 0,
      blinkRight: 0,
      mouthOpen: 0,
      brow: 0,
      rotation: { x: 0, y: 0, z: 0 },
    };
  }

  async init() {
    if (this.detector) return;

    const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14');
    const { FaceLandmarker, FilesetResolver } = vision;
    const filesetResolver = await FilesetResolver.forVisionTasks(FACE_LANDMARKS_URL);

    this.detector = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      },
      runningMode: 'VIDEO',
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      numFaces: TRACKING_CONFIG.maxFaces,
    });
  }

  estimateRotation(matrix) {
    if (!matrix?.data?.length) {
      return this.lastState.rotation;
    }

    const m = matrix.data;
    const yaw = Math.atan2(m[8], m[10]);
    const pitch = Math.atan2(-m[9], Math.sqrt(m[8] ** 2 + m[10] ** 2));
    const roll = Math.atan2(m[1], m[5]);

    const nextRotation = {
      x: smoothValue(this.lastState.rotation.x, pitch, TRACKING_CONFIG.rotationSmoothing),
      y: smoothValue(this.lastState.rotation.y, yaw, TRACKING_CONFIG.rotationSmoothing),
      z: smoothValue(this.lastState.rotation.z, roll, TRACKING_CONFIG.rotationSmoothing),
    };

    this.lastState.rotation = nextRotation;
    return nextRotation;
  }

  async update(video, timestampMs) {
    if (!this.detector || video.readyState < 2) {
      return null;
    }

    const results = this.detector.detectForVideo(video, timestampMs);
    if (!results.faceLandmarks.length) {
      return { landmarks: [], expressions: this.lastState, rotation: this.lastState.rotation };
    }

    const blendshapes = results.faceBlendshapes?.[0]?.categories ?? [];
    const blinkLeft = safeBlendshape('eyeBlinkLeft', blendshapes);
    const blinkRight = safeBlendshape('eyeBlinkRight', blendshapes);
    const jawOpen = safeBlendshape('jawOpen', blendshapes);
    const browInnerUp = safeBlendshape('browInnerUp', blendshapes);
    const browDownLeft = safeBlendshape('browDownLeft', blendshapes);
    const browDownRight = safeBlendshape('browDownRight', blendshapes);

    const expressions = {
      blinkLeft: smoothValue(this.lastState.blinkLeft, blinkLeft, TRACKING_CONFIG.expressionSmoothing),
      blinkRight: smoothValue(this.lastState.blinkRight, blinkRight, TRACKING_CONFIG.expressionSmoothing),
      mouthOpen: smoothValue(this.lastState.mouthOpen, jawOpen, TRACKING_CONFIG.expressionSmoothing),
      brow: smoothValue(
        this.lastState.brow,
        browInnerUp - (browDownLeft + browDownRight) * 0.5,
        TRACKING_CONFIG.expressionSmoothing,
      ),
    };

    this.lastState = {
      ...this.lastState,
      ...expressions,
    };

    const rotation = this.estimateRotation(results.facialTransformationMatrixes?.[0]);

    return {
      landmarks: results.faceLandmarks[0],
      expressions,
      rotation,
    };
  }
}
