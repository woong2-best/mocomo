"use client";

import { memo, Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { DH } from "@/lib/apt/bondee/dollhouse-shell";
import { cappedPixelRatio } from "@/lib/apt/bondee/scene-perf";
import { DollhouseSceneContent } from "./dollhouse-scene-content";

function hexBg(c: number) {
  return `#${c.toString(16).padStart(6, "0")}`;
}

function DollhouseCanvasInner({
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
  const glConfig = useMemo(
    () => ({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance" as WebGLPowerPreference,
    }),
    []
  );

  const bg = hexBg(DH.bg);

  return (
    <div className="dollhouse-canvas-root absolute inset-0 touch-none">
      <Canvas
        shadows
        dpr={[1, cappedPixelRatio()]}
        gl={glConfig}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.98;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <color attach="background" args={[bg]} />
        <fog attach="fog" args={[bg, 32, 58]} />
        <Suspense fallback={null}>
          <DollhouseSceneContent
            rooms={rooms}
            highlightRoomId={highlightRoomId}
            clickableRoomIds={clickableRoomIds}
            cameraZoom={cameraZoom}
            onRoomClick={onRoomClick}
            onRoomHover={onRoomHover}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

export const DollhouseCanvas = memo(DollhouseCanvasInner);
