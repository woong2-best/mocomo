"use client";

import { OrthographicCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { DOLLHOUSE_CAMERA, scaledFrustum } from "@/lib/apt/isometric/camera";
import {
  BondeeContactShadowPlane,
  BondeeSceneLighting,
} from "@/components/apt/style/bondee-scene-lighting";
import { IsoDollhouseMeshes } from "./iso-dollhouse-meshes";
import { IsoDollhouseInteraction } from "./iso-dollhouse-interaction";

function DollhouseCameraRig({ cameraZoom }: { cameraZoom: number }) {
  const { camera, size } = useThree();
  const target = useMemo(() => new THREE.Vector3(...DOLLHOUSE_CAMERA.target), []);

  useFrame(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    const aspect = Math.max(size.width, 1) / Math.max(size.height, 1);
    const fr = scaledFrustum(DOLLHOUSE_CAMERA.frustum, cameraZoom);
    camera.position.set(...DOLLHOUSE_CAMERA.position);
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

export function DollhouseSceneContent({
  rooms,
  highlightRoomId,
  clickableRoomIds,
  cameraZoom,
  onRoomClick,
  onRoomHover,
}: {
  rooms: AptRoom[];
  highlightRoomId: string | null;
  clickableRoomIds: Set<string>;
  cameraZoom: number;
  onRoomClick: (roomId: string) => void;
  onRoomHover: (roomId: string | null) => void;
}) {
  return (
    <>
      <OrthographicCamera makeDefault position={DOLLHOUSE_CAMERA.position} near={0.1} far={100} />
      <DollhouseCameraRig cameraZoom={cameraZoom} />
      <BondeeSceneLighting />

      <IsoDollhouseMeshes rooms={rooms} highlightRoomId={highlightRoomId} />

      <IsoDollhouseInteraction
        onRoomClick={onRoomClick}
        onRoomHover={onRoomHover}
        clickableRoomIds={clickableRoomIds}
      />

      <BondeeContactShadowPlane />
    </>
  );
}
