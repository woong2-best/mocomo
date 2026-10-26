"use client";

import type { VRM } from "@pixiv/three-vrm";
import { memo, useEffect, useMemo, useRef } from "react";
import { IDOL_VRM_DEFAULTS } from "@/lib/ai-live/idol-vrm-shared";
import {
  applyVrmMouth,
  isChloeCharacter,
  parseVrmEmotion,
  setVrmEmotion,
  setupChloeDrunkState,
} from "@/lib/ai-live/vrm-expression";
import { disposeIdolVrm, loadIdolVrm, useIdolVrm } from "@/components/live/ai-host/use-idol-vrm";
import { VrmHumanizerRuntime } from "@/lib/vrm-humanizer";

const DEFAULT_VRM_URL = IDOL_VRM_DEFAULTS.zelie;

export type MocoStageHandle = {
  /** Create the audio graph during the click that will play speech. */
  prime: () => void;
  /** Play speech. `emotion` stays at 1 until the clip ends, then the face returns to neutral. */
  playVoice: (bytes: ArrayBuffer, emotion?: string, text?: string) => Promise<void>;
  /** Browser voice when the server did not return MP3. */
  speakText: (text: string, emotion?: string) => Promise<void>;
  stopVoice: () => void;
  /** Swap a clothing material's texture without reloading the VRM. */
  changeClothing: (materialName: string, textureUrl: string) => void;
  /** Look-away / lip-touch while the host is generating a reply. */
  setThinking: (thinking: boolean) => void;
};

type PaintableMaterial = import("three").Material & { map?: import("three").Texture | null };

function clothingTextureUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "https://mocomo.net";
    const url = new URL(trimmed, base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Keep the skeleton and mesh. Replace the named material's color map.
 * `materialName` matches `material.name` (for example `CLOTHING_MAT`).
 */
export async function changeClothingTexture(vrm: VRM | null | undefined, materialName: string, newTextureUrl: string) {
  const needle = materialName.trim();
  const href = clothingTextureUrl(newTextureUrl);
  if (!vrm || !needle || !href) return;

  const THREE = await import("three");
  const texture = await new Promise<import("three").Texture | null>((resolve) => {
    new THREE.TextureLoader().load(href, (loaded) => resolve(loaded), undefined, () => resolve(null));
  });
  if (!texture) return;
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  texture.userData.mocoClothing = true;

  const retired = new Set<import("three").Texture>();
  let applied = 0;
  vrm.scene.traverse((child) => {
    const mesh = child as import("three").Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of list) {
      if (!mat?.name?.includes(needle)) continue;
      const paintable = mat as PaintableMaterial;
      if (!("map" in paintable)) continue;
      const previous = paintable.map;
      paintable.map = texture;
      paintable.needsUpdate = true;
      applied += 1;
      if (previous && previous !== texture && previous.userData.mocoClothing === true) {
        retired.add(previous);
      }
    }
  });
  if (applied === 0) {
    texture.dispose();
    return;
  }
  for (const previous of retired) previous.dispose();
}

type LipSync = {
  active: boolean;
  emotion: string;
  analyser: AnalyserNode | null;
  bins: Uint8Array<ArrayBuffer> | null;
  pulse: number | null;
};

/**
 * Studio VRM. Idle is local requestAnimationFrame only.
 * Voice bytes are analysed here; this file never calls a model or a TTS server.
 */
function MocoVrmStageView({
  framing = "bust",
  vrmUrl = DEFAULT_VRM_URL,
  backdropUrl,
  characterId = null,
  onReady,
}: {
  framing?: "bust" | "stage";
  vrmUrl?: string;
  backdropUrl?: string | null;
  characterId?: string | null;
  onReady?: (handle: MocoStageHandle | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const urlRef = useRef(vrmUrl);
  urlRef.current = vrmUrl;
  const characterIdRef = useRef(characterId);
  characterIdRef.current = characterId;
  const thinkingRef = useRef(false);
  const { phase, swapRef, armed, setPhaseRef } = useIdolVrm(vrmUrl);
  const voiceRef = useRef<MocoStageHandle>({
    prime() {},
    playVoice: async () => {},
    speakText: async () => {},
    stopVoice() {},
    changeClothing() {},
    setThinking() {},
  });

  const handle = useMemo<MocoStageHandle>(
    () => ({
      prime: () => voiceRef.current.prime(),
      playVoice: (bytes, emotion, text) => voiceRef.current.playVoice(bytes, emotion, text),
      speakText: (text, emotion) => voiceRef.current.speakText(text, emotion),
      stopVoice: () => voiceRef.current.stopVoice(),
      changeClothing: (materialName, textureUrl) => voiceRef.current.changeClothing(materialName, textureUrl),
      setThinking: (thinking) => voiceRef.current.setThinking(thinking),
    }),
    []
  );

  useEffect(() => {
    onReady?.(handle);
    return () => onReady?.(null);
  }, [handle, onReady]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let alive = true;
    let dispose = () => {};
    let audioCtx: AudioContext | null = null;
    const humanizerRef: { current: VrmHumanizerRuntime | null } = { current: null };
    let source: AudioBufferSourceNode | null = null;
    let playDone: (() => void) | null = null;
    let voiceSession = 0;
    const lip: LipSync = { active: false, emotion: "neutral", analyser: null, bins: null, pulse: null };
    const shown: { current: VRM | null } = { current: null };

    const stopVoice = () => {
      voiceSession += 1;
      lip.active = false;
      lip.emotion = "neutral";
      lip.analyser = null;
      lip.bins = null;
      lip.pulse = null;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      const current = source;
      source = null;
      if (current) {
        current.onended = null;
        try {
          current.stop();
        } catch {
          /* already stopped */
        }
      }
      const done = playDone;
      playDone = null;
      done?.();
    };

    const prime = () => {
      if (typeof AudioContext === "undefined") return;
      if (!audioCtx) audioCtx = new AudioContext();
      void audioCtx.resume();
    };

    const playVoice = async (bytes: ArrayBuffer, emotion?: string, text?: string) => {
      stopVoice();
      const token = voiceSession;
      const mood = parseVrmEmotion(emotion);
      humanizerRef.current?.notifySpeech(text, mood);
      prime();
      if (!audioCtx || bytes.byteLength < 64) return;
      try {
        const buffer = await audioCtx.decodeAudioData(bytes.slice(0));
        if (!alive || token !== voiceSession || !audioCtx) return;
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
        lip.emotion = mood;
        lip.pulse = null;
        lip.active = true;
        await new Promise<void>((resolve) => {
          playDone = resolve;
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
      } catch {
        lip.active = false;
        lip.emotion = "neutral";
      }
    };

    const speakText = async (text: string, emotion?: string) => {
      const line = text.replace(/\s+/g, " ").trim();
      if (!line || typeof window === "undefined" || !window.speechSynthesis) return;
      stopVoice();
      const token = voiceSession;
      const mood = parseVrmEmotion(emotion);
      humanizerRef.current?.notifySpeech(line, mood);
      const { speechLangForText, EDGE_VOICES } = await import("@/lib/ai-live/speech-lang");
      const want = EDGE_VOICES[speechLangForText(line)].bcp47;
      const voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
        const have = window.speechSynthesis.getVoices();
        if (have.length) {
          resolve(have);
          return;
        }
        const finish = () => resolve(window.speechSynthesis.getVoices());
        window.speechSynthesis.addEventListener("voiceschanged", finish, { once: true });
        window.setTimeout(finish, 400);
      });
      if (!alive || token !== voiceSession) return;
      const voice =
        voices.find((item) => item.lang === want) ??
        voices.find((item) => item.lang.toLowerCase().startsWith(want.slice(0, 2))) ??
        null;
      const uttered = new SpeechSynthesisUtterance(line);
      uttered.lang = want;
      if (voice) uttered.voice = voice;
      uttered.rate = 1.04;
      lip.emotion = mood;
      lip.active = true;
      lip.pulse = 0.35;
      const pulse = () => {
        if (!lip.active || token !== voiceSession) return;
        lip.pulse = 0.22 + 0.55 * Math.abs(Math.sin(performance.now() / 110));
        requestAnimationFrame(pulse);
      };
      requestAnimationFrame(pulse);
      await new Promise<void>((resolve) => {
        playDone = resolve;
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
    };

    const changeClothing = (materialName: string, textureUrl: string) => {
      void changeClothingTexture(shown.current, materialName, textureUrl);
    };

    const setThinking = (thinking: boolean) => {
      thinkingRef.current = thinking;
      humanizerRef.current?.setThinking(thinking);
    };

    voiceRef.current = { prime, playVoice, speakText, stopVoice, changeClothing, setThinking };

    void (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
      const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");
      const { VRMLoaderPlugin } = await import("@pixiv/three-vrm");
      if (!alive || !hostRef.current) return;

      const useBackdrop = Boolean(backdropUrl);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: useBackdrop });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      if (useBackdrop) renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      const canvas = renderer.domElement;
      canvas.dataset.functionalCanvas = "";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      canvas.setAttribute("aria-hidden", "true");

      const scene = new THREE.Scene();
      scene.background = useBackdrop ? null : new THREE.Color(0x241c33);
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
      const cameraTarget = new THREE.Vector3(0, 1.2, 0);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = env;

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
        const w = Math.max(host.clientWidth, 1);
        const h = Math.max(host.clientHeight, 1);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      type HungBone = { bone: import("three").Object3D; quat: import("three").Quaternion };
      type Pose = {
        vrm: VRM;
        spine: import("three").Object3D | null;
        chest: import("three").Object3D | null;
        headBone: import("three").Object3D | null;
        spineRestX: number;
        spineRestY: number;
        spineRestZ: number;
        chestRestX: number;
        chestRestY: number;
        chestRestZ: number;
        headRestX: number;
        headRestY: number;
        headRestZ: number;
        hung: HungBone[];
      };
      const poseRef: { current: Pose | null } = { current: null };
      let loadedUrl: string | null = null;
      let loadGen = 0;

      const hangBone = (bone: import("three").Object3D | null, goal: import("three").Vector3): HungBone | null => {
        if (!bone?.parent) return null;
        bone.updateWorldMatrix(true, true);
        const child = bone.children.find((node) => (node as import("three").Bone).isBone) ?? bone.children[0];
        if (!child) return null;
        const origin = bone.getWorldPosition(new THREE.Vector3());
        const tip = child.getWorldPosition(new THREE.Vector3());
        const dir = tip.sub(origin);
        if (dir.lengthSq() < 1e-8) return null;
        dir.normalize();
        const worldDelta = new THREE.Quaternion().setFromUnitVectors(dir, goal.clone().normalize());
        const parentWorld = bone.parent.getWorldQuaternion(new THREE.Quaternion());
        const currentWorld = bone.getWorldQuaternion(new THREE.Quaternion());
        bone.quaternion.copy(parentWorld.invert()).multiply(worldDelta).multiply(currentWorld);
        return { bone, quat: bone.quaternion.clone() };
      };

      const frameCamera = (vrm: VRM) => {
        vrm.scene.updateMatrixWorld(true);
        const head = vrm.humanoid?.getNormalizedBoneNode("head");
        const chest =
          vrm.humanoid?.getNormalizedBoneNode("upperChest") ??
          vrm.humanoid?.getNormalizedBoneNode("chest");
        const headPos = new THREE.Vector3(0, 1.45, 0);
        const chestPos = new THREE.Vector3(0, 1.2, 0);
        head?.getWorldPosition(headPos);
        chest?.getWorldPosition(chestPos);
        const hairTop = headPos.y + 0.2;
        const chestLine = chestPos.y + 0.1;
        const avatarH = Math.max(hairTop - chestLine, 0.28);
        const visibleH = avatarH / 0.75;
        const headroom = 0.12;
        cameraTarget.set(headPos.x, hairTop + headroom - visibleH / 2, headPos.z);
        const fovRad = (camera.fov * Math.PI) / 180;
        const distance = THREE.MathUtils.clamp(
          (visibleH / 2) / Math.tan(fovRad / 2),
          framing === "bust" ? 1.0 : 1.05,
          1.25,
        );
        camera.position.set(cameraTarget.x, cameraTarget.y + 0.05, cameraTarget.z + distance);
        camera.lookAt(cameraTarget);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        if (humanizerRef.current) {
          humanizerRef.current.saccade.bindLookAt();
        } else if (vrm.lookAt) {
          vrm.lookAt.autoUpdate = true;
          vrm.lookAt.target = camera;
        }
      };

      const rememberPose = (vrm: VRM): Pose => {
        const humanoid = vrm.humanoid as
          | (NonNullable<VRM["humanoid"]> & { autoUpdateHumanBones?: boolean })
          | null;
        if (humanoid) humanoid.autoUpdateHumanBones = false;
        const node = (name: Parameters<NonNullable<VRM["humanoid"]>["getNormalizedBoneNode"]>[0]) =>
          humanoid?.getNormalizedBoneNode(name) ?? null;
        const raw = (name: Parameters<NonNullable<VRM["humanoid"]>["getRawBoneNode"]>[0]) =>
          humanoid?.getRawBoneNode(name) ?? null;
        const hung: HungBone[] = [];
        const keep = (
          name: Parameters<NonNullable<VRM["humanoid"]>["getNormalizedBoneNode"]>[0],
          goal: import("three").Vector3,
        ) => {
          const seen = new Set<import("three").Object3D>();
          for (const bone of [node(name), raw(name)]) {
            if (!bone || seen.has(bone)) continue;
            seen.add(bone);
            const next = hangBone(bone, goal);
            if (next) hung.push(next);
          }
        };
        vrm.scene.updateMatrixWorld(true);
        keep("leftUpperArm", new THREE.Vector3(0.16, -1, 0.06));
        keep("rightUpperArm", new THREE.Vector3(-0.16, -1, 0.06));
        vrm.scene.updateMatrixWorld(true);
        keep("leftLowerArm", new THREE.Vector3(0.04, -1, 0.02));
        keep("rightLowerArm", new THREE.Vector3(-0.04, -1, 0.02));
        const spine = node("spine") ?? raw("spine");
        const chest = node("chest") ?? raw("chest");
        const headBone = node("head") ?? raw("head");
        return {
          vrm,
          spine,
          chest,
          headBone,
          spineRestX: spine?.rotation.x ?? 0,
          spineRestY: spine?.rotation.y ?? 0,
          spineRestZ: spine?.rotation.z ?? 0,
          chestRestX: chest?.rotation.x ?? 0,
          chestRestY: chest?.rotation.y ?? 0,
          chestRestZ: chest?.rotation.z ?? 0,
          headRestX: headBone?.rotation.x ?? 0,
          headRestY: headBone?.rotation.y ?? 0,
          headRestZ: headBone?.rotation.z ?? 0,
          hung,
        };
      };

      const swap = async (url: string): Promise<boolean> => {
        if (loadedUrl === url && poseRef.current) {
          setPhaseRef.current("ready");
          return true;
        }
        const gen = ++loadGen;
        const replacing = poseRef.current != null;
        setPhaseRef.current("loading");
        if (replacing) canvas.style.opacity = "0";
        try {
          const vrm = await loadIdolVrm(loader, url);
          if (!alive || gen !== loadGen) {
            disposeIdolVrm(vrm);
            return false;
          }
          if (poseRef.current) disposeIdolVrm(poseRef.current.vrm);
          humanizerRef.current?.dispose();
          humanizerRef.current = null;
          scene.add(vrm.scene);
          shown.current = vrm;
          poseRef.current = rememberPose(vrm);
          humanizerRef.current = VrmHumanizerRuntime.attach(vrm, characterIdRef.current, camera);
          humanizerRef.current.setThinking(thinkingRef.current);
          if (isChloeCharacter(characterIdRef.current)) setupChloeDrunkState(vrm);
          loadedUrl = url;
          frameCamera(vrm);
          renderer.render(scene, camera);
          host.dataset.vrmReady = "1";
          delete host.dataset.vrmFailed;
          requestAnimationFrame(() => {
            canvas.style.opacity = "1";
          });
          setPhaseRef.current("ready");
          return true;
        } catch {
          if (alive && gen === loadGen) {
            canvas.style.opacity = "1";
            if (!poseRef.current) host.dataset.vrmFailed = "1";
            setPhaseRef.current("error");
          }
          return false;
        }
      };

      swapRef.current = swap;
      armed.current = true;

      let raf = 0;
      const clock = new THREE.Clock();

      const loop = () => {
        const dt = Math.min(clock.getDelta(), 0.05);
        const pose = poseRef.current;
        const humanizer = humanizerRef.current;
        if (humanizer) {
          humanizer.setCharacter(characterIdRef.current);
          humanizer.setThinking(thinkingRef.current);
          humanizer.setSpeaking(lip.active);
        }

        let aa = 0;
        const bins = lip.bins;
        if (lip.active && lip.pulse != null) {
          aa = lip.pulse;
        } else if (lip.active && lip.analyser && bins) {
          lip.analyser.getByteFrequencyData(bins);
          let sum = 0;
          for (let i = 0; i < bins.length; i += 1) sum += bins[i] ?? 0;
          // Edge-TTS speech sits lower in the analyser than a studio WAV. /40 reaches aa.
          aa = Math.min(sum / bins.length / 40, 1);
        }
        humanizer?.setRms(aa);

        camera.lookAt(cameraTarget);
        camera.updateMatrixWorld(true);
        const vrm = pose?.vrm;
        if (vrm) {
          humanizer?.beforeVrmUpdate(dt, camera);
          vrm.humanoid?.update();
          vrm.update(dt);
          if (pose) {
            for (const arm of pose.hung) arm.bone.quaternion.copy(arm.quat);
            vrm.scene.updateMatrixWorld(true);
          }
          const face = humanizer?.afterVrmUpdate(dt);
          vrm.humanoid?.update();
          const expressions = vrm.expressionManager;
          if (expressions) {
            expressions.setValue("blink", face?.blink ?? 0);
            applyVrmMouth(vrm, aa);
            setVrmEmotion(vrm, lip.active ? lip.emotion : "neutral");
            if (!lip.active && isChloeCharacter(characterIdRef.current)) {
              setupChloeDrunkState(vrm);
            }
            if (face && face.joy > 0) {
              if (expressions.getExpression("joy")) expressions.setValue("joy", face.joy);
              if (expressions.getExpression("happy")) expressions.setValue("happy", face.joy);
            }
            expressions.update();
          }
        }
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };

      canvas.style.transition = "opacity 280ms ease";
      canvas.style.opacity = "0";
      renderer.render(scene, camera);
      host.appendChild(canvas);
      raf = requestAnimationFrame(loop);
      void swap(urlRef.current).then((ok) => {
        if (alive && ok) host.dataset.vrmReady = "1";
      });

      dispose = () => {
        cancelAnimationFrame(raf);
        loadGen += 1;
        shown.current = null;
        humanizerRef.current?.dispose();
        humanizerRef.current = null;
        if (poseRef.current) disposeIdolVrm(poseRef.current.vrm);
        ro.disconnect();
        env.dispose();
        pmrem.dispose();
        renderer.dispose();
        canvas.remove();
      };
    })().catch(() => {
      if (hostRef.current) hostRef.current.dataset.vrmFailed = "1";
    });

    return () => {
      alive = false;
      stopVoice();
      void audioCtx?.close();
      voiceRef.current = {
        prime() {},
        playVoice: async () => {},
        speakText: async () => {},
        stopVoice() {},
        changeClothing() {},
        setThinking() {},
      };
      dispose();
    };
  }, [framing, backdropUrl]);

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-0 bg-cover bg-center"
      style={backdropUrl ? { backgroundImage: `url(${backdropUrl})` } : undefined}
    >
      {phase === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-white/25 border-t-white" />
        </div>
      ) : null}
    </div>
  );
}

export const MocoVrmStage = memo(MocoVrmStageView);
