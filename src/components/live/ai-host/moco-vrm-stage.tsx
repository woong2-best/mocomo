"use client";

import type { VRM } from "@pixiv/three-vrm";
import { useEffect, useMemo, useRef } from "react";

const VRM_URL = "/avatars/default.vrm";

export type MocoStageHandle = {
  /** Create the audio graph during the click that will play speech. */
  prime: () => void;
  playVoice: (bytes: ArrayBuffer) => Promise<void>;
  stopVoice: () => void;
};

type LipSync = {
  active: boolean;
  analyser: AnalyserNode | null;
  bins: Uint8Array<ArrayBuffer> | null;
};

/**
 * Studio VRM. Idle is local requestAnimationFrame only.
 * Voice bytes are analysed here; this file never calls a model or a TTS server.
 */
export function MocoVrmStage({
  framing = "bust",
  onReady,
}: {
  framing?: "bust" | "stage";
  onReady?: (handle: MocoStageHandle | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef<MocoStageHandle>({
    prime() {},
    playVoice: async () => {},
    stopVoice() {},
  });

  const handle = useMemo<MocoStageHandle>(
    () => ({
      prime: () => voiceRef.current.prime(),
      playVoice: (bytes) => voiceRef.current.playVoice(bytes),
      stopVoice: () => voiceRef.current.stopVoice(),
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
    let source: AudioBufferSourceNode | null = null;
    let playDone: (() => void) | null = null;
    let voiceSession = 0;
    const lip: LipSync = { active: false, analyser: null, bins: null };

    const stopVoice = () => {
      voiceSession += 1;
      lip.active = false;
      lip.analyser = null;
      lip.bins = null;
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

    const playVoice = async (bytes: ArrayBuffer) => {
      stopVoice();
      const token = voiceSession;
      prime();
      if (!audioCtx || bytes.byteLength < 64) return;
      try {
        const buffer = await audioCtx.decodeAudioData(bytes.slice(0));
        if (!alive || token !== voiceSession || !audioCtx) return;
        const src = audioCtx.createBufferSource();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        src.buffer = buffer;
        src.connect(analyser);
        analyser.connect(audioCtx.destination);
        source = src;
        lip.analyser = analyser;
        lip.bins = new Uint8Array(analyser.frequencyBinCount);
        lip.active = true;
        await new Promise<void>((resolve) => {
          playDone = resolve;
          src.onended = () => {
            if (source === src) {
              lip.active = false;
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
      }
    };

    voiceRef.current = { prime, playVoice, stopVoice };

    void (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
      const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");
      const { VRMLoaderPlugin, VRMUtils } = await import("@pixiv/three-vrm");
      if (!alive || !hostRef.current) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      const canvas = renderer.domElement;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      canvas.setAttribute("aria-hidden", "true");

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x241c33);
      const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 30);

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
      const gltf = await loader.loadAsync(VRM_URL);
      if (!alive) {
        renderer.dispose();
        canvas.remove();
        pmrem.dispose();
        env.dispose();
        ro.disconnect();
        return;
      }

      const vrm = gltf.userData.vrm as VRM;
      VRMUtils.removeUnnecessaryVertices(vrm.scene);
      const utils = VRMUtils as { combineSkeletons?: (root: unknown) => void };
      utils.combineSkeletons?.(vrm.scene);
      VRMUtils.rotateVRM0(vrm);
      vrm.scene.traverse((obj) => {
        obj.frustumCulled = false;
      });
      vrm.scene.rotation.y = 0;
      scene.add(vrm.scene);
      vrm.scene.updateMatrixWorld(true);

      const head = vrm.humanoid?.getNormalizedBoneNode("head");
      const headPos = new THREE.Vector3(0, 1.45, 0);
      head?.getWorldPosition(headPos);
      const look = headPos.clone();
      look.y -= framing === "bust" ? 0.02 : 0.04;
      const distance = framing === "bust" ? 0.7 : 0.82;
      camera.position.set(look.x, look.y + 0.03, look.z + distance);
      camera.lookAt(look);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();
      if (vrm.lookAt) {
        vrm.lookAt.autoUpdate = true;
        vrm.lookAt.target = camera;
      }

      const spine = vrm.humanoid?.getRawBoneNode("spine");
      const headBone = vrm.humanoid?.getRawBoneNode("head");
      const spineRestX = spine?.rotation.x ?? 0;
      const headRestY = headBone?.rotation.y ?? 0;
      const headRestZ = headBone?.rotation.z ?? 0;
      const reduced =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.documentElement.dataset.visibleAnimations === "off";

      let blinkAt = performance.now() + 1600;
      let blinking = false;
      let blinkUntil = 0;
      let raf = 0;
      const clock = new THREE.Clock();

      const loop = () => {
        const dt = Math.min(clock.getDelta(), 0.05);
        const time = clock.elapsedTime;
        if (!reduced) {
          if (spine) spine.rotation.x = spineRestX + Math.sin(time * 2) * 0.02;
          if (headBone) {
            headBone.rotation.y = headRestY + Math.sin(time * 1.5) * 0.05;
            headBone.rotation.z = headRestZ + Math.cos(time * 1.2) * 0.02;
          }
        }

        let aa = 0;
        const bins = lip.bins;
        if (lip.active && lip.analyser && bins) {
          lip.analyser.getByteFrequencyData(bins);
          let sum = 0;
          for (let i = 0; i < bins.length; i += 1) sum += bins[i] ?? 0;
          aa = Math.min(sum / bins.length / 100, 1);
        }

        const now = performance.now();
        if (!blinking && now >= blinkAt) {
          blinking = true;
          blinkUntil = now + 110;
        }
        if (blinking && now >= blinkUntil) {
          blinking = false;
          blinkAt = now + 2000 + Math.random() * 3000;
        }

        camera.updateMatrixWorld(true);
        vrm.update(dt);
        const expressions = vrm.expressionManager;
        if (expressions) {
          expressions.setValue("blink", blinking ? 1 : 0);
          expressions.setValue("aa", aa);
          expressions.setValue("happy", aa > 0.02 ? 0 : 0.08);
          expressions.update();
        }
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      renderer.render(scene, camera);
      host.appendChild(canvas);
      host.dataset.vrmReady = "1";
      raf = requestAnimationFrame(loop);

      dispose = () => {
        cancelAnimationFrame(raf);
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
        stopVoice() {},
      };
      dispose();
    };
  }, [framing]);

  return <div ref={hostRef} className="pointer-events-none absolute inset-0" />;
}
