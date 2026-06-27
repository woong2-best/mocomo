"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { ISO_CAMERA_APT, ISO_CAMERA_ROOM, scaledZoom } from "@/lib/apt/isometric/camera";
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
  const { camera } = useThree();
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
    camera.position.set(...preset.position);
    camera.zoom = scaledZoom(preset.zoom, cameraZoom);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  });

  return null;
}

export function IsoLighting() {
  return (
    <>
      <ambientLight intensity={0.55} color="#fff8f0" />
      <hemisphereLight args={["#fff4e6", "#c9b89a", 0.45]} />
      <directionalLight
        castShadow
        position={[6, 10, 4]}
        intensity={1.15}
        color="#fffaf5"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[-4, 6, -3]} intensity={0.25} color="#d4e8ff" />
    </>
  );
}
