import { TRACKING_CONFIG } from './config.js';

const HAND_LANDMARKS_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const FINGER_TIPS = [4, 8, 12, 16, 20];
const FINGER_PIPS = [2, 6, 10, 14, 18];

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

function isFingerExtended(landmarks, tipIndex, pipIndex) {
  return landmarks[tipIndex].y < landmarks[pipIndex].y;
}

function classifyGesture(landmarks) {
  if (!landmarks?.length) return 'none';

  const extended = FINGER_TIPS.map((tip, index) => isFingerExtended(landmarks, tip, FINGER_PIPS[index]));
  const [thumb, index, middle, ring, pinky] = extended;

  if (thumb && !index && !middle && !ring && !pinky) return 'thumbs up';
  if (!thumb && index && middle && !ring && !pinky) return 'peace sign';
  if (!thumb && index && !middle && !ring && !pinky) return 'pointing';
  if (extended.every(Boolean)) return 'open palm';
  if (extended.every((value) => !value)) return 'fist';

  const pinch = distance(landmarks[4], landmarks[8]) < 0.06;
  if (pinch) return 'pinch';

  return 'tracking';
}

function detectCombinedAction(hands) {
  if (hands.length < 2) return 'single hand';

  const [first, second] = hands;
  const palmDistance = distance(first.landmarks[0], second.landmarks[0]);
  const faceDistance = Math.abs(first.landmarks[9].x - second.landmarks[9].x);

  if (palmDistance < 0.12) return 'clasp hands together';
  if (faceDistance < 0.09) return 'hands together in front';
  if (first.gesture === 'open palm' && second.gesture === 'open palm') return 'hand over face';
  if (first.gesture === 'fist' && second.gesture === 'open palm') return 'facepalm';
  if (first.gesture === 'pointing' && second.gesture === 'open palm') return 'cover mouth';
  return 'dual hand tracking';
}

export class HandTracker {
  constructor() {
    this.detector = null;
  }

  async init() {
    if (this.detector) return;

    const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14');
    const { HandLandmarker, FilesetResolver } = vision;
    const filesetResolver = await FilesetResolver.forVisionTasks(HAND_LANDMARKS_URL);

    this.detector = await HandLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      },
      runningMode: 'VIDEO',
      numHands: TRACKING_CONFIG.maxHands,
    });
  }

  async update(video, timestampMs) {
    if (!this.detector || video.readyState < 2) return { hands: [], dominantGesture: 'none', combinedAction: 'idle' };

    const results = this.detector.detectForVideo(video, timestampMs);
    const hands = (results.landmarks ?? []).map((landmarks, index) => ({
      landmarks,
      handedness: results.handednesses?.[index]?.[0]?.categoryName ?? 'Unknown',
      gesture: classifyGesture(landmarks),
    }));

    const dominantGesture = hands[0]?.gesture ?? 'none';
    const combinedAction = detectCombinedAction(hands);

    return { hands, dominantGesture, combinedAction };
  }
}
