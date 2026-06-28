/**
 * MoCoMo corner scene — visual polish (post FX, contact shadows, poster camera)
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const PROP_BEVEL = 0.018;

/** Composition lock pass3 — camera unchanged during Scene Polish */
export const POSTER_CAMERA = {
  target: [0.05, 0.3, -0.08],
  fr: 1.44,
  elevationDeg: 32,
  azimuthDeg: 45,
};

/** 소파 영역 클로즈업 — 참고 이미지 living room sofa crop 기준 */
export const SOFA_ZONE_CAMERA = {
  target: [0.05, 0.17, -0.41],
  fr: 0.62,
  elevationDeg: 27,
  azimuthDeg: 40,
};

export function applyPolishedLighting(THREE, scene, renderer) {
  const hemi = new THREE.HemisphereLight(0xfff4ea, 0xc8a880, 0.32);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff0dc, 0.58);
  key.position.set(5.5, 9.5, 3.8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.4;
  key.shadow.camera.far = 22;
  key.shadow.camera.left = -3.8;
  key.shadow.camera.right = 3.8;
  key.shadow.camera.top = 3.8;
  key.shadow.camera.bottom = -3.8;
  key.shadow.bias = -0.0012;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 3.5;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xe8eef8, 0.12);
  fill.position.set(-3.5, 5.5, -1.5);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xfff0d8, 0.1);
  rim.position.set(-1.8, 4.5, 5.5);
  scene.add(rim);

  const window = new THREE.DirectionalLight(0xffdcb0, 0.22);
  window.position.set(-7.5, 3.8, -0.3);
  scene.add(window);

  const heroPool = new THREE.PointLight(0xfff0e0, 0.12, 4.5);
  heroPool.position.set(0.06, 1.1, -0.12);
  scene.add(heroPool);

  scene.add(new THREE.AmbientLight(0xfff6ee, 0.04));

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.86;
}

export function applyEnvironmentReflection(THREE, scene, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (m.isMeshStandardMaterial) {
        m.envMapIntensity = m.name === 'floor_plank' ? 0.08 : 0.05;
      }
    }
  });
  pmrem.dispose();
}

export function applyEyeFlowHierarchy(scene) {
  const heroAssets = new Set(['sofa']);
  const supportAssets = new Set(['coffee-table', 'rug', 'tv-stand', 'plant']);
  const bgAssets = new Set(['floor-lamp', 'corner-shell']);

  scene.traverse((o) => {
    if (!o.isMesh || !o.material) return;

    let assetId = o.userData?.assetId;
    let p = o.parent;
    while (!assetId && p) {
      assetId = p.userData?.assetId;
      p = p.parent;
    }

    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m.isMeshStandardMaterial) continue;
      const slot = m.name;

      if (heroAssets.has(assetId) || slot === 'fabric_shape' || slot.startsWith('fabric_accent')) {
        m.color.offsetHSL(0.01, 0.02, 0.008);
        m.envMapIntensity = 0.06;
        continue;
      }

      if (supportAssets.has(assetId)) {
        m.color.offsetHSL(0, -0.04, -0.04);
        m.envMapIntensity = 0.04;
        if (slot === 'tv_graybox') {
          m.color.set('#7A7268');
          m.roughness = 0.62;
          m.metalness = 0.03;
        }
        if (slot === 'leaf_shape') {
          m.color.offsetHSL(-0.03, -0.18, -0.02);
        }
        continue;
      }

      if (bgAssets.has(assetId) || ['floor_plank', 'wall_shape', 'baseboard', 'window_recess', 'cutaway_cap'].includes(slot)) {
        m.color.offsetHSL(0, -0.04, -0.06);
        m.envMapIntensity = 0.03;
        if (slot === 'pole_shape' || slot === 'base_shape') {
          m.metalness = 0.12;
          m.roughness = 0.72;
        }
        if (slot === 'shade_shape') {
          m.color.offsetHSL(0, -0.05, 0.02);
        }
      }
    }
  });
}

export function applyBondeeRhythm(scene) {
  const rhythm = {
    sofa: [1.05, 1.1, 1.05],
    'coffee-table': [1.04, 0.84, 1.04],
    rug: [1.02, 1.0, 1.02],
    plant: [0.84, 0.78, 0.84],
    'floor-lamp': [0.76, 0.68, 0.76],
    'tv-stand': [0.72, 0.64, 0.72],
  };

  scene.traverse((o) => {
    const id = o.userData?.assetId;
    if (!id || !rhythm[id]) return;
    const [sx, sy, sz] = rhythm[id];
    o.scale.set(sx, sy, sz);
  });
}

/** @deprecated use applyBondeeRhythm */
export function applyEyeFlowScale(scene) {
  applyBondeeRhythm(scene);
}

export function warmMaterialPass(root) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m.isMeshStandardMaterial) continue;
      if (m.name === 'floor_plank') {
        m.roughness = Math.min(m.roughness, 0.84);
        m.metalness = 0.02;
      }
      if (m.name.includes('wood') || m.name === 'cabinet_shape') {
        m.roughness = Math.max(m.roughness, 0.86);
        m.metalness = 0;
      }
      if (m.name === 'fabric_shape' || m.name === 'shade_shape') {
        m.roughness = Math.max(m.roughness, 0.9);
      }
    }
  });
}

export function addContactShadows(THREE, scene, pass) {
  const group = new THREE.Group();
  group.name = 'contact-shadows';

  const defs = [
    { pos: pass.furniture.sofa.pos, sx: 1.08, sz: 0.55, opacity: 0.42 },
    { pos: pass.furniture['coffee-table'].pos, sx: 0.36, sz: 0.2, opacity: 0.22 },
    { pos: pass.furniture.rug.pos, sx: 0.9, sz: 0.56, opacity: 0.14 },
    { pos: pass.furniture.plant.pos, sx: 0.16, sz: 0.16, opacity: 0.16 },
    { pos: pass.furniture['floor-lamp'].pos, sx: 0.12, sz: 0.12, opacity: 0.14 },
    { pos: pass.furniture['tv-stand'].pos, sx: 0.36, sz: 0.14, opacity: 0.18 },
  ];

  const mat = new THREE.MeshBasicMaterial({
    color: 0x3a3028,
    transparent: true,
    depthWrite: false,
  });

  for (const d of defs) {
    const m = mat.clone();
    m.opacity = d.opacity;
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 32), m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(d.pos[0], 0.026, d.pos[2]);
    mesh.scale.set(d.sx, d.sz, 1);
    group.add(mesh);
  }

  scene.add(group);
}

const ColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    warmth: { value: 0.052 },
    saturation: { value: 1.04 },
    contrast: { value: 1.08 },
    lift: { value: 0.0 },
    shadowLift: { value: 1.08 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float warmth;
    uniform float saturation;
    uniform float contrast;
    uniform float lift;
    uniform float shadowLift;
    varying vec2 vUv;

    vec3 adjustSaturation(vec3 c, float s) {
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      return mix(vec3(l), c, s);
    }

    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 c = tex.rgb;
      c = pow(max(c, vec3(0.0)), vec3(shadowLift));
      c = (c - 0.5) * contrast + 0.5 + lift;
      c.r += warmth * 0.5;
      c.g += warmth * 0.15;
      c.b -= warmth * 0.2;
      c = adjustSaturation(c, saturation);
      c = clamp(c, 0.0, 1.0);
      gl_FragColor = vec4(c, tex.a);
    }
  `,
};

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    strength: { value: 0.18 },
    radius: { value: 0.88 },
    focus: { value: new THREE.Vector2(0.44, 0.5) },
  },
  vertexShader: ColorGradeShader.vertexShader,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float strength;
    uniform float radius;
    uniform vec2 focus;
    varying vec2 vUv;
    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec2 p = (vUv - focus) * vec2(1.05, 0.92);
      float d = length(p);
      float vig = smoothstep(radius, radius - 0.42, d);
      vec3 c = tex.rgb * mix(1.0 - strength, 1.0, vig);
      gl_FragColor = vec4(c, tex.a);
    }
  `,
};

export function applySoftVolume(scene) {
  scene.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    if (o.parent?.name?.startsWith('story-')) return;

    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m.isMeshStandardMaterial) continue;
      const slot = m.name;

      if (slot.includes('wood') || slot === 'cabinet_shape' || slot === 'wood_shape' || slot === 'tv_bezel') {
        m.color.setHSL(0.078, 0.14, 0.58);
        m.roughness = 0.86;
        m.metalness = 0;
        m.envMapIntensity = 0.07;
        continue;
      }
      if (slot === 'floor_plank') {
        m.color.setHSL(0.082, 0.22, 0.56);
        m.roughness = 0.78;
        m.metalness = 0.02;
        m.envMapIntensity = 0.08;
        continue;
      }
      if (slot.startsWith('fabric') || slot === 'shade_shape' || slot === 'rug_shape') {
        m.roughness = Math.max(m.roughness, 0.9);
        m.envMapIntensity = Math.min(m.envMapIntensity ?? 0.06, 0.06);
      }
    }
  });
}

export function applySceneWarmth(scene) {
  const wrap = new THREE.Color('#ffe8d0');
  scene.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    if (o.parent?.name?.startsWith('story-')) return;

    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m.isMeshStandardMaterial) continue;
      const slot = m.name;
      if (!slot.startsWith('fabric') && slot !== 'shade_shape' && slot !== 'rug_shape') continue;
      if (!m.emissive) m.emissive = new THREE.Color();
      m.emissive.copy(wrap);
      m.emissiveIntensity = 0.004;
    }
  });
}

export function applyBondeeColorHarmony(scene) {
  scene.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    if (o.parent?.name?.startsWith('story-')) return;

    let assetId = o.userData?.assetId;
    let p = o.parent;
    while (!assetId && p) {
      assetId = p.userData?.assetId;
      p = p.parent;
    }

    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m.isMeshStandardMaterial) continue;
      const slot = m.name;

      if (assetId === 'sofa' || slot.startsWith('fabric')) {
        m.color.setHSL(0.09, 0.1, 0.68);
        m.roughness = Math.max(m.roughness, 0.9);
        continue;
      }
      if (slot.includes('wood') || slot === 'cabinet_shape' || slot === 'tv_bezel') {
        m.color.setHSL(0.078, 0.14, 0.56);
        m.roughness = Math.max(m.roughness, 0.86);
        continue;
      }
      if (slot === 'leaf_shape') {
        m.color.setHSL(0.28, 0.16, 0.46);
        continue;
      }
      if (slot === 'tv_graybox') {
        m.color.setHSL(0.07, 0.06, 0.32);
        continue;
      }
      if (slot === 'wall_shape') {
        m.color.setHSL(0.09, 0.05, 0.86);
      }
      if (slot === 'floor_plank') {
        m.color.setHSL(0.082, 0.2, 0.54);
      }
      if (slot === 'rug_shape') {
        m.color.setHSL(0.09, 0.08, 0.78);
      }
    }
  });
}

export function createPolishComposer(renderer, scene, camera, width, height) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const ssao = new SSAOPass(scene, camera, width, height);
  ssao.kernelRadius = 8;
  ssao.minDistance = 0.001;
  ssao.maxDistance = 0.072;
  ssao.output = SSAOPass.OUTPUT.Default;
  composer.addPass(ssao);

  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.022, 0.42, 0.88);
  composer.addPass(bloom);

  const grade = new ShaderPass(ColorGradeShader);
  composer.addPass(grade);

  const vignette = new ShaderPass(VignetteShader);
  composer.addPass(vignette);

  composer.addPass(new OutputPass());

  return { composer, ssao, bloom, grade, vignette };
}

export function setupPosterCamera(THREE, cam, cfg = POSTER_CAMERA, aspect = 1) {
  const target = new THREE.Vector3(...cfg.target);
  const az = THREE.MathUtils.degToRad(cfg.azimuthDeg ?? 43);
  const el = THREE.MathUtils.degToRad(cfg.elevationDeg ?? 29);
  const d = 5.5;
  cam.position.set(
    target.x + d * Math.cos(el) * Math.sin(az),
    target.y + d * Math.sin(el),
    target.z + d * Math.cos(el) * Math.cos(az),
  );
  cam.lookAt(target);
  const fr = cfg.fr;
  cam.left = -fr * aspect;
  cam.right = fr * aspect;
  cam.top = fr;
  cam.bottom = -fr;
  cam.updateProjectionMatrix();
  return cam;
}

function propBox(w, h, d, mat, bevel = PROP_BEVEL) {
  const geo = new RoundedBoxGeometry(w, h, d, 4, Math.min(bevel, w / 4, h / 4, d / 4));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function storyMat(color, roughness = 0.82, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function findAssetRoot(scene, assetId) {
  for (const child of scene.children) {
    if (child.userData?.assetId === assetId) return child;
  }
  return null;
}

/** Story pass — lived-in traces without new hero assets */
export function applyStoryLife(THREE, scene, pass) {
  applySofaAsymmetry(findAssetRoot(scene, 'sofa'));
  addTableLifeProps(THREE, scene, pass);
  applyPlantNaturalPose(findAssetRoot(scene, 'plant'));
  applyStoryTV(findAssetRoot(scene, 'tv-stand'));
  applyStoryWindow(THREE, findAssetRoot(scene, 'corner-shell'));
  applyStoryLamp(THREE, scene, findAssetRoot(scene, 'floor-lamp'));
  addSofaFrontLife(THREE, scene, pass);
  addRugEdgeLife(THREE, scene, pass);
  addTvConsoleLife(THREE, scene, pass);
  enhanceStoryWindow(THREE, findAssetRoot(scene, 'corner-shell'));
  applyStoryPass3(THREE, scene, pass);
  applyStoryPass4(THREE, scene, pass);
}

function applySofaAsymmetry(sofa) {
  if (!sofa) return;
  const accents = [];
  sofa.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const n = o.material.name;
    if (n === 'fabric_accent_sage' || n === 'fabric_accent_mustard') accents.push(o);
  });
  if (accents[0]) {
    accents[0].rotation.set(-0.18, 0.32, 0.14);
    accents[0].position.x += 0.04;
    accents[0].position.y += 0.012;
  }
  if (accents[1]) {
    accents[1].rotation.set(-0.08, -0.24, -0.2);
    accents[1].position.x -= 0.06;
    accents[1].position.z += 0.03;
  }
  sofa.rotation.z = 0.008;
}

function addTableLifeProps(THREE, scene, pass) {
  const t = pass.furniture['coffee-table'];
  const group = new THREE.Group();
  group.name = 'story-table-props';
  group.position.set(t.pos[0], t.pos[1], t.pos[2]);
  group.rotation.y = Math.PI * t.rotY;

  const tray = storyMat(0xc9956a, 0.72);
  const book = storyMat(0x9bb89a, 0.88);
  const mug = storyMat(0xf5efe4, 0.9);
  const remote = storyMat(0xd4c4b0, 0.85);
  const vase = storyMat(0xb8846a, 0.78);
  const stem = storyMat(0x8ba888, 0.9);

  const trayMesh = propBox(0.14, 0.012, 0.1, tray, 0.012);
  trayMesh.position.set(-0.06, 0.418, 0.02);
  group.add(trayMesh);

  const bookMesh = propBox(0.09, 0.018, 0.07, book, 0.008);
  bookMesh.position.set(-0.06, 0.43, 0.02);
  bookMesh.rotation.y = 0.22;
  bookMesh.rotation.z = 0.06;
  group.add(bookMesh);

  const mugMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.024, 0.048, 10),
    mug,
  );
  mugMesh.position.set(0.04, 0.442, -0.04);
  mugMesh.castShadow = true;
  group.add(mugMesh);

  const remoteMesh = propBox(0.06, 0.014, 0.022, remote, 0.006);
  remoteMesh.position.set(0.1, 0.425, 0.06);
  remoteMesh.rotation.y = -0.35;
  group.add(remoteMesh);

  const vaseMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.026, 0.038, 10),
    vase,
  );
  vaseMesh.position.set(-0.14, 0.437, -0.05);
  group.add(vaseMesh);

  const sprig = propBox(0.012, 0.028, 0.012, stem, 0.006);
  sprig.position.set(-0.14, 0.468, -0.05);
  group.add(sprig);

  scene.add(group);
}

function applyPlantNaturalPose(plant) {
  if (!plant) return;
  plant.rotation.y += 0.08;
  plant.rotation.z = 0.015;
  let i = 0;
  plant.traverse((o) => {
    if (!o.isMesh || o.material?.name !== 'leaf_shape') return;
    o.rotation.y += (i % 3 - 1) * 0.12;
    o.rotation.z += (i % 2) * 0.06;
    o.position.x += (i % 4 - 1.5) * 0.015;
    i += 1;
  });
}

function applyStoryTV(tvStand) {
  if (!tvStand) return;
  tvStand.traverse((o) => {
    if (!o.isMesh || o.material?.name !== 'tv_graybox') return;
    o.material.color.set('#7A7570');
    o.material.emissive = new THREE.Color('#3d3530');
    o.material.emissiveIntensity = 0.12;
    o.material.roughness = 0.55;
    o.material.metalness = 0.04;
  });
}

function applyStoryWindow(THREE, shell) {
  if (!shell) return;
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.82),
    new THREE.MeshBasicMaterial({
      color: 0xffe8c8,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    }),
  );
  glow.position.set(-1.38, 1.02, -0.12);
  glow.rotation.y = Math.PI / 2;
  shell.add(glow);

  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.88),
    new THREE.MeshBasicMaterial({
      color: 0xd8e8f0,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    }),
  );
  sky.position.set(-1.46, 1.04, -0.12);
  sky.rotation.y = Math.PI / 2;
  shell.add(sky);
}

function applyStoryLamp(THREE, scene, lamp) {
  if (!lamp) return;
  lamp.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    if (o.material.name === 'shade_shape') {
      o.material.emissive = new THREE.Color('#fff0d8');
      o.material.emissiveIntensity = 0.06;
    }
  });
  const pos = lamp.getWorldPosition(new THREE.Vector3());
  const mood = new THREE.PointLight(0xfff0d8, 0.08, 2.2);
  mood.position.set(pos.x + 0.05, pos.y + 0.85, pos.z);
  scene.add(mood);
}

/** Pass #2 — sofa front, rug edge, TV console, window depth */
function addSofaFrontLife(THREE, scene, pass) {
  const s = pass.furniture.sofa;
  const group = new THREE.Group();
  group.name = 'story-sofa-front';
  group.position.set(s.pos[0], s.pos[1], s.pos[2]);
  group.rotation.y = Math.PI * s.rotY;

  const blanket = storyMat(0xd4c4b0, 0.92);
  const slipper = storyMat(0xe8ddd0, 0.88);
  const basket = storyMat(0xc9956a, 0.75);

  const throwBlanket = propBox(0.42, 0.012, 0.28, blanket, 0.014);
  throwBlanket.position.set(0.08, 0.38, 0.22);
  throwBlanket.rotation.set(-0.12, 0.18, 0.08);
  group.add(throwBlanket);

  const fold = propBox(0.18, 0.01, 0.14, blanket, 0.01);
  fold.position.set(0.2, 0.392, 0.28);
  fold.rotation.set(-0.28, 0.35, 0.15);
  group.add(fold);

  scene.add(group);

  const floor = new THREE.Group();
  floor.name = 'story-floor-life';
  floor.position.set(s.pos[0], s.pos[1], s.pos[2]);
  floor.rotation.y = Math.PI * s.rotY;

  const slipL = propBox(0.08, 0.022, 0.11, slipper, 0.008);
  slipL.position.set(0.14, 0.014, 0.38);
  slipL.rotation.y = 0.4;
  floor.add(slipL);

  const slipR = propBox(0.08, 0.022, 0.11, slipper, 0.008);
  slipR.position.set(0.24, 0.014, 0.36);
  slipR.rotation.y = 0.55;
  slipR.rotation.z = 0.04;
  floor.add(slipR);

  const basketBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.07, 0.07, 10, 1, true),
    basket,
  );
  basketBody.position.set(-0.32, 0.038, 0.42);
  basketBody.rotation.y = 0.25;
  basketBody.castShadow = true;
  floor.add(basketBody);

  const basketRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.006, 6, 16),
    basket,
  );
  basketRim.rotation.x = Math.PI / 2;
  basketRim.position.set(-0.32, 0.072, 0.42);
  floor.add(basketRim);

  scene.add(floor);
}

function addRugEdgeLife(THREE, scene, pass) {
  const r = pass.furniture.rug;
  const group = new THREE.Group();
  group.name = 'story-rug-edge';
  group.position.set(r.pos[0], r.pos[1], r.pos[2]);
  group.rotation.y = Math.PI * r.rotY;

  const rugFabric = storyMat(0xede4d4, 0.94);
  const curl = propBox(0.22, 0.006, 0.08, rugFabric, 0.004);
  curl.position.set(0.38, 0.028, 0.42);
  curl.rotation.set(0.08, -0.12, 0.22);
  group.add(curl);

  const curl2 = propBox(0.14, 0.005, 0.06, rugFabric, 0.003);
  curl2.position.set(0.44, 0.032, 0.38);
  curl2.rotation.set(0.15, -0.08, 0.28);
  group.add(curl2);

  scene.add(group);
}

function addTvConsoleLife(THREE, scene, pass) {
  const tv = pass.furniture['tv-stand'];
  const group = new THREE.Group();
  group.name = 'story-tv-console';
  group.position.set(tv.pos[0], tv.pos[1], tv.pos[2]);
  group.rotation.y = Math.PI * tv.rotY;

  const frame = storyMat(0xf5efe4, 0.86);
  const wood = storyMat(0xa87850, 0.72);
  const miniPlant = storyMat(0x8ba888, 0.9);
  const pot = storyMat(0xb8846a, 0.78);
  const speaker = storyMat(0xd4c4b0, 0.8);

  const picture = propBox(0.055, 0.07, 0.008, frame, 0.004);
  picture.position.set(-0.42, 0.46, 0.12);
  picture.rotation.y = 0.15;
  group.add(picture);

  const photo = propBox(0.042, 0.048, 0.004, storyMat(0xe8ddd0, 0.9), 0.002);
  photo.position.set(-0.42, 0.46, 0.125);
  photo.rotation.y = 0.15;
  group.add(photo);

  const spkL = propBox(0.04, 0.055, 0.035, speaker, 0.006);
  spkL.position.set(-0.18, 0.452, 0.14);
  group.add(spkL);

  const spkR = propBox(0.04, 0.055, 0.035, speaker, 0.006);
  spkR.position.set(0.2, 0.452, 0.1);
  spkR.rotation.y = -0.12;
  group.add(spkR);

  const miniPot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.02, 0.028, 8),
    pot,
  );
  miniPot.position.set(0.38, 0.458, 0.08);
  group.add(miniPot);

  const miniLeaf = propBox(0.016, 0.032, 0.012, miniPlant, 0.005);
  miniLeaf.position.set(0.38, 0.482, 0.08);
  group.add(miniLeaf);

  const bookStack = propBox(0.05, 0.022, 0.038, wood, 0.004);
  bookStack.position.set(0.05, 0.448, 0.15);
  bookStack.rotation.y = -0.2;
  group.add(bookStack);

  scene.add(group);
}

function enhanceStoryWindow(THREE, shell) {
  if (!shell) return;

  const curtainL = new THREE.MeshStandardMaterial({
    color: 0xf5efe4,
    roughness: 0.92,
    metalness: 0,
    transparent: true,
    opacity: 0.82,
  });
  const curtainR = curtainL.clone();

  const leftCurtain = propBox(0.04, 0.78, 0.14, curtainL, 0.006);
  leftCurtain.position.set(-1.32, 1.02, -0.22);
  leftCurtain.rotation.y = Math.PI / 2;
  leftCurtain.rotation.z = 0.04;
  shell.add(leftCurtain);

  const rightCurtain = propBox(0.035, 0.76, 0.12, curtainR, 0.006);
  rightCurtain.position.set(-1.32, 1.0, 0.02);
  rightCurtain.rotation.y = Math.PI / 2;
  rightCurtain.rotation.z = -0.06;
  shell.add(rightCurtain);

  const sunStripe = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 1.1),
    new THREE.MeshBasicMaterial({
      color: 0xffe8c8,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
    }),
  );
  sunStripe.rotation.x = -Math.PI / 2;
  sunStripe.rotation.z = 0.35;
  sunStripe.position.set(-0.55, 0.028, -0.35);
  shell.add(sunStripe);
}

/** Pass #3 — space history: basket fill, wall frame, rug magazine, window silhouette */
function applyStoryPass3(THREE, scene, pass) {
  fillBasketContents(THREE, scene, pass);
  addWallFrameBehindSofa(THREE, findAssetRoot(scene, 'corner-shell'), pass);
  addRugMagazine(THREE, scene, pass);
  addWindowSilhouette(THREE, findAssetRoot(scene, 'corner-shell'));
  connectTvConsoleDetails(THREE, scene, pass);
  addPlantColorEcho(THREE, scene, pass);
}

function fillBasketContents(THREE, scene, pass) {
  const s = pass.furniture.sofa;
  const group = new THREE.Group();
  group.name = 'story-basket-fill';
  group.position.set(s.pos[0], s.pos[1], s.pos[2]);
  group.rotation.y = Math.PI * s.rotY;

  const fold = storyMat(0xd4c4b0, 0.93);
  const mag = storyMat(0xd4b86a, 0.88);

  const blanketFold = propBox(0.1, 0.028, 0.08, fold, 0.008);
  blanketFold.position.set(-0.32, 0.055, 0.42);
  blanketFold.rotation.set(0.1, 0.3, 0.12);
  group.add(blanketFold);

  const magazine = propBox(0.07, 0.006, 0.09, mag, 0.004);
  magazine.position.set(-0.28, 0.072, 0.4);
  magazine.rotation.set(-0.05, 0.42, 0.18);
  group.add(magazine);

  scene.add(group);
}

function addWallFrameBehindSofa(THREE, shell, pass) {
  if (!shell) return;
  const s = pass.furniture.sofa;
  const group = new THREE.Group();
  group.name = 'story-wall-frame';

  const frame = storyMat(0xf5efe4, 0.86);
  const art = storyMat(0x9bb89a, 0.9);

  const outer = propBox(0.11, 0.14, 0.01, frame, 0.005);
  outer.position.set(s.pos[0] - 0.15, 0.72, -0.92);
  group.add(outer);

  const inner = propBox(0.08, 0.1, 0.006, art, 0.003);
  inner.position.set(s.pos[0] - 0.15, 0.72, -0.914);
  group.add(inner);

  shell.add(group);
}

function addRugMagazine(THREE, scene, pass) {
  const r = pass.furniture.rug;
  const group = new THREE.Group();
  group.name = 'story-rug-magazine';
  group.position.set(r.pos[0], r.pos[1], r.pos[2]);
  group.rotation.y = Math.PI * r.rotY;

  const cover = storyMat(0xe8ddd0, 0.9);
  const accent = storyMat(0xd4b86a, 0.88);

  const mag = propBox(0.1, 0.004, 0.07, cover, 0.003);
  mag.position.set(-0.12, 0.03, 0.18);
  mag.rotation.set(0.02, 0.55, 0.08);
  group.add(mag);

  const stripe = propBox(0.06, 0.005, 0.012, accent, 0.002);
  stripe.position.set(-0.1, 0.032, 0.2);
  stripe.rotation.set(0.02, 0.55, 0.08);
  group.add(stripe);

  scene.add(group);
}

function addWindowSilhouette(THREE, shell) {
  if (!shell) return;

  const tree = new THREE.Mesh(
    new THREE.PlaneGeometry(0.35, 0.55),
    new THREE.MeshBasicMaterial({
      color: 0x8ba888,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    }),
  );
  tree.position.set(-1.48, 0.95, -0.08);
  tree.rotation.y = Math.PI / 2;
  shell.add(tree);

  const hill = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.2),
    new THREE.MeshBasicMaterial({
      color: 0xc8d8c0,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
    }),
  );
  hill.position.set(-1.47, 0.62, -0.1);
  hill.rotation.y = Math.PI / 2;
  shell.add(hill);
}

function connectTvConsoleDetails(THREE, scene, pass) {
  const tv = pass.furniture['tv-stand'];
  const group = new THREE.Group();
  group.name = 'story-tv-connect';
  group.position.set(tv.pos[0], tv.pos[1], tv.pos[2]);
  group.rotation.y = Math.PI * tv.rotY;

  const coaster = storyMat(0xc9956a, 0.7);
  const cord = storyMat(0xd4c4b0, 0.85);

  const coasterMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.006, 12),
    coaster,
  );
  coasterMesh.position.set(-0.05, 0.448, 0.18);
  group.add(coasterMesh);

  const cordMesh = propBox(0.08, 0.004, 0.012, cord, 0.002);
  cordMesh.position.set(0.12, 0.446, 0.16);
  cordMesh.rotation.y = -0.4;
  group.add(cordMesh);

  const extraBook = propBox(0.035, 0.018, 0.05, storyMat(0x9bb89a, 0.88), 0.003);
  extraBook.position.set(-0.28, 0.45, 0.11);
  extraBook.rotation.y = 0.25;
  group.add(extraBook);

  scene.add(group);
}

function addPlantColorEcho(THREE, scene, pass) {
  const p = pass.furniture.plant;
  const leaf = storyMat(0x8ba888, 0.92);
  const group = new THREE.Group();
  group.name = 'story-plant-echo';
  group.position.set(p.pos[0], p.pos[1], p.pos[2]);
  group.rotation.y = Math.PI * p.rotY;

  const fallen = propBox(0.025, 0.004, 0.035, leaf, 0.004);
  fallen.position.set(0.12, 0.012, 0.35);
  fallen.rotation.set(0.1, 0.6, 0.3);
  group.add(fallen);

  scene.add(group);
}

/** Pass #4 — emotional stay: wall gallery, window depth, book link, side prop, prop tuning */
function applyStoryPass4(THREE, scene, pass) {
  addSecondWallFrame(THREE, findAssetRoot(scene, 'corner-shell'), pass);
  deepenStoryWindow(THREE, findAssetRoot(scene, 'corner-shell'));
  addSofaSideProp(THREE, scene, pass);
  tuneStoryPropPlacement(scene);
  linkBookColors(scene);
}

function addSecondWallFrame(THREE, shell, pass) {
  if (!shell) return;
  const s = pass.furniture.sofa;
  const frame = storyMat(0xf5efe4, 0.86);
  const art = storyMat(0xd4b86a, 0.9);

  const outer = propBox(0.07, 0.09, 0.01, frame, 0.004);
  outer.position.set(s.pos[0] + 0.22, 0.58, -0.91);
  shell.add(outer);

  const inner = propBox(0.05, 0.065, 0.006, art, 0.003);
  inner.position.set(s.pos[0] + 0.22, 0.58, -0.904);
  shell.add(inner);
}

function deepenStoryWindow(THREE, shell) {
  if (!shell) return;

  const skyTop = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.55),
    new THREE.MeshBasicMaterial({
      color: 0xd8e8f8,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  );
  skyTop.position.set(-1.47, 1.18, -0.1);
  skyTop.rotation.y = Math.PI / 2;
  shell.add(skyTop);

  const skyHorizon = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.38),
    new THREE.MeshBasicMaterial({
      color: 0xffe8c8,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    }),
  );
  skyHorizon.position.set(-1.47, 0.82, -0.1);
  skyHorizon.rotation.y = Math.PI / 2;
  shell.add(skyHorizon);

  const distant = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.14),
    new THREE.MeshBasicMaterial({
      color: 0xb8c8b8,
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
    }),
  );
  distant.position.set(-1.5, 0.68, -0.1);
  distant.rotation.y = Math.PI / 2;
  shell.add(distant);
}

function addSofaSideProp(THREE, scene, pass) {
  const s = pass.furniture.sofa;
  const group = new THREE.Group();
  group.name = 'story-sofa-side';
  group.position.set(s.pos[0], s.pos[1], s.pos[2]);
  group.rotation.y = Math.PI * s.rotY;

  const wood = storyMat(0xc9956a, 0.72);
  const mug = storyMat(0xf5efe4, 0.9);

  const stool = propBox(0.08, 0.06, 0.08, wood, 0.01);
  stool.position.set(-0.42, 0.032, 0.08);
  stool.rotation.y = 0.15;
  group.add(stool);

  const sideMug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.019, 0.038, 10),
    mug,
  );
  sideMug.position.set(-0.42, 0.068, 0.08);
  group.add(sideMug);

  scene.add(group);
}

function tuneStoryPropPlacement(scene) {
  const table = scene.getObjectByName('story-table-props');
  if (table) {
    table.rotation.y += 0.015;
    table.children.forEach((c, i) => {
      c.rotation.y += (i % 2 === 0 ? 0.04 : -0.03);
    });
  }

  const floor = scene.getObjectByName('story-floor-life');
  if (floor) {
    if (floor.children[0]) floor.children[0].position.set(0.15, 0.014, 0.39);
    if (floor.children[1]) floor.children[1].position.set(0.26, 0.014, 0.37);
  }

  const rugMag = scene.getObjectByName('story-rug-magazine');
  if (rugMag) {
    rugMag.rotation.y += 0.02;
    if (rugMag.children[0]) rugMag.children[0].rotation.y += 0.08;
  }
}

function linkBookColors(scene) {
  const rugMag = scene.getObjectByName('story-rug-magazine');
  if (!rugMag) return;
  if (rugMag.children[0]?.material?.isMeshStandardMaterial) {
    rugMag.children[0].material.color.set(0x9bb89a);
  }
  if (rugMag.children[1]?.material?.isMeshStandardMaterial) {
    rugMag.children[1].material.color.set(0xd4b86a);
  }
}
