// 3D mannequin scene, ported from the web app's createBodyViewer
// (js/core.js). Pure three.js: mesh construction, lights, finishes,
// highlight/heat/soreness APIs, eased rotate/zoom, auto-rotate.
//
// DOM glue replaced for React Native: sizing via resize(), gestures via
// pan()/pinch()/tap() drivers, blob shadow via DataTexture, settings via
// constructor options and setters.

import * as THREE from 'three';

import { groupOf } from '@/src/data/muscles';

// Match the web app's three r147 look: no color management, linear output.
THREE.ColorManagement.enabled = false;

export type BodyFinish = 'standard' | 'chrome' | 'xray' | 'matte';

export interface BodySceneOptions {
  width: number;
  height: number;
  pixelRatio: number;
  accentHex: string;
  finish: BodyFinish;
  autoRotate: boolean;
  reduceMotion: boolean;
}

const FINISHES: Record<
  BodyFinish,
  {
    base: number;
    neutral: number;
    roughness: number;
    metalness: number;
    opacity: number;
  }
> = {
  standard: {
    base: 0x3b4356,
    neutral: 0x222836,
    roughness: 0.45,
    metalness: 0.08,
    opacity: 1,
  },
  chrome: {
    base: 0x9aa4b8,
    neutral: 0x5a6272,
    roughness: 0.15,
    metalness: 0.9,
    opacity: 1,
  },
  xray: {
    base: 0x7cc4ff,
    neutral: 0x3a5a7a,
    roughness: 0.3,
    metalness: 0.1,
    opacity: 0.35,
  },
  matte: {
    base: 0x4a4458,
    neutral: 0x2a2733,
    roughness: 0.9,
    metalness: 0.0,
    opacity: 1,
  },
};

const VTHEME = { base: 0x3b4356, neutral: 0x222836 };

// Reduced segment counts for mobile GPUs (web uses 26x20 spheres etc.).
const SEG = {
  sphereW: 20,
  sphereH: 14,
  capSeg: 5,
  capRad: 14,
  lathe: 28,
  cyl: 16,
  ring: 48,
};

function makeBlobTexture(): THREE.DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - size / 2;
      const dy = y - size / 2;
      const d = Math.sqrt(dx * dx + dy * dy);
      const t = Math.max(0, Math.min(1, (d - 6) / (62 - 6)));
      const a = Math.round(255 * 0.6 * (1 - t));
      const i = (y * size + x) * 4;
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = a;
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  return tex;
}

export class BodyScene {
  private gl: any;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private body = new THREE.Group();
  private ring: THREE.Mesh;
  private baseMat: THREE.MeshStandardMaterial;
  private neutralMat: THREE.MeshStandardMaterial;
  private mats: Record<string, THREE.MeshStandardMaterial> = {};
  private muscleMeshes: THREE.Mesh[] = [];
  private raycaster = new THREE.Raycaster();

  private width: number;
  private height: number;
  private accentHex: string;
  private autoRotate: boolean;
  private reduceMotion: boolean;

  private rotY = Math.PI * 0.12;
  private targetRotY = this.rotY;
  private rotX = 0;
  private camDist: number;
  private pinchStartDist = 0;
  private lastAct = Date.now();
  private interacting = false;

  private raf = 0;
  private dead = false;
  private active = true;

  constructor(gl: any, opts: BodySceneOptions) {
    this.gl = gl;
    this.width = opts.width;
    this.height = opts.height;
    this.accentHex = opts.accentHex;
    this.autoRotate = opts.autoRotate;
    this.reduceMotion = opts.reduceMotion;
    this.camDist = 4.6;

    // three.js needs a canvas-like object; expo-gl supplies the real context.
    const canvas = {
      width: opts.width,
      height: opts.height,
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      context: gl,
      antialias: true,
      alpha: true,
    });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(opts.pixelRatio || 1, 2));
    this.renderer.setSize(opts.width, opts.height);

    this.camera = new THREE.PerspectiveCamera(
      38,
      opts.width / opts.height,
      0.1,
      100
    );
    this.camera.position.set(0, 2.05, this.camDist);
    this.camera.lookAt(0, 1.85, 0);
    this.fitCameraToView();

    this.scene.add(new THREE.HemisphereLight(0xaab4d4, 0x0b0d12, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 6, 4);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x7c8cff, 1.2);
    rim.position.set(-4, 3, -4);
    this.scene.add(rim);
    const fill = new THREE.DirectionalLight(0xdde4ff, 0.6);
    fill.position.set(0, 2, 6);
    this.scene.add(fill);
    // Dedicated back light so the rear view isn't flat and dark.
    const backLight = new THREE.DirectionalLight(0xffffff, 1.0);
    backLight.position.set(0, 5, -6);
    this.scene.add(backLight);

    // soft blob shadow under feet
    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 1.5),
      new THREE.MeshBasicMaterial({
        map: makeBlobTexture(),
        transparent: true,
        depthWrite: false,
      })
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.295;
    this.scene.add(blob);

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(1.55, 1.63, SEG.ring),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(opts.accentHex),
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      })
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.3;
    this.scene.add(this.ring);

    this.scene.add(this.body);
    this.baseMat = new THREE.MeshStandardMaterial({
      color: VTHEME.base,
      roughness: 0.45,
      metalness: 0.08,
    });
    this.neutralMat = new THREE.MeshStandardMaterial({
      color: VTHEME.neutral,
      roughness: 0.55,
      metalness: 0.05,
    });

    this.buildBody();
    this.setFinish(opts.finish);
    this.loop();
  }

  // ---- mesh helpers (ported verbatim from the web app) ----

  private matFor(mid: string): THREE.MeshStandardMaterial {
    return this.mats[mid] || (this.mats[mid] = this.baseMat.clone());
  }

  private part(
    geo: THREE.BufferGeometry,
    mid: string | null,
    x: number,
    y: number,
    z: number,
    parent?: THREE.Object3D
  ): THREE.Mesh {
    const m = new THREE.Mesh(geo, mid ? this.matFor(mid) : this.neutralMat);
    m.position.set(x, y, z);
    if (mid) {
      m.userData.muscle = mid;
      this.muscleMeshes.push(m);
    }
    (parent || this.body).add(m);
    return m;
  }

  private capMesh(
    r: number,
    a: THREE.Vector3,
    b: THREE.Vector3,
    mid: string,
    parent?: THREE.Object3D
  ): THREE.Mesh {
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(
      new THREE.CapsuleGeometry(r, len, SEG.capSeg, SEG.capRad),
      this.matFor(mid)
    );
    m.position.copy(a).lerp(b, 0.5);
    m.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.clone().sub(a).normalize()
    );
    m.userData.muscle = mid;
    this.muscleMeshes.push(m);
    (parent || this.body).add(m);
    return m;
  }

  private ball(
    r: number,
    mid: string | null,
    x: number,
    y: number,
    z: number,
    parent?: THREE.Object3D
  ): THREE.Mesh {
    return this.part(
      new THREE.SphereGeometry(r, SEG.sphereW, SEG.sphereH),
      mid,
      x,
      y,
      z,
      parent
    );
  }

  private box(
    w: number,
    h: number,
    d: number,
    mid: string | null,
    x: number,
    y: number,
    z: number,
    parent?: THREE.Object3D
  ): THREE.Mesh {
    return this.part(new THREE.BoxGeometry(w, h, d), mid, x, y, z, parent);
  }

  private buildBody(): void {
    const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const { ball, box } = {
      ball: this.ball.bind(this),
      box: this.box.bind(this),
    };
    const capMesh = this.capMesh.bind(this);

    /* ---- head & neck (anatomical) ---- */
    const skull = ball(0.185, null, 0, 3.42, 0.015);
    skull.scale.set(0.92, 1.05, 0.98);
    const jaw = ball(0.115, null, 0, 3.315, 0.045);
    jaw.scale.set(0.95, 0.82, 0.9);
    const brow = ball(0.045, null, 0, 3.46, 0.155);
    brow.scale.set(1.6, 0.5, 0.6);
    this.part(
      new THREE.CylinderGeometry(0.075, 0.095, 0.18, SEG.cyl),
      null,
      0,
      3.12,
      0
    );
    for (const s of [-1, 1]) {
      capMesh(
        0.065,
        V3(s * 0.04, 3.1, -0.02),
        V3(s * 0.12, 2.98, -0.03),
        'traps'
      );
    }

    /* ---- torso: athletic V-taper with defined musculature ---- */
    const profile = [
      [0.012, 1.9],
      [0.148, 1.92],
      [0.188, 2.0],
      [0.175, 2.14],
      [0.162, 2.28],
      [0.17, 2.42],
      [0.198, 2.56],
      [0.225, 2.68],
      [0.232, 2.76],
      [0.208, 2.86],
      [0.148, 2.94],
      [0.094, 3.0],
      [0.07, 3.07],
    ].map((p) => new THREE.Vector2(p[0], p[1]));
    const torsoCore = new THREE.Mesh(
      new THREE.LatheGeometry(profile, SEG.lathe),
      this.neutralMat
    );
    torsoCore.scale.set(1.12, 1, 1.0);
    this.body.add(torsoCore);
    // traps: full sweep from neck to shoulders, thicker
    for (const s of [-1, 1]) {
      capMesh(
        0.095,
        V3(s * 0.05, 3.02, -0.01),
        V3(s * 0.32, 2.88, -0.02),
        'traps'
      );
      const trapMid = ball(0.095, 'traps', s * 0.18, 2.96, -0.015);
      trapMid.scale.set(1.4, 0.7, 0.8);
    }
    // pecs: defined with upper/lower separation, sternum gap
    for (const s of [-1, 1]) {
      const pecUpper = ball(0.145, 'chest', s * 0.125, 2.74, 0.156);
      pecUpper.scale.set(1.25, 0.68, 0.52);
      pecUpper.rotation.z = s * -0.15;
      const pecLower = ball(0.135, 'chest', s * 0.135, 2.63, 0.15);
      pecLower.scale.set(1.3, 0.62, 0.48);
      pecLower.rotation.z = s * -0.1;
    }
    // abs: 6-pack with defined separations
    for (const r of [0, 1, 2])
      for (const s of [-1, 1]) {
        const ab = ball(0.08, 'abs', s * 0.068, 2.48 - r * 0.112, 0.158);
        ab.scale.set(1.2, 0.92, 0.55);
      }
    // serratus anterior: finger-like projections on sides
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const ser = ball(0.045, 'obliques', s * 0.195, 2.58 - i * 0.09, 0.095);
        ser.scale.set(0.7, 1.1, 0.6);
        ser.rotation.z = s * 0.3;
      }
    }
    // obliques: defined external obliques
    for (const s of [-1, 1]) {
      capMesh(
        0.062,
        V3(s * 0.18, 2.52, 0.055),
        V3(s * 0.2, 2.26, 0.045),
        'obliques'
      );
      const obBlade = ball(0.075, 'obliques', s * 0.19, 2.4, 0.05);
      obBlade.scale.set(0.6, 1.3, 0.7);
    }
    // lats: wider, more flared wings
    for (const s of [-1, 1]) {
      const l = ball(0.155, 'lats', s * 0.195, 2.54, -0.125);
      l.scale.set(0.52, 1.3, 0.44);
      l.rotation.z = s * 0.14;
      const latLow = ball(0.095, 'lats', s * 0.165, 2.32, -0.115);
      latLow.scale.set(0.55, 1.1, 0.45);
    }
    // upper back: rhomboids + mid traps (kept proud of the core so they stay visible)
    const ub = ball(0.16, 'back', 0, 2.72, -0.18);
    ub.scale.set(1.25, 0.72, 0.5);
    for (const s of [-1, 1]) {
      const rhomb = ball(0.085, 'back', s * 0.085, 2.68, -0.185);
      rhomb.scale.set(0.8, 1.1, 0.5);
      rhomb.rotation.z = s * 0.25;
    }
    for (const s of [-1, 1])
      // erector spinae: thicker
      capMesh(
        0.068,
        V3(s * 0.068, 2.24, -0.152),
        V3(s * 0.068, 1.96, -0.152),
        'lower-back'
      );
    const pelvis = ball(0.215, null, 0, 1.845, 0);
    pelvis.scale.set(1.02, 0.72, 0.82);
    for (const s of [-1, 1]) {
      // glutes: fuller
      const gl = ball(0.165, 'glutes', s * 0.148, 1.74, -0.115);
      gl.scale.set(1, 1.12, 0.88);
      const glMed = ball(0.105, 'glutes', s * 0.235, 1.84, -0.055);
      glMed.scale.set(0.9, 1.1, 0.8);
    }
    // shoulder blend
    for (const s of [-1, 1]) ball(0.128, null, s * 0.27, 2.82, 0);

    /* ---- arms: defined delts, bicep peak, tricep horseshoe ---- */
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(s * 0.38, 2.84, 0);
      const deltF = ball(0.128, 'front-delt', 0, 0.03, 0.098, g);
      deltF.scale.set(1, 1.1, 0.95);
      const deltS = ball(0.142, 'side-delt', s * 0.058, 0.01, 0.0, g);
      deltS.scale.set(0.95, 1.2, 0.95);
      const deltR = ball(0.12, 'rear-delt', 0, 0.03, -0.102, g);
      deltR.scale.set(1, 1.05, 0.9);
      // upper-arm flesh core: continuous flow under the muscles (not clickable)
      const armCore = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.1, 0.5, SEG.capSeg, SEG.capRad),
        this.neutralMat
      );
      armCore.position.set(s * 0.038, -0.28, 0);
      g.add(armCore);
      // biceps: long head + short head with peak
      capMesh(
        0.108,
        V3(s * 0.028, -0.08, 0.055),
        V3(s * 0.042, -0.42, 0.06),
        'biceps',
        g
      );
      const peak = ball(0.105, 'biceps', s * 0.036, -0.22, 0.062, g);
      peak.scale.set(1, 1.35, 1.05);
      // triceps: horseshoe with lateral head
      capMesh(
        0.102,
        V3(s * 0.028, -0.08, -0.058),
        V3(s * 0.042, -0.42, -0.062),
        'triceps',
        g
      );
      const triLat = ball(0.088, 'triceps', s * 0.075, -0.2, -0.045, g);
      triLat.scale.set(0.9, 1.25, 0.9);
      ball(0.078, null, s * 0.05, -0.5, 0, g); // elbow
      // forearm: defined extensors/flexors
      const foreG = new THREE.Group();
      foreG.position.set(s * 0.05, -0.5, 0);
      const foreTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.098, 0.068, 0.3, SEG.cyl),
        this.matFor('forearms')
      );
      foreTop.position.set(s * 0.005, -0.16, 0.005);
      foreTop.userData.muscle = 'forearms';
      this.muscleMeshes.push(foreTop);
      foreG.add(foreTop);
      const foreLow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.052, 0.18, SEG.cyl),
        this.matFor('forearms')
      );
      foreLow.position.set(s * 0.005, -0.38, 0.005);
      foreLow.userData.muscle = 'forearms';
      this.muscleMeshes.push(foreLow);
      foreG.add(foreLow);
      const palm = new THREE.Mesh(
        new THREE.BoxGeometry(0.098, 0.124, 0.049),
        this.neutralMat
      );
      palm.position.set(s * 0.013, -0.52, 0.01);
      foreG.add(palm);
      for (let f = 0; f < 4; f++) {
        const fg = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.018, 0.072, 4, 10),
          this.neutralMat
        );
        fg.position.set(s * (0.013 - 0.035 + f * 0.023), -0.615, 0.014);
        fg.rotation.x = 0.35;
        foreG.add(fg);
      }
      const thumb = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.018, 0.058, 4, 10),
        this.neutralMat
      );
      thumb.position.set(s * 0.062, -0.535, 0.024);
      thumb.rotation.z = s * -0.5;
      thumb.rotation.x = 0.3;
      foreG.add(thumb);
      foreG.rotation.x = -0.14;
      foreG.rotation.z = s * 0.05;
      g.add(foreG);
      g.rotation.z = s * 0.13;
      this.body.add(g);
    }

    /* ---- legs: defined quads, hams, calves ---- */
    for (const s of [-1, 1]) {
      // quads: rectus femoris center, vastus lateralis outer, vastus medialis teardrop
      capMesh(
        0.132,
        V3(s * 0.155, 1.64, 0.085),
        V3(s * 0.165, 1.12, 0.085),
        'quads'
      );
      const rectus = ball(0.118, 'quads', s * 0.16, 1.42, 0.09);
      rectus.scale.set(0.95, 1.45, 0.95);
      capMesh(
        0.098,
        V3(s * 0.208, 1.58, 0.03),
        V3(s * 0.218, 1.16, 0.03),
        'quads'
      ); // vastus lateralis sweep
      const tear = ball(0.118, 'quads', s * 0.148, 1.2, 0.088); // vastus medialis teardrop
      tear.scale.set(1, 1.35, 1.05);
      // hamstrings: biceps femoris + semitendinosus separation
      capMesh(
        0.095,
        V3(s * 0.122, 1.62, -0.088),
        V3(s * 0.128, 1.1, -0.088),
        'hamstrings'
      );
      capMesh(
        0.095,
        V3(s * 0.202, 1.62, -0.088),
        V3(s * 0.208, 1.1, -0.088),
        'hamstrings'
      );
      const hamMid = ball(0.085, 'hamstrings', s * 0.165, 1.38, -0.088);
      hamMid.scale.set(1.1, 1.3, 0.9);
      ball(0.088, null, s * 0.172, 1.02, 0.03); // knee
      // calves: two gastrocnemius heads + soleus
      const gastMed = ball(0.092, 'calves', s * 0.128, 0.88, -0.058);
      gastMed.scale.set(0.95, 1.25, 0.95);
      const gastLat = ball(0.092, 'calves', s * 0.216, 0.88, -0.058);
      gastLat.scale.set(0.95, 1.25, 0.95);
      const soleus = new THREE.Mesh(
        new THREE.CylinderGeometry(0.088, 0.055, 0.32, SEG.cyl),
        this.matFor('calves')
      );
      soleus.position.set(s * 0.172, 0.6, -0.048);
      soleus.userData.muscle = 'calves';
      this.muscleMeshes.push(soleus);
      this.body.add(soleus);
      box(0.105, 0.085, 0.13, null, s * 0.172, 0.355, -0.035); // heel
      const toe = box(0.1, 0.07, 0.19, null, s * 0.172, 0.345, 0.095); // forefoot
      toe.rotation.x = -0.06;
      toe.rotation.y = s * 0.12; // toes out, natural stance
    }
  }

  // ---- highlight / heat / soreness / finish APIs (ported from web) ----

  private reset(): void {
    for (const id in this.mats) {
      this.mats[id].emissive.setHex(0x000000);
      this.mats[id].emissiveIntensity = 0;
      this.mats[id].color.setHex(VTHEME.base);
    }
  }

  /** Highlight muscles with the accent color (primary) and a softer accent (secondary). */
  highlight(
    primaryIds: string[],
    secondaryIds: string[],
    allSoft = false
  ): void {
    this.reset();
    const accent = new THREE.Color(this.accentHex);
    if (allSoft) {
      for (const id in this.mats) {
        this.mats[id].emissive.copy(accent);
        this.mats[id].emissiveIntensity = 0.38;
      }
      return;
    }
    for (const id of primaryIds || []) {
      if (this.mats[id]) {
        this.mats[id].emissive.copy(accent);
        this.mats[id].emissiveIntensity = 1.1;
      }
    }
    for (const id of secondaryIds || []) {
      if (this.mats[id] && !(primaryIds || []).includes(id)) {
        this.mats[id].emissive.copy(accent);
        this.mats[id].emissiveIntensity = 0.45;
      }
    }
  }

  setHeat(heatByGroup: Record<string, number>): void {
    this.reset();
    for (const id in this.mats) {
      const h = heatByGroup[groupOf(id)] || 0;
      if (h > 0) {
        this.mats[id].emissive.setHex(0xff2d1a);
        this.mats[id].emissiveIntensity = 0.25 + h * 0.95;
      }
    }
  }

  setPain(ids: string[]): void {
    this.reset();
    (ids || []).forEach((id) => {
      if (this.mats[id]) {
        this.mats[id].emissive.setHex(0xff2222);
        this.mats[id].emissiveIntensity = 0.9;
      }
    });
  }

  setSorenessTint(soreByGroup: Record<string, string>): void {
    this.reset();
    for (const id in this.mats) {
      const lvl = soreByGroup[groupOf(id)];
      if (lvl === 'mild') {
        this.mats[id].emissive.setHex(0xffe135);
        this.mats[id].emissiveIntensity = 0.5;
      } else if (lvl === 'sore') {
        this.mats[id].emissive.setHex(0xff8c1a);
        this.mats[id].emissiveIntensity = 0.8;
      } else if (lvl === 'very-sore') {
        this.mats[id].emissive.setHex(0xff3b1f);
        this.mats[id].emissiveIntensity = 1.1;
        this.mats[id].color.setHex(0xff5c47);
      } else if (lvl === 'injured') {
        this.mats[id].emissive.setHex(0xb537ff);
        this.mats[id].emissiveIntensity = 1.2;
        this.mats[id].color.setHex(0xc26bff);
      }
    }
  }

  setFinish(name: BodyFinish): void {
    const f = FINISHES[name] || FINISHES.standard;
    const apply = (m: THREE.MeshStandardMaterial) => {
      m.color.setHex(f.base);
      m.roughness = f.roughness;
      m.metalness = f.metalness;
      m.opacity = f.opacity;
      m.transparent = f.opacity < 1;
      m.needsUpdate = true;
    };
    apply(this.baseMat);
    this.neutralMat.color.setHex(f.neutral);
    this.neutralMat.roughness = f.roughness;
    this.neutralMat.metalness = f.metalness;
    this.neutralMat.opacity = f.opacity;
    this.neutralMat.transparent = f.opacity < 1;
    this.neutralMat.needsUpdate = true;
    for (const id in this.mats) apply(this.mats[id]);
  }

  setAccent(hex: string): void {
    this.accentHex = hex;
    (this.ring.material as THREE.MeshBasicMaterial).color.set(hex);
  }

  setAutoRotate(v: boolean): void {
    this.autoRotate = v;
  }

  setReduceMotion(v: boolean): void {
    this.reduceMotion = v;
  }

  setView(v: 'front' | 'back', instant = false): void {
    let t = v === 'back' ? Math.PI : 0;
    t += Math.round((this.rotY - t) / (Math.PI * 2)) * Math.PI * 2;
    this.targetRotY = t;
    if (instant || this.reduceMotion) this.rotY = this.targetRotY;
  }

  // ---- gesture drivers (called from react-native-gesture-handler) ----

  /** Begin an interaction (pauses idle auto-rotate). */
  beginInteract(): void {
    this.interacting = true;
    this.lastAct = Date.now();
  }

  endInteract(): void {
    this.interacting = false;
    this.lastAct = Date.now();
  }

  /** Drag deltas in points, same math as the web pointer handler. */
  pan(dx: number, dy: number): void {
    this.rotY += dx * 0.008;
    this.targetRotY = this.rotY;
    this.rotX = Math.max(-0.3, Math.min(0.5, this.rotX + dy * 0.004));
    this.lastAct = Date.now();
  }

  pinchStart(): void {
    this.pinchStartDist = this.camDist;
    this.lastAct = Date.now();
  }

  /** Pinch scale relative to gesture start (1 = no zoom). */
  pinch(scale: number): void {
    if (this.pinchStartDist > 0 && scale > 0) {
      this.camDist = Math.max(3.6, Math.min(9.5, this.pinchStartDist / scale));
      this.camera.position.z = this.camDist;
    }
    this.lastAct = Date.now();
  }

  /** Tap at view coords; returns the raw muscle mesh id or null. */
  tap(x: number, y: number): string | null {
    const ndc = new THREE.Vector2(
      (x / this.width) * 2 - 1,
      -((y / this.height) * 2 - 1)
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObjects(this.muscleMeshes, false)[0];
    this.lastAct = Date.now();
    return hit ? (hit.object.userData.muscle as string) : null;
  }

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.fitCameraToView();
  }

  /** Adjust camera distance so the body fills the view width nicely. */
  private fitCameraToView(): void {
    if (this.width <= 0 || this.height <= 0) return;
    // Fixed distance for reliable framing. The container uses standard
    // page padding (no negative margins) so tap coordinates map correctly.
    this.camDist = 2.8;
    this.camera.position.set(0, 2.05, this.camDist);
    this.camera.lookAt(0, 1.85, 0);
  }

  setActive(active: boolean): void {
    if (this.active === active) return;
    this.active = active;
    if (active && !this.dead) this.loop();
  }

  private loop = (): void => {
    if (this.dead || !this.active) return;
    this.raf = requestAnimationFrame(this.loop);
    const idle = !this.interacting && Date.now() - this.lastAct > 3000;
    // Don't auto-rotate while a Front/Back view transition is still in
    // progress, or it overwrites the target angle.
    const settling = Math.abs(this.targetRotY - this.rotY) > 0.02;
    if (this.autoRotate && !this.reduceMotion && idle && !settling) {
      this.rotY += 0.004;
      this.targetRotY = this.rotY;
    }
    this.rotY += (this.targetRotY - this.rotY) * 0.12;
    this.body.rotation.y = this.rotY;
    this.body.rotation.x = this.rotX;
    if (idle && !this.reduceMotion) {
      const br = Math.sin(Date.now() / 900) * 0.008;
      this.body.scale.set(1 + br * 0.4, 1 + br, 1 + br * 0.4);
    } else {
      this.body.scale.set(1, 1, 1);
    }
    this.ring.rotation.z += 0.002;
    this.renderer.render(this.scene, this.camera);
    this.gl.endFrameEXP();
  };

  dispose(): void {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    this.scene.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
    this.renderer.dispose();
  }
}
