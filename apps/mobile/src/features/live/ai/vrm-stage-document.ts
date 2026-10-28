import { VRM_HUMANIZER_EMBED } from "@/features/live/ai/vrm-humanizer-embed";

/** Same studio stage as the website room: idle motion, blink, emotion, lip sync. */
export function vrmStageDocument(opts: {
  vrmUrl: string;
  backdropUrl: string | null;
  characterId: string;
  /** Website grid uses bust. The watch room uses stage. */
  framing?: "bust" | "stage";
  maxPixelRatio?: number;
}): string {
  const vrmUrl = JSON.stringify(opts.vrmUrl);
  const backdropUrl = JSON.stringify(opts.backdropUrl ?? "");
  const characterId = JSON.stringify(opts.characterId);
  const framing = JSON.stringify(opts.framing === "bust" ? "bust" : "stage");
  const maxPixelRatio = Number.isFinite(opts.maxPixelRatio) ? Number(opts.maxPixelRatio) : 1.5;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; background: #241c33 center / cover no-repeat; }
  canvas { width: 100%; height: 100%; display: block; }
</style>
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/",
    "@pixiv/three-vrm": "https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@3.5.3/lib/three-vrm.module.js"
  }
}
</script>
</head>
<body>
<script>
window.__mocoQueue = [];
window.__mocoThinking = false;
window.mocoPlay = function (audio, emotion, text) { window.__mocoQueue.push([audio, emotion, text]); };
window.mocoStop = function () { window.__mocoQueue = []; };
window.mocoSetThinking = function (on) { window.__mocoThinking = !!on; };
</script>
<script type="module">
const VRM_URL = ${vrmUrl};
const BACKDROP = ${backdropUrl};
const CHARACTER = ${characterId};
const FRAMING = ${framing};
const MAX_DPR = ${maxPixelRatio};
const post = (msg) => { try { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch (e) {} };
if (BACKDROP) document.body.style.backgroundImage = "url(" + JSON.stringify(BACKDROP).slice(1, -1) + ")";

const EMOTIONS = ["happy", "angry", "sad", "relaxed", "surprised"];
const lip = { active: false, emotion: "neutral", analyser: null, bins: null, pulse: null };
let audioCtx = null;
let source = null;
let htmlAudio = null;
let voiceSession = 0;
const queue = [];
let draining = false;

function parseEmotion(value) {
  const key = String(value || "").trim().toLowerCase();
  return EMOTIONS.includes(key) || key === "neutral" ? key : "neutral";
}
function setPreset(em, name, value) {
  const expr = em.getExpression ? em.getExpression(name) : null;
  if (!expr) return;
  if (value > 0 && "overrideMouth" in expr) expr.overrideMouth = "none";
  em.setValue(name, value);
}
function applyMouth(em, level) {
  const volume = Math.min(Math.max(level, 0), 1);
  let aa = 0, ih = 0, ou = 0;
  if (volume > 0.02 && volume <= 0.3) ih = volume;
  else if (volume > 0.3 && volume < 0.6) ou = volume;
  else if (volume >= 0.6) aa = volume;
  setPreset(em, "aa", aa);
  setPreset(em, "ih", ih);
  setPreset(em, "ou", ou);
}
function setEmotion(em, emotion) {
  for (const name of EMOTIONS) setPreset(em, name, 0);
  if (emotion && emotion !== "neutral") setPreset(em, emotion, 1);
}
function drunkFace(em) {
  setPreset(em, "happy", 0.5);
  setPreset(em, "relaxed", 0.3);
}
function isMio(id) {
  const key = String(id || "").toLowerCase();
  return key === "mio" || key === "chloe";
}
function stopVoice() {
  voiceSession += 1;
  lip.active = false;
  lip.emotion = "neutral";
  lip.analyser = null;
  lip.bins = null;
  lip.pulse = null;
  try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
  const current = source;
  source = null;
  if (current) {
    current.onended = null;
    try { current.stop(); } catch (e) {}
  }
  if (htmlAudio) {
    htmlAudio.onended = null;
    try { htmlAudio.pause(); } catch (e) {}
    htmlAudio = null;
  }
}
function prime() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!audioCtx) audioCtx = new AC();
  void audioCtx.resume();
}
function bytesFromBase64(value) {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i) & 255;
  return out.buffer;
}
function playElement(b64, token) {
  return new Promise((resolve) => {
    const el = new Audio("data:audio/mpeg;base64," + b64);
    htmlAudio = el;
    lip.pulse = 0.35;
    lip.active = true;
    const pulse = () => {
      if (!lip.active || token !== voiceSession) return;
      lip.pulse = 0.22 + 0.55 * Math.abs(Math.sin(performance.now() / 110));
      requestAnimationFrame(pulse);
    };
    requestAnimationFrame(pulse);
    el.onended = () => {
      if (token === voiceSession) {
        lip.active = false;
        lip.emotion = "neutral";
        lip.pulse = null;
      }
      resolve(true);
    };
    el.onerror = () => resolve(false);
    el.play().catch(() => resolve(false));
  });
}
async function playVoice(b64, emotion) {
  stopVoice();
  const token = voiceSession;
  const mood = parseEmotion(emotion);
  lip.emotion = mood;
  prime();
  if (!b64 || b64.length < 80) return;
  try {
    if (audioCtx) {
      await audioCtx.resume();
      if (audioCtx.state === "suspended") throw new Error("suspended");
      const buffer = await audioCtx.decodeAudioData(bytesFromBase64(b64).slice(0));
      if (token !== voiceSession) return;
      const src = audioCtx.createBufferSource();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.45;
      src.buffer = buffer;
      src.connect(analyser);
      analyser.connect(audioCtx.destination);
      source = src;
      lip.analyser = analyser;
      lip.bins = new Uint8Array(analyser.frequencyBinCount);
      lip.pulse = null;
      lip.active = true;
      await new Promise((resolve) => {
        src.onended = () => {
          if (source === src) {
            lip.active = false;
            lip.emotion = "neutral";
            lip.analyser = null;
            lip.bins = null;
            source = null;
          }
          resolve();
        };
        src.start(0);
      });
      return;
    }
  } catch (e) {}
  const ok = await playElement(b64, token);
  if (!ok) post({ type: "audio-fallback" });
}
function speakText(text, emotion) {
  const line = String(text || "").replace(/\s+/g, " ").trim();
  if (!line || !window.speechSynthesis) return Promise.resolve();
  stopVoice();
  const token = voiceSession;
  lip.emotion = parseEmotion(emotion);
  lip.active = true;
  lip.pulse = 0.35;
  const pulse = () => {
    if (!lip.active || token !== voiceSession) return;
    lip.pulse = 0.22 + 0.55 * Math.abs(Math.sin(performance.now() / 110));
    requestAnimationFrame(pulse);
  };
  requestAnimationFrame(pulse);
  return new Promise((resolve) => {
    const uttered = new SpeechSynthesisUtterance(line);
    uttered.rate = 1.04;
    uttered.onend = () => {
      if (token === voiceSession) {
        lip.active = false;
        lip.emotion = "neutral";
        lip.pulse = null;
      }
      resolve();
    };
    uttered.onerror = () => resolve();
    window.speechSynthesis.speak(uttered);
  });
}
async function drain() {
  if (draining) return;
  draining = true;
  try {
    while (queue.length) {
      const job = queue.shift();
      if (job.audio) await playVoice(job.audio, job.emotion);
      else if (job.text) await speakText(job.text, job.emotion);
    }
  } finally {
    draining = false;
  }
}
window.mocoPlay = (audio, emotion, text) => {
  prime();
  if (window.__mocoNotifySpeech) window.__mocoNotifySpeech(text || "", emotion || "neutral");
  queue.push({ audio: audio || "", emotion: emotion || "neutral", text: text || "" });
  if (queue.length > 3) queue.splice(0, queue.length - 3);
  void drain();
};
const pending = window.__mocoQueue || [];
window.__mocoQueue = [];
for (const item of pending) window.mocoPlay(item[0], item[1], item[2]);
window.mocoStop = () => {
  queue.length = 0;
  stopVoice();
};

async function importRetry(spec, tries) {
  let last = null;
  for (let i = 0; i < tries; i += 1) {
    try { return await import(spec); }
    catch (err) {
      last = err;
      await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
    }
  }
  throw last;
}
async function cachedBlobUrl(url) {
  try {
    if (self.caches) {
      const cache = await caches.open("moco-vrm-v2");
      let res = await cache.match(url);
      if (!res) {
        res = await fetch(url);
        if (res.ok) { try { await cache.put(url, res.clone()); } catch (e) {} }
      }
      if (res && res.ok) return URL.createObjectURL(await res.blob());
    }
  } catch (e) {}
  return url;
}

try {
  const THREE = await importRetry("three", 3);
  const { GLTFLoader } = await importRetry("three/addons/loaders/GLTFLoader.js", 3);
  const { VRMLoaderPlugin, VRMUtils } = await importRetry("@pixiv/three-vrm", 3);

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power", preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
  document.body.appendChild(renderer.domElement);
  renderer.domElement.addEventListener("webglcontextlost", (ev) => {
    ev.preventDefault();
    post({ type: "contextlost" });
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  const cameraTarget = new THREE.Vector3(0, 1.2, 0);
  scene.add(new THREE.AmbientLight(0xfff5e6, 0.55));
  const key = new THREE.DirectionalLight(0xfff5e6, 1.15);
  key.position.set(0.6, 1.4, 1.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc8d8ff, 0.5);
  fill.position.set(-1.1, 0.7, 0.9);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffd4a8, 0.4);
  rim.position.set(0.2, 1.3, -1.2);
  scene.add(rim);

  const resize = () => {
    const w = Math.max(window.innerWidth, 1);
    const h = Math.max(window.innerHeight, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  resize();
  window.addEventListener("resize", resize);

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  let gltf = null;
  let lastLoadErr = null;
  for (let i = 0; i < 3; i += 1) {
    try {
      gltf = await loader.loadAsync(i === 0 ? await cachedBlobUrl(VRM_URL) : VRM_URL);
      lastLoadErr = null;
      break;
    } catch (err) {
      lastLoadErr = err;
      await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
    }
  }
  if (!gltf) throw lastLoadErr || new Error("vrm-load");
  const vrm = gltf.userData.vrm;
  VRMUtils.removeUnnecessaryVertices(vrm.scene);
  if (typeof VRMUtils.combineSkeletons === "function") VRMUtils.combineSkeletons(vrm.scene);
  VRMUtils.rotateVRM0(vrm);
  vrm.scene.traverse((obj) => { obj.frustumCulled = false; });
  vrm.scene.rotation.y = 0;
  vrm.scene.updateMatrixWorld(true);
  const humanoid = vrm.humanoid;
  const leftEye = humanoid?.getNormalizedBoneNode("leftEye") || humanoid?.getRawBoneNode("leftEye");
  const rightEye = humanoid?.getNormalizedBoneNode("rightEye") || humanoid?.getRawBoneNode("rightEye");
  if (leftEye && rightEye) {
    const across = new THREE.Vector3().subVectors(leftEye.getWorldPosition(new THREE.Vector3()), rightEye.getWorldPosition(new THREE.Vector3()));
    across.y = 0;
    if (across.lengthSq() > 1e-8) {
      across.normalize();
      const forward = new THREE.Vector3().crossVectors(across, new THREE.Vector3(0, 1, 0));
      if (forward.z < 0) vrm.scene.rotation.y = Math.PI;
    }
  }
  if (humanoid) humanoid.autoUpdateHumanBones = false;
  vrm.scene.userData.mocoClips = gltf.animations || [];
  scene.add(vrm.scene);

  const hung = [];
  const hungSeen = new Set();
  const hangBone = (bone, goal) => {
    if (!bone?.parent || hungSeen.has(bone)) return;
    hungSeen.add(bone);
    bone.updateWorldMatrix(true, true);
    const child = bone.children.find((n) => n.isBone) || bone.children[0];
    if (!child) return;
    const origin = bone.getWorldPosition(new THREE.Vector3());
    const tip = child.getWorldPosition(new THREE.Vector3());
    const dir = tip.sub(origin);
    if (dir.lengthSq() < 1e-8) return;
    dir.normalize();
    const worldDelta = new THREE.Quaternion().setFromUnitVectors(dir, goal.clone().normalize());
    const parentWorld = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    const currentWorld = bone.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.copy(parentWorld.invert()).multiply(worldDelta).multiply(currentWorld);
    hung.push({ bone, quat: bone.quaternion.clone() });
  };
  vrm.scene.updateMatrixWorld(true);
  for (const name of ["leftUpperArm", "rightUpperArm"]) {
    const goal = name.startsWith("left") ? new THREE.Vector3(0.16, -1, 0.06) : new THREE.Vector3(-0.16, -1, 0.06);
    hangBone(humanoid?.getNormalizedBoneNode(name), goal);
    hangBone(humanoid?.getRawBoneNode(name), goal);
  }
  vrm.scene.updateMatrixWorld(true);
  for (const name of ["leftLowerArm", "rightLowerArm"]) {
    const goal = name.startsWith("left") ? new THREE.Vector3(0.04, -1, 0.02) : new THREE.Vector3(-0.04, -1, 0.02);
    hangBone(humanoid?.getNormalizedBoneNode(name), goal);
    hangBone(humanoid?.getRawBoneNode(name), goal);
  }
  vrm.scene.updateMatrixWorld(true);
  const head = humanoid?.getNormalizedBoneNode("head");
  const chestNode = humanoid?.getNormalizedBoneNode("upperChest") || humanoid?.getNormalizedBoneNode("chest");
  const headPos = new THREE.Vector3(0, 1.45, 0);
  const chestPos = new THREE.Vector3(0, 1.2, 0);
  head?.getWorldPosition(headPos);
  chestNode?.getWorldPosition(chestPos);
  const hairTop = headPos.y + 0.2;
  const avatarH = Math.max(hairTop - (chestPos.y + 0.1), 0.28);
  const visibleH = avatarH / 0.75;
  cameraTarget.set(headPos.x, hairTop + 0.12 - visibleH / 2, headPos.z);
  const fovRad = (camera.fov * Math.PI) / 180;
  const distance = THREE.MathUtils.clamp((visibleH / 2) / Math.tan(fovRad / 2), FRAMING === "bust" ? 1.0 : 1.05, 1.25);
  camera.position.set(cameraTarget.x, cameraTarget.y + 0.05, cameraTarget.z + distance);
  camera.lookAt(cameraTarget);
  if (vrm.lookAt) {
    vrm.lookAt.autoUpdate = true;
    vrm.lookAt.target = camera;
  }

  ${VRM_HUMANIZER_EMBED}
  const { VrmHumanizerRuntime } = createMocoHumanizer(THREE);
  const humanizer = VrmHumanizerRuntime.attach(vrm, CHARACTER, camera);
  window.__mocoNotifySpeech = (text, emotion) => humanizer.notifySpeech(text, emotion);
  const drunk = isMio(CHARACTER);
  const clock = new THREE.Clock();
  let postedReady = false;
  let readyFrames = 0;
  let pageVisible = document.visibilityState !== "hidden";
  document.addEventListener("visibilitychange", () => {
    pageVisible = document.visibilityState !== "hidden";
  });
  function captureStill() {
    const canvas = renderer.domElement;
    const snap = document.createElement("canvas");
    snap.width = canvas.width;
    snap.height = canvas.height;
    const ctx = snap.getContext("2d");
    if (!ctx) return;
    const finish = () => {
      try { ctx.drawImage(canvas, 0, 0); } catch (e) {}
      try { post({ type: "snapshot", dataUrl: snap.toDataURL("image/jpeg", 0.82) }); } catch (e) {}
    };
    if (!BACKDROP) { finish(); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { try { ctx.drawImage(img, 0, 0, snap.width, snap.height); } catch (e) {} finish(); };
    img.onerror = finish;
    img.src = BACKDROP;
  }
  const loop = () => {
    requestAnimationFrame(loop);
    if (!pageVisible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    humanizer.setCharacter(CHARACTER);
    humanizer.setThinking(!!window.__mocoThinking);
    humanizer.setSpeaking(lip.active);
    let level = 0;
    if (lip.active && lip.pulse != null) level = lip.pulse;
    else if (lip.active && lip.analyser && lip.bins) {
      lip.analyser.getByteFrequencyData(lip.bins);
      let sum = 0;
      for (let i = 0; i < lip.bins.length; i += 1) sum += lip.bins[i] || 0;
      level = Math.min(sum / lip.bins.length / 40, 1);
    }
    humanizer.setRms(level);
    humanizer.beforeVrmUpdate(dt, camera);
    if (humanoid && typeof humanoid.update === "function") humanoid.update();
    vrm.update(dt);
    for (const arm of hung) arm.bone.quaternion.copy(arm.quat);
    vrm.scene.updateMatrixWorld(true);
    const face = humanizer.afterVrmUpdate(dt);
    if (humanoid && typeof humanoid.update === "function") humanoid.update();
    const expressions = vrm.expressionManager;
    if (expressions) {
      expressions.setValue("blink", face && face.blink != null ? face.blink : 0);
      applyMouth(expressions, level);
      setEmotion(expressions, lip.active ? lip.emotion : "neutral");
      if (!lip.active && drunk) drunkFace(expressions);
      if (face && face.joy > 0) {
        if (expressions.getExpression && expressions.getExpression("joy")) expressions.setValue("joy", face.joy);
        if (expressions.getExpression && expressions.getExpression("happy")) expressions.setValue("happy", face.joy);
      }
      expressions.update();
    }
    renderer.render(scene, camera);
    if (!postedReady) {
      readyFrames += 1;
      if (readyFrames >= 3) {
        postedReady = true;
        captureStill();
        post({ type: "ready" });
      }
    }
  };
  loop();
} catch (err) {
  post({ type: "error", message: String(err && err.message || err) });
}
</script>
</body>
</html>`;
}
