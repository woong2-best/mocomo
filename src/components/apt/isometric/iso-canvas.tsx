"use client";

import { memo, Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { cappedPixelRatio } from "@/lib/apt/bondee/scene-perf";
import type { IsoSceneProps } from "@/lib/apt/isometric/types";
import { IsoSceneContent } from "./iso-scene-content";

function IsoCanvasInner(props: IsoSceneProps) {
  const glConfig = useMemo(
    () => ({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance" as WebGLPowerPreference,
    }),
    []
  );

  return (
    <div className="iso-canvas-root absolute inset-0 touch-none">
      <Canvas
        shadows
        dpr={[1, cappedPixelRatio()]}
        gl={glConfig}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <color attach="background" args={["#e8dfd4"]} />
        <fog attach="fog" args={["#e8dfd4", 14, 28]} />
        <Suspense fallback={null}>
          <IsoSceneContent {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export const IsoCanvas = memo(IsoCanvasInner);
