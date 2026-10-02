"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { cappedPixelRatio } from "@/lib/apt/bondee/scene-perf";
import { BONDEE_LIGHTING } from "@/lib/apt/style/bondee-lighting-bible";

function shadowMapSize(): number {
  if (typeof window === "undefined") return BONDEE_LIGHTING.sun.shadow.mapSize;
  return cappedPixelRatio() >= 1.5
    ? BONDEE_LIGHTING.sun.shadow.mapSize
    : BONDEE_LIGHTING.sun.shadow.mobileMapSize;
}

/** Bondee Lighting Bible — Dollhouse · Iso 공용 */
export function BondeeSceneLighting() {
  const L = BONDEE_LIGHTING;
  const mapSize = useMemo(() => shadowMapSize(), []);

  return (
    <>
      <ambientLight intensity={L.ambient.intensity} color={L.ambient.colorHex} />
      <hemisphereLight
        args={[L.hemisphere.sky, L.hemisphere.ground, L.hemisphere.intensity]}
      />
      <directionalLight
        castShadow
        position={L.sun.position}
        intensity={L.sun.intensity}
        color={L.sun.colorHex}
        shadow-mapSize={[mapSize, mapSize]}
        shadow-bias={L.sun.shadow.bias}
        shadow-radius={L.sun.shadow.radius}
        shadow-camera-near={0.5}
        shadow-camera-far={22}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />
      <directionalLight
        position={L.fill.position}
        intensity={L.fill.intensity}
        color={L.fill.color}
      />
      <directionalLight
        position={L.rim.position}
        intensity={L.rim.intensity}
        color={L.rim.colorHex}
      />
      <directionalLight
        position={[0, -1, 0]}
        intensity={L.bounce.intensity}
        color={L.bounce.colorHex}
      />
    </>
  );
}

/** 바닥 contact shadow plane */
export function BondeeContactShadowPlane({
  width = 14,
  depth = 10,
  opacity = 0.14,
}: {
  width?: number;
  depth?: number;
  opacity?: number;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <shadowMaterial transparent opacity={opacity} />
    </mesh>
  );
}
