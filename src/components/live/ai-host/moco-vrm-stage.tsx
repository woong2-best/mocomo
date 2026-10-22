"use client";

import { useEffect, useRef } from "react";

const VRM_URL = "/avatars/default.vrm";

/** The same default VRM used by early live studio and APT. No chat. */
export function MocoVrmStage({ framing = "bust" }: { framing?: "bust" | "stage" }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let alive = true;
    let dispose = () => {};

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

      const vrm = gltf.userData.vrm;
      VRMUtils.removeUnnecessaryVertices(vrm.scene);
      const utils = VRMUtils as { combineSkeletons?: (root: unknown) => void };
      utils.combineSkeletons?.(vrm.scene);
      VRMUtils.rotateVRM0(vrm);
      vrm.scene.traverse((obj: { frustumCulled: boolean }) => {
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

      const spine = vrm.humanoid?.getNormalizedBoneNode("spine");
      const chest = vrm.humanoid?.getNormalizedBoneNode("chest");
      const spineRestX = spine?.rotation.x ?? 0;
      const spineRestY = spine?.rotation.y ?? 0;
      const chestRestX = chest?.rotation.x ?? 0;
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
        const now = performance.now();
        const t = now / 1000;
        if (!reduced) {
          if (spine) {
            spine.rotation.x = spineRestX + Math.sin(t * 0.9) * 0.012;
            spine.rotation.y = spineRestY + Math.sin(t * 0.35) * 0.018;
          }
          if (chest) chest.rotation.x = chestRestX + Math.sin(t * 1.6) * 0.015;
        }
        camera.updateMatrixWorld(true);
        const expressions = vrm.expressionManager;
        if (expressions) {
          if (!blinking && now >= blinkAt) {
            blinking = true;
            blinkUntil = now + 110;
          }
          if (blinking && now >= blinkUntil) {
            blinking = false;
            blinkAt = now + 2000 + Math.random() * 2600;
          }
        }
        vrm.update(dt);
        if (expressions) {
          expressions.setValue("blink", blinking ? 1 : 0);
          expressions.setValue("happy", 0.08);
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
      dispose();
    };
  }, [framing]);

  return <div ref={hostRef} className="pointer-events-none absolute inset-0" />;
}
