"use client";

import { memo, Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { cappedPixelRatio } from "@/lib/apt/bondee/scene-perf";
import type { IsoSceneProps } from "@/lib/apt/isometric/types";
import {
  applyBondeeRenderer,
  bondeeBackgroundHex,
  bondeeFogArgs,
} from "@/lib/apt/style/bondee-renderer-config";
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

  const [fogColor, fogNear, fogFar] = bondeeFogArgs();

  return (
    <div className="iso-canvas-root apt-bondee-world absolute inset-0 touch-none">
      <Canvas
        shadows
        dpr={[1, cappedPixelRatio()]}
        gl={glConfig}
        onCreated={({ gl }) => {
          applyBondeeRenderer(gl);
        }}
      >
        <color attach="background" args={[bondeeBackgroundHex()]} />
        <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
        <Suspense fallback={null}>
          <IsoSceneContent {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export const IsoCanvas = memo(IsoCanvasInner);
