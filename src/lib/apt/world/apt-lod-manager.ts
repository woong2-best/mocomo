"use client";

import * as THREE from "three";

export function createLodGroup(levels: { mesh: THREE.Object3D; distance: number }[]): THREE.LOD {
  const lod = new THREE.LOD();
  for (const lv of [...levels].sort((a, b) => a.distance - b.distance)) {
    lod.addLevel(lv.mesh, lv.distance);
  }
  return lod;
}

export function cullGroupByDistance(group: THREE.Object3D, camera: THREE.Camera, maxDist: number) {
  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) && !(obj instanceof THREE.InstancedMesh)) return;
    const pos = new THREE.Vector3();
    obj.getWorldPosition(pos);
    obj.visible = camPos.distanceTo(pos) <= maxDist;
  });
}
