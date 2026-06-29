"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { ISO_CAMERA_APT, ISO_CAMERA_ROOM, scaledFrustum } from "@/lib/apt/isometric/camera";
import type { IsoViewMode } from "@/lib/apt/isometric/types";
import { roomCenter } from "@/lib/apt/building-from-plan";
import type { AptRoom } from "@/lib/apt/floor-plan-types";

export function IsoCameraRig({
  view,
  cameraZoom,
  activeRoom,
}: {
  view: IsoViewMode;
  cameraZoom: number;
  activeRoom: AptRoom | null;
}) {
  const { camera, size } = useThree();
  const preset = view === "apartment" ? ISO_CAMERA_APT : ISO_CAMERA_ROOM;

  const target = useMemo(() => {
    if (view === "room" && activeRoom) {
      const c = roomCenter(activeRoom);
      return new THREE.Vector3(c.x, 0.35, c.z);
    }
    return new THREE.Vector3(...preset.target);
  }, [view, activeRoom, preset.target]);

  useFrame(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    const aspect = Math.max(size.width, 1) / Math.max(size.height, 1);
    const fr = scaledFrustum(preset.frustum, cameraZoom);
    camera.position.set(...preset.position);
    camera.left = (-fr * aspect) / 2;
    camera.right = (fr * aspect) / 2;
    camera.top = fr / 2;
    camera.bottom = -fr / 2;
    camera.zoom = 1;
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  });

  return null;
}

/** @deprecated use BondeeSceneLighting */
export { BondeeSceneLighting as IsoLighting } from "@/components/apt/style/bondee-scene-lighting";
