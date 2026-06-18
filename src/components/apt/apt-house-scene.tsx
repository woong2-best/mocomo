"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function AptHouseScene({
  lat,
  lng,
  footprintUnits,
  regionLabel,
}: {
  lat: number;
  lng: number;
  footprintUnits: number;
  regionLabel: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87c8f0);
    scene.fog = new THREE.Fog(0x87c8f0, 30, 90);

    const w = Math.max(mount.clientWidth, 320);
    const h = Math.max(mount.clientHeight, 400);
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 200);
    camera.position.set(14, 10, 14);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.target.set(0, 0.5, 0);

    scene.add(new THREE.AmbientLight(0xfff8f0, 0.65));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.1);
    sun.position.set(8, 14, 6);
    sun.castShadow = true;
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x5a9e4a, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const plot = new THREE.Mesh(
      new THREE.BoxGeometry(footprintUnits, 0.15, footprintUnits),
      new THREE.MeshStandardMaterial({ color: 0xc9a66b, roughness: 0.85 })
    );
    plot.position.y = 0.08;
    plot.castShadow = true;
    plot.receiveShadow = true;
    scene.add(plot);

    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 1.2, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x4a3728 })
    );
    post.position.set(footprintUnits * 0.42, 0.75, footprintUnits * 0.42);
    scene.add(post);

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.7, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xf5f0e6 })
    );
    board.position.set(footprintUnits * 0.42, 1.35, footprintUnits * 0.42);
    scene.add(board);

    const grid = new THREE.GridHelper(footprintUnits, 8, 0x8b7355, 0xa08060);
    grid.position.y = 0.16;
    scene.add(grid);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    const onResize = () => {
      const rw = mount.clientWidth;
      const rh = mount.clientHeight;
      if (!rw || !rh) return;
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => m.dispose());
        }
      });
    };
  }, [footprintUnits, lat, lng, regionLabel]);

  return (
    <div className="relative min-h-[min(70dvh,640px)]">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/30 bg-black/35 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
        주택 부지 · {regionLabel || `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`}
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-[10px] text-white/90 backdrop-blur-sm text-center">
        GTA5급 주택 건설·도시 환경은 순차 업데이트 예정 · 드래그 회전 · 휠 확대
      </div>
    </div>
  );
}
