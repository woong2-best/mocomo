/**
 * In-WebView port of src/lib/vrm-humanizer.
 * THREE is passed in after the CDN import. Amps match the toned-down web toon layer.
 */
export const VRM_HUMANIZER_EMBED = `
function createMocoHumanizer(THREE) {
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function clamp01(value) { return clamp(value, 0, 1); }
  function degToRad(deg) { return (deg * Math.PI) / 180; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function damp(current, target, lambda, delta) { return lerp(current, target, 1 - Math.exp(-lambda * delta)); }
  function smoothstep(t) { var x = clamp01(t); return x * x * (3 - 2 * x); }
  function breathingScale(time, speed, min, max) { return lerp(min, max, 0.5 + 0.5 * Math.sin(time * speed)); }
  function breathingHeadPitch(time, speed, amplitude) { return Math.sin(time * speed) * amplitude; }
  function intervalFromUnit(unit, min, max) { return lerp(min, max, clamp01(unit)); }
  function easeOutSine(t) { return Math.sin((clamp01(t) * Math.PI) / 2); }
  function easeOutQuad(t) { var x = 1 - clamp01(t); return 1 - x * x; }
  function cartoonEase(t, style) { return style === "quad" ? easeOutQuad(t) : easeOutSine(t); }
  function cartoonSlerpAlpha(elapsed, duration, style) {
    if (duration <= 1e-5) return 1;
    return cartoonEase(elapsed / duration, style || "sine");
  }
  var TOON_BOP_MAX = 0.0035;
  var TOON_NOD_MAX = 0.022;
  var TOON_SWAY_MAX = 0.016;
  function toonBopOffset(time, speed, amplitude, phase) {
    return clamp(Math.sin(time * speed + (phase || 0)) * amplitude, -TOON_BOP_MAX, TOON_BOP_MAX);
  }
  function toonNodPitch(bopSine, nodAmp) { return clamp(-bopSine * nodAmp, -TOON_NOD_MAX, TOON_NOD_MAX); }
  function toonSwayRoll(time, speed, amplitude) { return clamp(Math.sin(time * speed) * amplitude, -TOON_SWAY_MAX, TOON_SWAY_MAX); }
  function toonSquashScale(bopSine, rms, amount) {
    var squash = Math.max(0, -bopSine) * clamp01(rms) * clamp01(amount);
    return { x: 1 + 0.02 * squash, y: 1 - 0.02 * squash };
  }
  function angularVelocity(angleRad, delta) { return delta <= 1e-5 ? 0 : Math.abs(angleRad) / delta; }
  function shouldTriggerReflexBlink(velocity, threshold) { return velocity >= threshold; }
  function rmsAmplitudeScale(rms, gain, explosionThreshold, explosionMul) {
    var volume = clamp01(rms);
    var scale = 1 + volume * gain;
    if (volume >= (explosionThreshold == null ? 1 : explosionThreshold) && (explosionMul || 1) > 1) scale *= explosionMul;
    return scale;
  }
  function resolveFsmState(speaking, thinking) {
    if (speaking) return "speaking";
    if (thinking) return "thinking";
    return "idle";
  }
  var PANIC = /oops|sorry|embarrass|wait\\b|uhh|\\uB2F9\\uD669|\\uC5B4\\uB5A1|\\uBBF8\\uC548|\\uC81C\\uBC1C/i;
  function shouldBoostSaccade(text, emotion) {
    if (String(emotion || "").trim().toLowerCase() === "surprised") return true;
    return Boolean(text && PANIC.test(text));
  }
  function fade(t) { return t * t * (3 - 2 * t); }
  function hash2(x, y) {
    var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return (n - Math.floor(n)) * 2 - 1;
  }
  function noise2D(x, y) {
    var x0 = Math.floor(x), y0 = Math.floor(y);
    var xf = x - x0, yf = y - y0;
    var u = fade(xf), v = fade(yf);
    var a = hash2(x0, y0), b = hash2(x0 + 1, y0);
    var c = hash2(x0, y0 + 1), d = hash2(x0 + 1, y0 + 1);
    return a + (b - a) * u + ((c - a) * v + (a - b - c + d) * u * v);
  }
  function createContinuousNoise() {
    return {
      signed: function (time, channel) { return noise2D(time, channel * 0.37); },
      unit: function (time, channel) { return 0.5 + 0.5 * noise2D(time, channel * 0.37); }
    };
  }

  var ZERO = Object.freeze({ x: 0, y: 0, z: 0 });
  var CHARACTER_CONFIGS = {
    zelie: {
      id: "zelie",
      posture: { hips: ZERO, spine: ZERO, chest: ZERO, neck: ZERO, leftShoulder: ZERO, rightShoulder: ZERO },
      breathing: { speed: 1.15, chestScaleMin: 1, chestScaleMax: 1.012, headPitchAmp: 0.012 },
      microNoise: { spineAmp: 0.004, neckAmp: 0.006, headAmp: 0.008 },
      weightShift: { intervalMinSec: 30, intervalMaxSec: 60, slerpSecMin: 2, slerpSecMax: 3, twistDegMin: 1, twistDegMax: 2, shoulderBobAmp: 0.035 },
      saccade: { microHz: 2.4, microAmp: 0.012, macroIntervalMin: 4, macroIntervalMax: 6, macroChance: 0.08, macroLeftDeg: 12, macroRightDeg: 14, thinkingPitchDeg: 28, thinkingYawDeg: 12, eyeContactHoldSec: 5.5, avertSecMin: 0.45, avertSecMax: 0.8, blinkIntervalMin: 2.4, blinkIntervalMax: 4.2, thinkingBlinkScale: 0.32 },
      rms: { tensionGain: 0.45, explosionThreshold: 1, explosionAmpMul: 1, leanAmp: 0.012 },
      habits: { hairTuckInterval: [45, 90], lipTouch: true, airGuitar: false, bodySwayAmp: 0.008, checkPhoneSilenceSec: 0, checkPhoneJoy: 0 },
      toon: { bopSpeedIdle: 2.15, bopAmpIdle: 0.0017, bopSpeedSpeak: 4.3, bopAmpSpeak: 0.0028, bopPhase: 0, nodAmp: 0.012, swaySpeed: 1.65, swayAmp: 0.01, squash: 0.18, snapAmp: 0.12, easing: "sine" },
      clips: { idle: "idle", thinking: "thinking", speaking: "speaking", hair_tuck: "hair_tuck", lip_touch: "lip_touch" }
    },
    cleo: {
      id: "cleo",
      posture: { hips: { x: 0.4, y: 2.5, z: 1.4 }, spine: { x: 0, y: -0.6, z: -1.6 }, chest: { x: 0, y: 0, z: 0.8 }, neck: { x: 0, y: 0.4, z: 0 }, leftShoulder: { x: 0, y: 0, z: 4.2 }, rightShoulder: { x: 0, y: 0, z: -1.8 } },
      breathing: { speed: 1.22, chestScaleMin: 1, chestScaleMax: 1.013, headPitchAmp: 0.01 },
      microNoise: { spineAmp: 0.005, neckAmp: 0.007, headAmp: 0.009 },
      weightShift: { intervalMinSec: 25, intervalMaxSec: 45, slerpSecMin: 2, slerpSecMax: 3, twistDegMin: 1.2, twistDegMax: 2.8, shoulderBobAmp: 0.05 },
      saccade: { microHz: 2.1, microAmp: 0.014, macroIntervalMin: 2.2, macroIntervalMax: 3.6, macroChance: 0.42, macroLeftDeg: 18, macroRightDeg: 22, thinkingPitchDeg: 22, thinkingYawDeg: 18, eyeContactHoldSec: 1.8, avertSecMin: 1.1, avertSecMax: 2.2, blinkIntervalMin: 2.8, blinkIntervalMax: 5, thinkingBlinkScale: 0.4 },
      rms: { tensionGain: 0.55, explosionThreshold: 1, explosionAmpMul: 1, leanAmp: 0.02 },
      habits: { neckCrackInterval: [60, 120], lipTouch: false, airGuitar: true, bodySwayAmp: 0.012, checkPhoneSilenceSec: 0, checkPhoneJoy: 0 },
      toon: { bopSpeedIdle: 3.35, bopAmpIdle: 0.0018, bopSpeedSpeak: 6.7, bopAmpSpeak: 0.0032, bopPhase: 1.15, nodAmp: 0.008, swaySpeed: 1.6, swayAmp: 0, squash: 0.16, snapAmp: 0.1, easing: "sine" },
      clips: { idle: "idle", thinking: "thinking", speaking: "speaking", neck_crack: "neck_crack", air_guitar_pick: "air_guitar_pick" }
    },
    mio: {
      id: "mio",
      posture: { hips: { x: 1.2, y: 0, z: 0 }, spine: { x: 2.4, y: 0, z: 0 }, chest: { x: 3.2, y: 0, z: 0 }, neck: { x: 8.5, y: 0, z: 0 }, leftShoulder: { x: 3.5, y: 4, z: -8 }, rightShoulder: { x: 3.5, y: -4, z: 8 } },
      breathing: { speed: 1.05, chestScaleMin: 1, chestScaleMax: 1.01, headPitchAmp: 0.008 },
      microNoise: { spineAmp: 0.008, neckAmp: 0.01, headAmp: 0.012 },
      weightShift: { intervalMinSec: 35, intervalMaxSec: 55, slerpSecMin: 2.2, slerpSecMax: 3.2, twistDegMin: 1, twistDegMax: 2.2, shoulderBobAmp: 0.028 },
      saccade: { microHz: 2.6, microAmp: 0.016, macroIntervalMin: 1.6, macroIntervalMax: 2.8, macroChance: 0.28, macroLeftDeg: 16, macroRightDeg: 20, thinkingPitchDeg: 18, thinkingYawDeg: 20, eyeContactHoldSec: 1.4, avertSecMin: 1.6, avertSecMax: 2.6, blinkIntervalMin: 1.35, blinkIntervalMax: 2.5, thinkingBlinkScale: 0.28 },
      rms: { tensionGain: 0.7, explosionThreshold: 0.55, explosionAmpMul: 3.2, leanAmp: 0.09 },
      habits: { wristShakeInterval: [18, 38], lipTouch: false, airGuitar: false, bodySwayAmp: 0.006, checkPhoneSilenceSec: 0, checkPhoneJoy: 0 },
      toon: { bopSpeedIdle: 6.9, bopAmpIdle: 0.0012, bopSpeedSpeak: 11.2, bopAmpSpeak: 0.0022, bopPhase: 0, nodAmp: 0.007, swaySpeed: 2.15, swayAmp: 0.005, squash: 0.14, snapAmp: 0.08, easing: "sine" },
      clips: { idle: "idle", thinking: "thinking", speaking: "speaking", wrist_shake: "wrist_shake" }
    },
    nangnang: {
      id: "nangnang",
      posture: { hips: { x: 0, y: 0.8, z: 0 }, spine: { x: -0.6, y: 0, z: 0 }, chest: ZERO, neck: { x: -0.8, y: 0, z: 0 }, leftShoulder: ZERO, rightShoulder: ZERO },
      breathing: { speed: 1.85, chestScaleMin: 1, chestScaleMax: 1.008, headPitchAmp: 0.018 },
      microNoise: { spineAmp: 0.01, neckAmp: 0.012, headAmp: 0.014 },
      weightShift: { intervalMinSec: 10, intervalMaxSec: 15, slerpSecMin: 1.4, slerpSecMax: 2.1, twistDegMin: 2, twistDegMax: 3.4, shoulderBobAmp: 0.06 },
      saccade: { microHz: 2.8, microAmp: 0.018, macroIntervalMin: 3, macroIntervalMax: 4.6, macroChance: 0.16, macroLeftDeg: 14, macroRightDeg: 16, thinkingPitchDeg: 26, thinkingYawDeg: 14, eyeContactHoldSec: 3.2, avertSecMin: 0.6, avertSecMax: 1.1, blinkIntervalMin: 1.8, blinkIntervalMax: 3.2, thinkingBlinkScale: 0.36 },
      rms: { tensionGain: 0.8, explosionThreshold: 1, explosionAmpMul: 1, leanAmp: 0.03 },
      habits: { lipTouch: false, airGuitar: false, bodySwayAmp: 0.014, checkPhoneSilenceSec: 15, checkPhoneJoy: 0.3 },
      toon: { bopSpeedIdle: 4.7, bopAmpIdle: 0.0026, bopSpeedSpeak: 9.4, bopAmpSpeak: 0.0048, bopPhase: 0.18, nodAmp: 0.016, swaySpeed: 2.35, swayAmp: 0.014, squash: 0.2, snapAmp: 0.14, easing: "sine" },
      clips: { idle: "idle", thinking: "thinking", speaking: "speaking", body_sway: "body_sway", check_phone: "check_phone" }
    }
  };
  var ALIAS = { zelie: "zelie", moco: "zelie", cleo: "cleo", airi: "cleo", mio: "mio", chloe: "mio", nangnang: "nangnang", stella: "nangnang" };
  function resolveCharacterConfig(id) {
    var key = String(id || "").trim().toLowerCase();
    return CHARACTER_CONFIGS[ALIAS[key] || "zelie"];
  }

  var BODY_BONES = ["hips", "spine", "chest", "upperChest", "neck", "head", "leftShoulder", "rightShoulder"];
  var ARM_BONES = ["leftUpperArm", "leftLowerArm", "leftHand", "rightUpperArm", "rightLowerArm", "rightHand"];
  var TOON_BONES = ["hips", "spine", "chest", "upperChest", "neck", "head"];

  function findBones(vrm, name) {
    var normalized = vrm.humanoid ? vrm.humanoid.getNormalizedBoneNode(name) : null;
    var raw = vrm.humanoid ? vrm.humanoid.getRawBoneNode(name) : null;
    var nodes = [];
    if (normalized) nodes.push(normalized);
    if (raw && raw !== normalized) nodes.push(raw);
    return nodes;
  }

  function CharacterFSM(config) {
    this.vrm = null;
    this.config = config;
    this.mixer = null;
    this.current = null;
    this.state = "idle";
    this.clips = [];
  }
  CharacterFSM.prototype.attach = function (vrm) {
    this.vrm = vrm;
    if (this.mixer) this.mixer.stopAllAction();
    this.mixer = new THREE.AnimationMixer(vrm.scene);
    var extra = vrm.scene.userData && vrm.scene.userData.mocoClips;
    this.clips = Array.isArray(extra) ? extra : [];
    this.current = null;
    this.playState(this.state);
  };
  CharacterFSM.prototype.setConfig = function (config) {
    this.config = config;
    if (this.vrm) this.playState(this.state);
  };
  CharacterFSM.prototype.setState = function (state) {
    if (this.state === state) return;
    this.state = state;
    this.playState(state);
  };
  CharacterFSM.prototype.getState = function () { return this.state; };
  CharacterFSM.prototype.hasActiveAction = function () { return Boolean(this.current && this.current.isRunning()); };
  CharacterFSM.prototype.playHabit = function (name) { return this.crossFade(name, 0.28); };
  CharacterFSM.prototype.update = function (delta) { if (this.mixer) this.mixer.update(Math.min(Math.max(delta, 0), 0.08)); };
  CharacterFSM.prototype.dispose = function () {
    if (this.mixer) this.mixer.stopAllAction();
    this.mixer = null;
    this.current = null;
    this.vrm = null;
    this.clips = [];
  };
  CharacterFSM.prototype.playState = function (state) { this.crossFade(state, 0.26); };
  CharacterFSM.prototype.findClip = function (name) {
    if (!name) return null;
    var key = String(name).toLowerCase();
    var clips = this.clips;
    for (var i = 0; i < clips.length; i += 1) if (clips[i].name.toLowerCase() === key) return clips[i];
    for (var j = 0; j < clips.length; j += 1) if (clips[j].name.toLowerCase().indexOf(key) !== -1) return clips[j];
    return null;
  };
  CharacterFSM.prototype.crossFade = function (name, fade) {
    if (!this.mixer) return false;
    var clip = this.findClip((this.config.clips && this.config.clips[name]) || name);
    if (!clip) return false;
    var next = this.mixer.clipAction(clip);
    next.enabled = true;
    next.setEffectiveWeight(1);
    next.reset().fadeIn(fade).play();
    if (this.current) this.current.fadeOut(fade);
    this.current = next;
    return true;
  };

  function SaccadeSystem(config, noise) {
    this.vrm = null;
    this.config = config;
    this.noise = noise;
    this.gaze = new THREE.Object3D();
    this.gaze.name = "moco-saccade-target";
    this.desired = new THREE.Vector3();
    this.headPos = new THREE.Vector3();
    this.camPos = new THREE.Vector3();
    this.dir = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
    this.right = new THREE.Vector3();
    this.qYaw = new THREE.Quaternion();
    this.qPitch = new THREE.Quaternion();
    this.thinking = false;
    this.boost = 1;
    this.boostUntil = 0;
    this.time = 0;
    this.nextMacroIn = 3.5;
    this.macroLeft = 0;
    this.avertIn = 2;
    this.avertLeft = 0;
    this.avertYaw = 0.2;
    this.avertPitch = -0.25;
    this.phone = false;
    this.reduced = false;
    this.resetTimers();
  }
  SaccadeSystem.prototype.attach = function (vrm, parent, camera) {
    this.vrm = vrm;
    if (!this.gaze.parent) parent.add(this.gaze);
    if (camera) camera.getWorldPosition(this.gaze.position);
    this.bindLookAt();
  };
  SaccadeSystem.prototype.bindLookAt = function () {
    var lookAt = this.vrm && this.vrm.lookAt;
    if (!lookAt) return;
    lookAt.autoUpdate = true;
    lookAt.target = this.gaze;
  };
  SaccadeSystem.prototype.setConfig = function (config) { this.config = config; this.resetTimers(); };
  SaccadeSystem.prototype.setThinking = function (thinking) { this.thinking = thinking; };
  SaccadeSystem.prototype.setCheckingPhone = function (phone) { this.phone = phone; };
  SaccadeSystem.prototype.setReducedMotion = function (reduced) { this.reduced = reduced; };
  SaccadeSystem.prototype.boostSaccade = function (multiplier, seconds) {
    this.boost = Math.max(1, multiplier);
    this.boostUntil = this.time + (seconds == null ? 2.4 : seconds);
  };
  SaccadeSystem.prototype.update = function (delta, camera) {
    var dt = Math.min(Math.max(delta, 0), 0.08);
    this.time += dt;
    if (this.time >= this.boostUntil) this.boost = 1;
    this.tickMacro(dt);
    this.tickAvert(dt);
    if (!this.vrm) return;
    var head = this.vrm.humanoid ? (this.vrm.humanoid.getNormalizedBoneNode("head") || this.vrm.humanoid.getRawBoneNode("head")) : null;
    if (head) head.getWorldPosition(this.headPos);
    else this.headPos.set(0, 1.4, 0);
    camera.getWorldPosition(this.camPos);
    this.dir.subVectors(this.camPos, this.headPos);
    if (this.dir.lengthSq() < 1e-8) this.dir.set(0, 0, 1);
    this.dir.normalize();
    var yaw = 0, pitch = 0;
    var cfg = this.config.saccade;
    var amp = this.reduced ? 0.15 : this.boost;
    if (this.thinking) {
      var sideT = this.noise.signed(0.17, 41) >= 0 ? 1 : -1;
      yaw += degToRad(cfg.thinkingYawDeg) * sideT;
      pitch += degToRad(cfg.thinkingPitchDeg);
    }
    if (this.phone) { pitch -= 0.55; yaw += 0.08; }
    if (this.macroLeft > 0) {
      var sideM = this.noise.signed(Math.floor(this.time), 42) >= 0 ? -1 : 1;
      yaw += degToRad(sideM < 0 ? cfg.macroLeftDeg : cfg.macroRightDeg) * sideM;
    }
    if (this.avertLeft > 0 && !this.thinking) { yaw += this.avertYaw; pitch += this.avertPitch; }
    if (!this.reduced) {
      var microT = this.time * cfg.microHz;
      yaw += this.noise.signed(microT, 43) * cfg.microAmp * amp;
      pitch += this.noise.signed(microT + 8.1, 44) * cfg.microAmp * 0.7 * amp;
    }
    this.right.crossVectors(this.dir, this.up);
    if (this.right.lengthSq() < 1e-8) this.right.set(1, 0, 0);
    else this.right.normalize();
    this.qYaw.setFromAxisAngle(this.up, yaw);
    this.qPitch.setFromAxisAngle(this.right, pitch);
    this.dir.applyQuaternion(this.qYaw).applyQuaternion(this.qPitch).normalize();
    this.desired.copy(this.headPos).addScaledVector(this.dir, 2.2);
    var follow = this.thinking || this.phone ? 4.2 : 9;
    this.gaze.position.x = damp(this.gaze.position.x, this.desired.x, follow, dt);
    this.gaze.position.y = damp(this.gaze.position.y, this.desired.y, follow, dt);
    this.gaze.position.z = damp(this.gaze.position.z, this.desired.z, follow, dt);
    this.bindLookAt();
  };
  SaccadeSystem.prototype.dispose = function () {
    if (this.gaze.parent) this.gaze.parent.remove(this.gaze);
    if (this.vrm && this.vrm.lookAt) this.vrm.lookAt.target = undefined;
    this.vrm = null;
  };
  SaccadeSystem.prototype.resetTimers = function () {
    this.nextMacroIn = intervalFromUnit(this.noise.unit(1, 51), this.config.saccade.macroIntervalMin, this.config.saccade.macroIntervalMax);
    this.avertIn = this.config.saccade.eyeContactHoldSec;
  };
  SaccadeSystem.prototype.tickMacro = function (dt) {
    if (this.macroLeft > 0) { this.macroLeft -= dt; return; }
    if (this.reduced || this.thinking) return;
    this.nextMacroIn -= dt;
    if (this.nextMacroIn > 0) return;
    this.nextMacroIn = intervalFromUnit(this.noise.unit(this.time, 52), this.config.saccade.macroIntervalMin, this.config.saccade.macroIntervalMax);
    if (this.noise.unit(this.time, 53) <= this.config.saccade.macroChance) this.macroLeft = 0.5;
  };
  SaccadeSystem.prototype.tickAvert = function (dt) {
    if (this.thinking || this.phone || this.reduced) return;
    if (this.avertLeft > 0) {
      this.avertLeft -= dt;
      if (this.avertLeft <= 0) this.avertIn = this.config.saccade.eyeContactHoldSec;
      return;
    }
    this.avertIn -= dt;
    if (this.avertIn > 0) return;
    this.avertLeft = intervalFromUnit(this.noise.unit(this.time, 54), this.config.saccade.avertSecMin, this.config.saccade.avertSecMax);
    this.avertYaw = this.noise.signed(this.time, 55) * 0.35;
    this.avertPitch = this.noise.signed(this.time, 56) >= 0 ? -0.32 : -0.12;
  };

  var REFLEX_THRESHOLD = 2.8;
  var BLINK_IN = 0.04;
  var BLINK_HOLD = 0.05;
  var BLINK_OUT = 0.08;
  var BLINK_COOLDOWN = 0.55;
  function ReflexController(config, noise) {
    this.vrm = null;
    this.config = config;
    this.noise = noise;
    this.prevHead = new THREE.Quaternion();
    this.headReady = false;
    this.rms = 0;
    this.thinking = false;
    this.reduced = false;
    this.time = 0;
    this.nextBlinkIn = 2.2;
    this.blinkT = -1;
    this.cooldown = 0;
    this.scheduleBlink();
  }
  ReflexController.prototype.attach = function (vrm) { this.vrm = vrm; this.headReady = false; };
  ReflexController.prototype.setConfig = function (config) { this.config = config; this.scheduleBlink(); };
  ReflexController.prototype.setRms = function (rms) { this.rms = clamp01(rms); };
  ReflexController.prototype.setThinking = function (thinking) { this.thinking = thinking; };
  ReflexController.prototype.setReducedMotion = function (reduced) { this.reduced = reduced; };
  ReflexController.prototype.amplitudeScale = function () {
    return rmsAmplitudeScale(this.rms, this.config.rms.tensionGain, this.config.rms.explosionThreshold, this.config.rms.explosionAmpMul);
  };
  ReflexController.prototype.update = function (delta) {
    var dt = Math.min(Math.max(delta, 0), 0.08);
    this.time += dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    this.sampleHead(dt);
    this.tickPeriodic(dt);
    return { blink: this.blinkWeight(dt), amplitudeScale: this.amplitudeScale() };
  };
  ReflexController.prototype.dispose = function () { this.vrm = null; this.headReady = false; };
  ReflexController.prototype.headBone = function () {
    if (!this.vrm || !this.vrm.humanoid) return null;
    return this.vrm.humanoid.getNormalizedBoneNode("head") || this.vrm.humanoid.getRawBoneNode("head") || null;
  };
  ReflexController.prototype.sampleHead = function (dt) {
    var head = this.headBone();
    if (!head) return;
    if (!this.headReady) { this.prevHead.copy(head.quaternion); this.headReady = true; return; }
    var velocity = angularVelocity(this.prevHead.angleTo(head.quaternion), dt);
    this.prevHead.copy(head.quaternion);
    if (!this.reduced && this.cooldown <= 0 && shouldTriggerReflexBlink(velocity, REFLEX_THRESHOLD)) this.triggerBlink();
  };
  ReflexController.prototype.tickPeriodic = function (dt) {
    if (this.blinkT >= 0) return;
    var scale = this.thinking ? this.config.saccade.thinkingBlinkScale : 1;
    this.nextBlinkIn -= dt * (this.reduced ? 0.45 : 1) * scale;
    if (this.nextBlinkIn <= 0) this.triggerBlink();
  };
  ReflexController.prototype.triggerBlink = function () {
    this.blinkT = 0;
    this.cooldown = BLINK_COOLDOWN;
    this.scheduleBlink();
  };
  ReflexController.prototype.scheduleBlink = function () {
    var cfg = this.config.saccade;
    this.nextBlinkIn = intervalFromUnit(this.noise.unit(this.time + 3, 61), cfg.blinkIntervalMin, cfg.blinkIntervalMax);
  };
  ReflexController.prototype.blinkWeight = function (dt) {
    if (this.blinkT < 0) return 0;
    this.blinkT += dt;
    var t = this.blinkT;
    if (t < BLINK_IN) return clamp01(t / BLINK_IN);
    if (t < BLINK_IN + BLINK_HOLD) return 1;
    var out = t - BLINK_IN - BLINK_HOLD;
    if (out >= BLINK_OUT) { this.blinkT = -1; return 0; }
    return clamp01(1 - out / BLINK_OUT);
  };

  function VRMHumanizer(config, noise) {
    this.vrm = null;
    this.config = config;
    this.noise = noise;
    this.body = new Map();
    this.arms = new Map();
    this.qPosture = new THREE.Quaternion();
    this.qShift = new THREE.Quaternion();
    this.qMicro = new THREE.Quaternion();
    this.qScratch = new THREE.Quaternion();
    this.eMicro = new THREE.Euler(0, 0, 0, "XYZ");
    this.ePosture = new THREE.Euler(0, 0, 0, "XYZ");
    this.eShift = new THREE.Euler(0, 0, 0, "XYZ");
    this.qSway = new THREE.Quaternion();
    this.axisX = new THREE.Vector3(1, 0, 0);
    this.axisZ = new THREE.Vector3(0, 0, 1);
    this.shiftFrom = new THREE.Quaternion();
    this.shiftTo = new THREE.Quaternion();
    this.shiftElapsed = 0;
    this.shiftDuration = 2.4;
    this.nextShiftIn = 12;
    this.time = 0;
    this.amplitude = 1;
    this.rms = 0;
    this.state = "idle";
    this.reduced = false;
    this.silence = 0;
    this.habit = null;
    this.nextHairTuck = 60;
    this.nextNeckCrack = 90;
    this.nextWristShake = 25;
    this.pendingHabit = null;
    this.checkingPhone = false;
    this.snapElapsed = 1;
    this.mixerLive = false;
    this.resetTimers();
  }
  VRMHumanizer.prototype.attach = function (vrm) {
    this.vrm = vrm;
    this.body.clear();
    this.arms.clear();
    for (var i = 0; i < BODY_BONES.length; i += 1) this.capture(this.body, BODY_BONES[i]);
    for (var j = 0; j < ARM_BONES.length; j += 1) this.capture(this.arms, ARM_BONES[j]);
    this.resetTimers();
  };
  VRMHumanizer.prototype.setConfig = function (config) { this.config = config; this.resetTimers(); };
  VRMHumanizer.prototype.setAmplitudeScale = function (scale) { this.amplitude = Math.max(0, scale); };
  VRMHumanizer.prototype.setRms = function (rms) { this.rms = rms; };
  VRMHumanizer.prototype.setState = function (state) {
    if (this.state === state) return;
    this.state = state;
    this.snapElapsed = 0;
    if (state !== "idle") this.checkingPhone = false;
    if (state === "thinking" && this.config.habits.lipTouch) this.pendingHabit = "lip_touch";
    if (state !== "thinking" && this.habit && this.habit.name === "lip_touch") this.habit = null;
  };
  VRMHumanizer.prototype.setReducedMotion = function (reduced) { this.reduced = reduced; };
  VRMHumanizer.prototype.setMixerLive = function (live) { this.mixerLive = live; };
  VRMHumanizer.prototype.consumeHabitTrigger = function () {
    var next = this.pendingHabit;
    this.pendingHabit = null;
    return next;
  };
  VRMHumanizer.prototype.startHabit = function (name) {
    var dur = name === "neck_crack" ? 1.15 : name === "wrist_shake" ? 0.7 : name === "lip_touch" ? 99 : 1.85;
    this.habit = { name: name, t: 0, dur: dur };
  };
  VRMHumanizer.prototype.isCheckingPhone = function () { return this.checkingPhone; };
  VRMHumanizer.prototype.checkPhoneJoy = function () { return this.checkingPhone ? this.config.habits.checkPhoneJoy : 0; };
  VRMHumanizer.prototype.update = function (delta) {
    var dt = Math.min(Math.max(delta, 0), 0.08);
    this.time += dt;
    if (this.state === "speaking") this.silence = 0;
    else this.silence += dt;
    this.tickHabits(dt);
    this.tickWeightShift(dt);
    if (!this.vrm) return;
    this.stashMixerPose();
    this.applyBody();
    this.stashLayerPose();
    this.applyToonBounciness(dt, this.rms, this.state);
  };
  VRMHumanizer.prototype.applyToonBounciness = function (delta, audioRMS, currentState) {
    var dt = Math.min(Math.max(delta, 0), 0.08);
    this.snapElapsed += dt;
    this.restoreLayerPose();
    var toon = this.config.toon;
    var mute = this.reduced ? 0.55 : 1;
    var rms = clamp01(audioRMS);
    var speakMix = currentState === "speaking" ? clamp01(rms) * 0.4 : currentState === "thinking" ? 0.05 : 0;
    var speed = lerp(toon.bopSpeedIdle, toon.bopSpeedSpeak, speakMix);
    var amp = lerp(toon.bopAmpIdle, toon.bopAmpSpeak, speakMix) * mute;
    var offset = toonBopOffset(this.time, speed, amp, toon.bopPhase);
    var wave = amp > 1e-8 ? offset / amp : 0;
    var snap = Math.exp(-this.snapElapsed * 7.2) * Math.sin(this.snapElapsed * 17) * toon.snapAmp * amp;
    var bop = clamp(offset + snap, -TOON_BOP_MAX, TOON_BOP_MAX);
    var nod = toonNodPitch(wave, toon.nodAmp * (0.4 + speakMix * 0.6) * mute);
    var sway = toonSwayRoll(this.time, toon.swaySpeed, toon.swayAmp * (0.65 + speakMix * 0.55) * mute);
    this.addToonBop("hips", bop);
    this.multiplyToonAxis("head", this.axisX, nod);
    if (toon.swayAmp > 0) {
      this.multiplyToonAxis("spine", this.axisZ, sway);
      this.multiplyToonAxis("chest", this.axisZ, sway * 0.72);
    }
    var head = this.body.get("head");
    if (head && currentState === "speaking" && toon.squash > 0) {
      var squash = toonSquashScale(wave, rms, toon.squash);
      var copy = head.copies[0];
      if (copy) copy.node.scale.set(copy.layerScale.x * squash.x, copy.layerScale.y * squash.y, copy.layerScale.z);
    }
  };
  VRMHumanizer.prototype.updateHands = function (delta) {
    if (!this.vrm) return;
    var dt = Math.min(Math.max(delta, 0), 0.08);
    if (this.habit) {
      this.habit.t += dt;
      if (this.habit.name !== "lip_touch" && this.habit.t >= this.habit.dur) this.habit = null;
    }
    this.applyHands();
  };
  VRMHumanizer.prototype.dispose = function () { this.vrm = null; this.body.clear(); this.arms.clear(); };
  VRMHumanizer.prototype.capture = function (map, name) {
    if (!this.vrm) return;
    var nodes = findBones(this.vrm, name);
    if (nodes.length === 0) return;
    map.set(name, {
      copies: nodes.map(function (node) {
        return {
          node: node,
          rest: node.quaternion.clone(),
          restScale: node.scale.clone(),
          restPos: node.position.clone(),
          layerQuat: node.quaternion.clone(),
          layerPos: node.position.clone(),
          layerScale: node.scale.clone(),
          mixerQuat: node.quaternion.clone(),
          mixerPos: node.position.clone(),
          mixerScale: node.scale.clone()
        };
      })
    });
  };
  VRMHumanizer.prototype.resetTimers = function () {
    var n = this.noise;
    var t = this.time + 1;
    var shift = this.config.weightShift;
    this.nextShiftIn = intervalFromUnit(n.unit(t, 11), shift.intervalMinSec, shift.intervalMaxSec);
    this.shiftFrom.identity();
    this.shiftTo.identity();
    this.shiftElapsed = this.shiftDuration;
    var hair = this.config.habits.hairTuckInterval;
    this.nextHairTuck = hair ? intervalFromUnit(n.unit(t, 12), hair[0], hair[1]) : Number.POSITIVE_INFINITY;
    var crack = this.config.habits.neckCrackInterval;
    this.nextNeckCrack = crack ? intervalFromUnit(n.unit(t, 13), crack[0], crack[1]) : Number.POSITIVE_INFINITY;
    var wrist = this.config.habits.wristShakeInterval;
    this.nextWristShake = wrist ? intervalFromUnit(n.unit(t, 14), wrist[0], wrist[1]) : Number.POSITIVE_INFINITY;
  };
  VRMHumanizer.prototype.tickHabits = function (dt) {
    if (this.reduced) return;
    if (this.state === "speaking" && this.config.habits.hairTuckInterval) {
      this.nextHairTuck -= dt;
      if (this.nextHairTuck <= 0 && !this.habit) {
        this.pendingHabit = "hair_tuck";
        this.nextHairTuck = intervalFromUnit(this.noise.unit(this.time, 21), this.config.habits.hairTuckInterval[0], this.config.habits.hairTuckInterval[1]);
      }
    }
    if (this.state === "idle" && this.config.habits.neckCrackInterval) {
      this.nextNeckCrack -= dt;
      if (this.nextNeckCrack <= 0 && !this.habit) {
        this.pendingHabit = "neck_crack";
        this.nextNeckCrack = intervalFromUnit(this.noise.unit(this.time, 22), this.config.habits.neckCrackInterval[0], this.config.habits.neckCrackInterval[1]);
      }
    }
    if (this.state !== "speaking" && this.config.habits.wristShakeInterval) {
      this.nextWristShake -= dt;
      if (this.nextWristShake <= 0 && !this.habit) {
        this.pendingHabit = "wrist_shake";
        this.nextWristShake = intervalFromUnit(this.noise.unit(this.time, 23), this.config.habits.wristShakeInterval[0], this.config.habits.wristShakeInterval[1]);
      }
    }
    var phoneAfter = this.config.habits.checkPhoneSilenceSec;
    this.checkingPhone = phoneAfter > 0 && this.state === "idle" && this.silence >= phoneAfter;
  };
  VRMHumanizer.prototype.tickWeightShift = function (dt) {
    if (this.reduced) return;
    if (this.shiftElapsed < this.shiftDuration) { this.shiftElapsed += dt; return; }
    this.nextShiftIn -= dt;
    if (this.nextShiftIn > 0) return;
    var cfg = this.config.weightShift;
    var unit = this.noise.unit(this.time, 31);
    var twist = degToRad(lerp(cfg.twistDegMin, cfg.twistDegMax, unit));
    var pitch = degToRad(lerp(1, cfg.twistDegMax, this.noise.unit(this.time, 32))) * 0.35;
    var side = this.noise.signed(this.time, 33) >= 0 ? 1 : -1;
    this.shiftFrom.copy(this.shiftTo);
    this.eShift.set(pitch * side * 0.4, twist * side, pitch * 0.25);
    this.shiftTo.setFromEuler(this.eShift);
    this.shiftDuration = intervalFromUnit(this.noise.unit(this.time, 34), cfg.slerpSecMin, cfg.slerpSecMax);
    this.shiftElapsed = 0;
    this.snapElapsed = 0;
    this.nextShiftIn = intervalFromUnit(this.noise.unit(this.time, 35), cfg.intervalMinSec, cfg.intervalMaxSec);
  };
  VRMHumanizer.prototype.applyBody = function () {
    var amp = this.reduced ? 0.15 : this.amplitude;
    var breath = this.config.breathing;
    var scale = this.reduced ? 1 : breathingScale(this.time, breath.speed, breath.chestScaleMin, breath.chestScaleMax);
    var nod = breathingHeadPitch(this.time, breath.speed, breath.headPitchAmp) * amp;
    var shiftAlpha = this.reduced ? 0 : cartoonSlerpAlpha(this.shiftElapsed, this.shiftDuration, this.config.toon.easing);
    this.qShift.slerpQuaternions(this.shiftFrom, this.shiftTo, shiftAlpha);
    var bob = !this.reduced && this.shiftElapsed < this.shiftDuration ? Math.sin(shiftAlpha * Math.PI) * this.config.weightShift.shoulderBobAmp : 0;
    var sway = this.state === "speaking" && !this.reduced ? Math.sin(this.time * 2.4) * this.config.habits.bodySwayAmp * amp : 0;
    var explode = this.rms >= this.config.rms.explosionThreshold ? this.rms : 0;
    var lean = explode * this.config.rms.leanAmp * amp;
    this.compose("hips", this.config.posture.hips, this.qShift, 0, 0, 0, 0);
    this.compose("spine", this.config.posture.spine, this.qShift, lean * 0.45, sway, this.noiseAt("spine", amp), nod * 0.15);
    this.compose("chest", this.config.posture.chest, this.qShift, lean, sway * 0.7, this.noiseAt("chest", amp), nod * 0.25);
    this.compose("upperChest", this.config.posture.chest, this.qIdentity(), lean * 0.5, sway * 0.4, this.noiseAt("chest", amp) * 0.6, 0);
    var phonePitch = this.checkingPhone ? 0.38 : 0;
    var crack = this.habit && this.habit.name === "neck_crack" ? this.neckCrackEuler() : { x: 0, y: 0, z: 0 };
    this.compose("neck", this.config.posture.neck, this.qIdentity(), phonePitch * 0.45 + crack.x + nod * 0.55, crack.y, this.noiseAt("neck", amp) + crack.z, 0);
    this.compose("head", { x: 0, y: 0, z: 0 }, this.qIdentity(), phonePitch + crack.x * 0.35 + nod, crack.y * 0.45, this.noiseAt("head", amp), 0);
    this.compose("leftShoulder", this.config.posture.leftShoulder, this.qIdentity(), -bob, 0, 0, 0);
    this.compose("rightShoulder", this.config.posture.rightShoulder, this.qIdentity(), bob, 0, 0, 0);
    this.applyChestScale(scale);
  };
  VRMHumanizer.prototype.qIdentity = function () { return this.qScratch.identity(); };
  VRMHumanizer.prototype.noiseAt = function (bone, amp) {
    if (this.reduced) return 0;
    var channel = bone === "spine" ? 1 : bone === "chest" ? 2 : bone === "neck" ? 3 : 4;
    var base = bone === "head" ? this.config.microNoise.headAmp : bone === "neck" ? this.config.microNoise.neckAmp : this.config.microNoise.spineAmp;
    return this.noise.signed(this.time * 0.85, channel) * base * amp;
  };
  VRMHumanizer.prototype.compose = function (name, postureDeg, shift, extraX, extraY, extraZ, extraPitch) {
    var tracked = this.body.get(name);
    if (!tracked) return;
    this.ePosture.set(degToRad(postureDeg.x), degToRad(postureDeg.y), degToRad(postureDeg.z));
    this.qPosture.setFromEuler(this.ePosture);
    this.eMicro.set(extraX + extraPitch, extraY, extraZ);
    this.qMicro.setFromEuler(this.eMicro);
    var copy = tracked.copies[0];
    if (!copy) return;
    var base = this.mixerLive ? copy.mixerQuat : copy.rest;
    copy.node.quaternion.copy(base).multiply(this.qPosture).multiply(shift).multiply(this.qMicro);
    copy.node.rotation.setFromQuaternion(copy.node.quaternion);
  };
  VRMHumanizer.prototype.stashMixerPose = function () {
    for (var i = 0; i < BODY_BONES.length; i += 1) {
      var tracked = this.body.get(BODY_BONES[i]);
      if (!tracked) continue;
      for (var j = 0; j < tracked.copies.length; j += 1) {
        tracked.copies[j].mixerQuat.copy(tracked.copies[j].node.quaternion);
        tracked.copies[j].mixerPos.copy(tracked.copies[j].node.position);
        tracked.copies[j].mixerScale.copy(tracked.copies[j].node.scale);
      }
    }
  };
  VRMHumanizer.prototype.stashLayerPose = function () {
    for (var i = 0; i < TOON_BONES.length; i += 1) {
      var tracked = this.body.get(TOON_BONES[i]);
      if (!tracked) continue;
      for (var j = 0; j < tracked.copies.length; j += 1) {
        tracked.copies[j].layerQuat.copy(tracked.copies[j].node.quaternion);
        tracked.copies[j].layerPos.copy(tracked.copies[j].node.position);
        tracked.copies[j].layerScale.copy(tracked.copies[j].node.scale);
      }
    }
  };
  VRMHumanizer.prototype.restoreLayerPose = function () {
    for (var i = 0; i < TOON_BONES.length; i += 1) {
      var tracked = this.body.get(TOON_BONES[i]);
      if (!tracked) continue;
      for (var j = 0; j < tracked.copies.length; j += 1) {
        var copy = tracked.copies[j];
        copy.node.quaternion.copy(copy.layerQuat);
        copy.node.position.copy(copy.layerPos);
        copy.node.scale.copy(copy.layerScale);
        copy.node.rotation.setFromQuaternion(copy.layerQuat);
      }
    }
  };
  VRMHumanizer.prototype.addToonBop = function (name, offsetY) {
    var copy = this.body.get(name) && this.body.get(name).copies[0];
    if (!copy) return;
    copy.node.position.copy(copy.layerPos);
    copy.node.position.y = copy.layerPos.y + offsetY;
  };
  VRMHumanizer.prototype.multiplyToonAxis = function (name, axis, angle) {
    var copy = this.body.get(name) && this.body.get(name).copies[0];
    if (!copy || Math.abs(angle) < 1e-6) return;
    this.qSway.setFromAxisAngle(axis, angle);
    copy.node.quaternion.copy(copy.layerQuat).multiply(this.qSway);
    copy.node.rotation.setFromQuaternion(copy.node.quaternion);
  };
  VRMHumanizer.prototype.applyChestScale = function (scale) {
    var chest = this.body.get("chest") || this.body.get("upperChest");
    if (!chest) return;
    var copy = chest.copies[0];
    if (!copy) return;
    var base = this.mixerLive ? copy.mixerScale : copy.restScale;
    copy.node.scale.set(base.x, base.y * scale, base.z * scale);
  };
  VRMHumanizer.prototype.neckCrackEuler = function () {
    if (!this.habit) return { x: 0, y: 0, z: 0 };
    var u = this.habit.t / this.habit.dur;
    var yaw = 0;
    if (u < 0.28) yaw = lerp(0, -0.55, u / 0.28);
    else if (u < 0.62) yaw = lerp(-0.55, 0.58, (u - 0.28) / 0.34);
    else yaw = lerp(0.58, 0, (u - 0.62) / 0.38);
    return { x: 0.04, y: yaw, z: yaw * 0.15 };
  };
  VRMHumanizer.prototype.applyHands = function () {
    this.resetArm("leftUpperArm");
    this.resetArm("leftLowerArm");
    this.resetArm("leftHand");
    this.resetArm("rightUpperArm");
    this.resetArm("rightLowerArm");
    this.resetArm("rightHand");
    if (this.config.habits.airGuitar) this.applyAirGuitar();
    var habit = this.habit;
    if (!habit) return;
    var u = Math.min(habit.t / Math.max(habit.dur, 0.001), 1);
    if (habit.name === "hair_tuck") this.applyHairTuck(this.habitEnvelope(u));
    if (habit.name === "lip_touch") this.applyLipTouch(this.state === "thinking" ? 1 : 0);
    if (habit.name === "wrist_shake") this.applyWristShake(this.habitEnvelope(u));
  };
  VRMHumanizer.prototype.habitEnvelope = function (u) {
    if (u < 0.22) return u / 0.22;
    if (u > 0.72) return Math.max(0, 1 - (u - 0.72) / 0.28);
    return 1;
  };
  VRMHumanizer.prototype.resetArm = function (name) {
    var tracked = this.arms.get(name);
    if (!tracked) return;
    for (var i = 0; i < tracked.copies.length; i += 1) tracked.copies[i].node.quaternion.copy(tracked.copies[i].rest);
  };
  VRMHumanizer.prototype.addLocal = function (name, x, y, z, weight) {
    var tracked = this.arms.get(name);
    if (!tracked || weight <= 1e-4) return;
    this.eMicro.set(x * weight, y * weight, z * weight);
    this.qMicro.setFromEuler(this.eMicro);
    for (var i = 0; i < tracked.copies.length; i += 1) tracked.copies[i].node.quaternion.multiply(this.qMicro);
  };
  VRMHumanizer.prototype.applyHairTuck = function (w) {
    this.addLocal("leftUpperArm", -0.95, 0.55, 0.7, w);
    this.addLocal("leftLowerArm", -1.15, 0.15, 0.1, w);
    this.addLocal("leftHand", 0.15, 0.35, 0.2, w);
  };
  VRMHumanizer.prototype.applyLipTouch = function (w) {
    var eased = this.reduced ? 0 : w;
    this.addLocal("rightUpperArm", -0.7, -0.35, -0.55, eased);
    this.addLocal("rightLowerArm", -1.35, 0.1, 0, eased);
    this.addLocal("rightHand", 0.1, -0.25, 0.15, eased);
  };
  VRMHumanizer.prototype.applyWristShake = function (w) {
    var flicker = Math.sin(this.time * 28) * 0.45;
    this.addLocal("leftLowerArm", 0.08, flicker, 0.12, w);
    this.addLocal("leftHand", flicker * 0.8, 0.1, flicker, w);
  };
  VRMHumanizer.prototype.applyAirGuitar = function () {
    var pick = Math.sin(this.time * 7.4) * 0.09 * (this.state === "speaking" ? 1.25 : 0.7);
    this.addLocal("rightHand", pick, 0.02, pick * 0.4, 1);
    this.addLocal("rightLowerArm", pick * 0.25, 0, 0, 1);
  };

  function VrmHumanizerRuntime(config) {
    var noise = createContinuousNoise();
    this.characterId = config.id;
    this.humanizer = new VRMHumanizer(config, noise);
    this.saccade = new SaccadeSystem(config, noise);
    this.fsm = new CharacterFSM(config);
    this.reflex = new ReflexController(config, noise);
    this.speaking = false;
    this.thinking = false;
  }
  VrmHumanizerRuntime.attach = function (vrm, characterId, camera) {
    var config = resolveCharacterConfig(characterId);
    var runtime = new VrmHumanizerRuntime(config);
    runtime.humanizer.attach(vrm);
    runtime.fsm.attach(vrm);
    runtime.reflex.attach(vrm);
    runtime.saccade.attach(vrm, vrm.scene.parent || vrm.scene, camera);
    runtime.saccade.bindLookAt();
    return runtime;
  };
  VrmHumanizerRuntime.prototype.setCharacter = function (characterId) {
    var config = resolveCharacterConfig(characterId);
    if (config.id === this.characterId) return;
    this.characterId = config.id;
    this.humanizer.setConfig(config);
    this.saccade.setConfig(config);
    this.fsm.setConfig(config);
    this.reflex.setConfig(config);
  };
  VrmHumanizerRuntime.prototype.setThinking = function (thinking) { this.thinking = thinking; this.syncState(); };
  VrmHumanizerRuntime.prototype.setSpeaking = function (speaking) { this.speaking = speaking; this.syncState(); };
  VrmHumanizerRuntime.prototype.setRms = function (rms) { this.reflex.setRms(rms); this.humanizer.setRms(rms); };
  VrmHumanizerRuntime.prototype.notifySpeech = function (text, emotion) {
    if (shouldBoostSaccade(text, emotion)) this.saccade.boostSaccade(2.8, 2.6);
  };
  VrmHumanizerRuntime.prototype.beforeVrmUpdate = function (delta, camera) {
    this.syncState();
    this.humanizer.setAmplitudeScale(this.reflex.amplitudeScale());
    this.fsm.update(delta);
    this.humanizer.setMixerLive(this.fsm.hasActiveAction());
    this.humanizer.update(delta);
    var habit = this.humanizer.consumeHabitTrigger();
    if (habit && !this.fsm.playHabit(habit)) this.humanizer.startHabit(habit);
    this.saccade.setCheckingPhone(this.humanizer.isCheckingPhone());
    this.saccade.update(delta, camera);
  };
  VrmHumanizerRuntime.prototype.afterVrmUpdate = function (delta) {
    this.humanizer.updateHands(delta);
    var reflex = this.reflex.update(delta);
    return { blink: reflex.blink, joy: this.humanizer.checkPhoneJoy() };
  };
  VrmHumanizerRuntime.prototype.dispose = function () {
    this.humanizer.dispose();
    this.saccade.dispose();
    this.fsm.dispose();
    this.reflex.dispose();
  };
  VrmHumanizerRuntime.prototype.syncState = function () {
    var state = resolveFsmState(this.speaking, this.thinking);
    this.fsm.setState(state);
    this.humanizer.setState(state);
    this.saccade.setThinking(state === "thinking");
    this.reflex.setThinking(state === "thinking");
  };

  return { VrmHumanizerRuntime: VrmHumanizerRuntime };
}
`;
