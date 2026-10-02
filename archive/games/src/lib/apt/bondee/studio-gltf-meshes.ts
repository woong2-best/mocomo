"use client";

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const cache = new Map<string, Promise<THREE.Group>>();

function fitToGrid(group: THREE.Group, targetSize = 0.55) {
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const s = targetSize / maxDim;
  group.scale.setScalar(s);
  const center = box.getCenter(new THREE.Vector3());
  group.position.sub(center.multiplyScalar(s));
  group.position.y += (size.y * s) / 2;
}

/** 텍스처 로딩이 실패해도 검게 보이지 않도록 머티리얼을 보정한다. */
function sanitizeMaterials(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      const std = mat as THREE.MeshStandardMaterial;
      // 맵이 없는데 베이스 색이 거의 검정이면 보이도록 밝은 회색으로 대체.
      if (!std.map && std.color && std.color.r < 0.04 && std.color.g < 0.04 && std.color.b < 0.04) {
        std.color.setHex(0xb8b8c0);
        std.needsUpdate = true;
      }
    }
  });
}

export function loadStudioGltf(url: string): Promise<THREE.Group> {
  const cached = cache.get(url);
  if (cached) return cached.then((g) => g.clone(true));

  const promise = new Promise<THREE.Group>((resolve, reject) => {
    const loader = new GLTFLoader();
    // 상대 텍스처(예: 단순 uuid)가 사이트 루트(mocomo.net/uuid)로 잘못
    // 풀려 404 나는 것을 막기 위해, GLB 위치 기준 경로를 리소스 경로로 지정.
    const slash = url.lastIndexOf("/");
    if (slash >= 0) loader.setResourcePath(url.slice(0, slash + 1));
    loader.load(
      url,
      (gltf) => {
        const root = gltf.scene;
        sanitizeMaterials(root);
        fitToGrid(root);
        resolve(root);
      },
      undefined,
      reject
    );
  });
  cache.set(url, promise);
  return promise.then((g) => g.clone(true));
}

export function hydrateStudioGltfMeshes(root: THREE.Object3D) {
  const pending: Promise<void>[] = [];

  root.traverse((obj) => {
    const url = obj.userData.studioGlbUrl as string | undefined;
    const placedId = obj.userData.placedId as string | undefined;
    if (!url || !placedId || obj.userData.studioHydrated) return;

    obj.userData.studioHydrated = true;
    const parent = obj.parent;
    if (!parent) return;

    const pos = obj.position.clone();
    const rot = obj.rotation.y;
    const roomId = obj.userData.roomId;

    pending.push(
      loadStudioGltf(url)
        .then((model) => {
          model.userData.placedId = placedId;
          model.userData.roomId = roomId;
          model.position.copy(pos);
          model.rotation.y = rot;
          parent.remove(obj);
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => m.dispose());
          }
          parent.add(model);
        })
        .catch(() => {})
    );
  });

  return Promise.all(pending);
}

export function studioPlaceholderMesh(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.35, 0.35),
    new THREE.MeshStandardMaterial({ color: 0xffb6d9, transparent: true, opacity: 0.65 })
  );
  mesh.position.y = 0.175;
  return mesh;
}
