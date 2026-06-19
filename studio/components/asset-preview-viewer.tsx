"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Props = {
  url: string;
  className?: string;
  onStats?: (stats: { polygonCount: number; textureMaxSize: number }) => void;
};

export function AssetPreviewViewer({ url, className, onStats }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !url) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfef6f8);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
    camera.position.set(1.8, 1.2, 2.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.4, 0);

    const hemi = new THREE.HemisphereLight(0xfff0f5, 0xc8d8ff, 1.1);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(2, 4, 3);
    scene.add(key);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 48),
      new THREE.MeshStandardMaterial({ color: 0xf5e8ef, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);

    let model: THREE.Group | null = null;
    let disposed = false;
    const loader = new GLTFLoader();

    loader.load(
      url,
      (gltf) => {
        if (disposed) return;
        model = gltf.scene;
        scene.add(model);

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.position.y += size.y / 2;

        const maxDim = Math.max(size.x, size.y, size.z, 0.01);
        camera.position.set(maxDim * 1.4, maxDim * 0.9, maxDim * 1.6);
        controls.target.set(0, size.y / 2, 0);
        controls.update();

        let polygonCount = 0;
        let textureMaxSize = 0;
        model.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            const geo = mesh.geometry;
            if (geo.index) polygonCount += geo.index.count / 3;
            else if (geo.attributes.position) polygonCount += geo.attributes.position.count / 3;

            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const mat of mats) {
              if (!mat) continue;
              for (const key of ["map", "normalMap", "roughnessMap", "metalnessMap"] as const) {
                const tex = (mat as THREE.MeshStandardMaterial)[key];
                if (tex?.image) {
                  const img = tex.image as { width?: number; height?: number };
                  const w = img.width ?? 0;
                  const h = img.height ?? 0;
                  textureMaxSize = Math.max(textureMaxSize, w, h);
                }
              }
            }
          }
        });
        onStats?.({ polygonCount: Math.round(polygonCount), textureMaxSize });
      },
      undefined,
      () => {}
    );

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight || 320;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (model) {
        model.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            mesh.geometry?.dispose();
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => m?.dispose());
          }
        });
      }
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [url, onStats]);

  return (
    <div
      ref={mountRef}
      className={className ?? "h-[320px] w-full overflow-hidden rounded-xl border border-border bg-[#fef6f8]"}
    />
  );
}
