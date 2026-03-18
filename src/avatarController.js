import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MEMOJI_DEFAULTS } from './config.js';

function createMaterial(color, flatShading = false) {
  return new THREE.MeshStandardMaterial({ color, flatShading, roughness: 0.72, metalness: 0.05 });
}

function makeRoundedBox(width, height, depth, color) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), createMaterial(color));
}

function colorToThree(color) {
  return new THREE.Color(color);
}

export class AvatarController {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#07111f');
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(0, 1.8, 5.4);
    this.clock = new THREE.Clock();
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1.3, 0);

    this.avatarRoot = new THREE.Group();
    this.avatarRoot.position.y = -1.25;
    this.scene.add(this.avatarRoot);

    this.currentStyle = 'humanoid';
    this.memojiSettings = { ...MEMOJI_DEFAULTS };
    this.animationEnabled = true;

    this.setupScene();
    this.buildAvatar(this.currentStyle);
    this.onResize();
    window.addEventListener('resize', () => this.onResize());
  }

  setupScene() {
    this.scene.add(new THREE.AmbientLight('#ffffff', 1.35));
    const keyLight = new THREE.DirectionalLight('#ffffff', 2.2);
    keyLight.position.set(3, 4, 5);
    this.scene.add(keyLight);

    const fill = new THREE.DirectionalLight('#7dd3fc', 1.4);
    fill.position.set(-4, 2, 3);
    this.scene.add(fill);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(4.5, 64),
      new THREE.MeshStandardMaterial({ color: '#10243f', roughness: 0.9, metalness: 0.1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.45;
    this.scene.add(floor);
  }

  clearAvatar() {
    this.avatarRoot.clear();
  }

  buildAvatar(style = 'humanoid', settings = this.memojiSettings) {
    this.currentStyle = style;
    this.memojiSettings = { ...this.memojiSettings, ...settings };
    this.clearAvatar();

    const root = new THREE.Group();
    const palette = this.getPalette(style, this.memojiSettings);
    const flat = style === 'lowpoly';

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.1, 6, 12), createMaterial(palette.shirt, flat));
    torso.position.y = 0.5;
    root.add(torso);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.18, 16), createMaterial(palette.skin, flat));
    neck.position.y = 1.35;
    root.add(neck);

    const headGroup = new THREE.Group();
    headGroup.position.y = 1.7;
    root.add(headGroup);

    const headGeometry = style === 'anime'
      ? new THREE.SphereGeometry(0.62, 32, 24)
      : new THREE.SphereGeometry(0.55 + this.memojiSettings.faceShape * 0.1, 28, 24);
    const head = new THREE.Mesh(headGeometry, createMaterial(palette.skin, flat));
    head.scale.y = 1 + (this.memojiSettings.faceShape - 0.5) * 0.45;
    headGroup.add(head);

    const hair = this.createHair(style, palette, flat);
    headGroup.add(hair);

    const eyeLeft = new THREE.Mesh(new THREE.SphereGeometry(0.08 * this.memojiSettings.eyeSize, 16, 16), createMaterial('#101217'));
    const eyeRight = eyeLeft.clone();
    eyeLeft.position.set(-0.18, 0.04, 0.48);
    eyeRight.position.set(0.18, 0.04, 0.48);
    headGroup.add(eyeLeft, eyeRight);

    const browLeft = makeRoundedBox(0.18, 0.03, 0.03, palette.hair);
    const browRight = browLeft.clone();
    browLeft.position.set(-0.18, 0.2, 0.49);
    browRight.position.set(0.18, 0.2, 0.49);
    headGroup.add(browLeft, browRight);

    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.13 * this.memojiSettings.mouthWidth, 0.025, 12, 24, Math.PI),
      createMaterial('#b9505f'),
    );
    mouth.position.set(0, -0.16, 0.47);
    mouth.rotation.z = Math.PI;
    headGroup.add(mouth);

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.16 * this.memojiSettings.noseLength, 12),
      createMaterial(palette.skin, flat),
    );
    nose.position.set(0, -0.03, 0.51);
    nose.rotation.x = Math.PI / 2;
    headGroup.add(nose);

    const accessory = this.createAccessory(palette, flat);
    if (accessory) headGroup.add(accessory);

    const leftArm = this.createArm(palette, flat, -0.82);
    const rightArm = this.createArm(palette, flat, 0.82);
    root.add(leftArm.group, rightArm.group);

    const leftLeg = this.createLeg(palette, flat, -0.26);
    const rightLeg = this.createLeg(palette, flat, 0.26);
    root.add(leftLeg, rightLeg);

    this.avatar = {
      root,
      torso,
      headGroup,
      head,
      hair,
      eyes: [eyeLeft, eyeRight],
      brows: [browLeft, browRight],
      mouth,
      arms: [leftArm, rightArm],
      legs: [leftLeg, rightLeg],
    };

    this.avatarRoot.add(root);
  }

  getPalette(style, settings) {
    const baseSkin = colorToThree(settings.skinColor);
    if (style === 'anime') {
      return { skin: '#f7d7c4', shirt: '#7c3aed', pants: '#1d4ed8', hair: settings.hairColor };
    }
    if (style === 'lowpoly') {
      return { skin: baseSkin, shirt: '#10b981', pants: '#0f172a', hair: settings.hairColor };
    }
    if (style === 'cartoon') {
      return { skin: baseSkin, shirt: '#fb923c', pants: '#2563eb', hair: settings.hairColor };
    }
    if (style === 'memoji') {
      return { skin: baseSkin, shirt: '#38bdf8', pants: '#1e3a8a', hair: settings.hairColor };
    }
    return { skin: baseSkin, shirt: '#22c55e', pants: '#111827', hair: settings.hairColor };
  }

  createHair(style, palette, flat) {
    const group = new THREE.Group();
    const hairMat = createMaterial(palette.hair, flat);
    const shape = this.memojiSettings.hairStyle;

    if (shape === 'bun') {
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
      shell.position.y = 0.2;
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 18), hairMat);
      bun.position.set(0, 0.58, -0.14);
      group.add(shell, bun);
      return group;
    }

    if (shape === 'mohawk') {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.52), hairMat);
      strip.position.set(0, 0.38, -0.06);
      group.add(strip);
      return group;
    }

    if (shape === 'swoop') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.48, 28, 18, 0, Math.PI * 2, 0, Math.PI / 1.8), hairMat);
      cap.position.y = 0.18;
      cap.rotation.z = -0.25;
      group.add(cap);
      return group;
    }

    const cap = new THREE.Mesh(new THREE.SphereGeometry(style === 'anime' ? 0.62 : 0.5, 28, 18, 0, Math.PI * 2, 0, Math.PI / 1.9), hairMat);
    cap.position.y = 0.2;
    group.add(cap);
    return group;
  }

  createAccessory(palette, flat) {
    if (this.memojiSettings.accessory === 'none') return null;
    const group = new THREE.Group();
    const material = createMaterial('#cbd5e1', flat);

    if (this.memojiSettings.accessory === 'glasses') {
      const frameA = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.015, 10, 20), material);
      const frameB = frameA.clone();
      const bridge = makeRoundedBox(0.12, 0.02, 0.02, '#cbd5e1');
      frameA.position.set(-0.18, 0.05, 0.5);
      frameB.position.set(0.18, 0.05, 0.5);
      bridge.position.set(0, 0.05, 0.5);
      group.add(frameA, frameB, bridge);
      return group;
    }

    if (this.memojiSettings.accessory === 'visor') {
      const visor = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 12, 40, Math.PI), material);
      visor.position.set(0, 0.2, 0.36);
      visor.rotation.z = Math.PI;
      group.add(visor);
      return group;
    }

    if (this.memojiSettings.accessory === 'earrings') {
      const earring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 8, 16), material);
      const second = earring.clone();
      earring.position.set(-0.46, -0.06, 0.04);
      second.position.set(0.46, -0.06, 0.04);
      earring.rotation.y = Math.PI / 2;
      second.rotation.y = Math.PI / 2;
      group.add(earring, second);
      return group;
    }

    return group;
  }

  createArm(palette, flat, x) {
    const group = new THREE.Group();
    group.position.set(x, 0.96, 0);

    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.5, 4, 8), createMaterial(palette.skin, flat));
    upper.rotation.z = x < 0 ? Math.PI / 7 : -Math.PI / 7;
    upper.position.y = -0.15;

    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.48, 4, 8), createMaterial(palette.skin, flat));
    forearm.position.y = -0.68;

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.12), createMaterial(palette.skin, flat));
    hand.position.y = -1.02;

    const fingerSegments = Array.from({ length: 5 }, (_, index) => {
      const finger = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.13, 0.035), createMaterial(palette.skin, flat));
      finger.position.set((index - 2) * 0.045, -1.18, 0.02);
      group.add(finger);
      return finger;
    });

    group.add(upper, forearm, hand);

    return { group, upper, forearm, hand, fingerSegments };
  }

  createLeg(palette, flat, x) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.95, 5, 10), createMaterial(palette.pants, flat));
    leg.position.set(x, -0.62, 0);
    return leg;
  }

  setAnimationEnabled(enabled) {
    this.animationEnabled = enabled;
  }

  setAvatarStyle(style) {
    this.buildAvatar(style);
  }

  updateMemoji(settings) {
    this.buildAvatar(this.currentStyle === 'memoji' ? 'memoji' : this.currentStyle, settings);
  }

  applyTracking(faceState, handState) {
    if (!this.avatar || !this.animationEnabled) return;

    const { headGroup, eyes, brows, mouth, torso, arms } = this.avatar;
    const expressions = faceState?.expressions ?? { blinkLeft: 0, blinkRight: 0, mouthOpen: 0, brow: 0 };
    const rotation = faceState?.rotation ?? { x: 0, y: 0, z: 0 };

    headGroup.rotation.x = rotation.x * 0.95;
    headGroup.rotation.y = rotation.y * 1.1;
    headGroup.rotation.z = rotation.z * 0.9;
    torso.rotation.x = rotation.x * 0.15;
    torso.rotation.y = rotation.y * 0.18;

    eyes[0].scale.y = 1 - expressions.blinkLeft * 0.92;
    eyes[1].scale.y = 1 - expressions.blinkRight * 0.92;
    brows[0].position.y = 0.2 + expressions.brow * 0.09;
    brows[1].position.y = 0.2 + expressions.brow * 0.09;
    brows[0].rotation.z = this.memojiSettings.eyebrowTilt + expressions.brow * 0.2;
    brows[1].rotation.z = -this.memojiSettings.eyebrowTilt - expressions.brow * 0.2;
    mouth.scale.y = 1 + expressions.mouthOpen * 2.6;
    mouth.scale.x = 1 + expressions.mouthOpen * 0.35;

    const hands = handState?.hands ?? [];
    arms.forEach((arm, index) => {
      const hand = hands[index];
      const sideMultiplier = index === 0 ? -1 : 1;
      arm.group.rotation.z = sideMultiplier * 0.18 + (hand ? (0.5 - hand.landmarks[0].x) * 1.4 : 0);
      arm.group.rotation.x = hand ? (0.5 - hand.landmarks[0].y) * 1.25 : 0.08;
      arm.forearm.rotation.z = hand?.gesture === 'peace sign' ? 0.38 * sideMultiplier : 0;
      arm.hand.rotation.x = hand?.gesture === 'thumbs up' ? -0.45 : 0;

      arm.fingerSegments.forEach((finger, fingerIndex) => {
        const curl = hand ? Math.max(0, hand.landmarks[Math.min(20, 4 + fingerIndex * 4)].y - hand.landmarks[Math.min(18, 2 + fingerIndex * 4)].y) * 8 : 0;
        finger.rotation.x = THREE.MathUtils.clamp(curl, 0, 1.3);
      });
    });

    const combined = handState?.combinedAction;
    if (combined === 'clasp hands together' || combined === 'hands together in front') {
      arms[0].group.rotation.z = -0.28;
      arms[1].group.rotation.z = 0.28;
      arms[0].group.rotation.x = -0.8;
      arms[1].group.rotation.x = -0.8;
    }
    if (combined === 'cover mouth' || combined === 'facepalm') {
      arms[0].group.rotation.x = -1.15;
      arms[0].group.rotation.z = -0.4;
    }
    if (combined === 'hand over face') {
      arms[1].group.rotation.x = -1.1;
      arms[1].group.rotation.z = 0.35;
    }
  }

  onResize() {
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  render() {
    const elapsed = this.clock.getElapsedTime();
    if (this.avatar?.root && this.animationEnabled) {
      this.avatar.root.position.y = -1.25 + Math.sin(elapsed * 1.4) * 0.03;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
