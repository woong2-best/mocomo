"use client";

import { OrthographicCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { DOLLHOUSE_CAMERA, scaledFrustum } from "@/lib/apt/isometric/camera";
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

function DollhouseLighting() {
  return (
    <>
      <ambientLight intensity={0.58} color="#fffaf5" />
      <hemisphereLight args={["#fff8f0", "#d4c8b8", 0.42]} />
      <directionalLight
        castShadow
        position={[-4.5, 11, 2.5]}
        intensity={0.92}
        color="#fff5eb"
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
        shadow-camera-near={0.5}
        shadow-camera-far={22}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />
      <directionalLight position={[5, 4, -5]} intensity={0.16} color="#c8d4e8" />
      <directionalLight position={[0, 8, 6]} intensity={0.12} color="#ffe8d0" />
    </>
  );
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
      <DollhouseLighting />

      <IsoDollhouseMeshes rooms={rooms} highlightRoomId={highlightRoomId} />

      <IsoDollhouseInteraction
        onRoomClick={onRoomClick}
        onRoomHover={onRoomHover}
        clickableRoomIds={clickableRoomIds}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
        <planeGeometry args={[14, 10]} />
        <shadowMaterial transparent opacity={0.14} />
      </mesh>
    </>
  );
}
