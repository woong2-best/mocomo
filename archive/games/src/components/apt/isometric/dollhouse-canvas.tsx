"use client";

import { memo, Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { cappedPixelRatio } from "@/lib/apt/bondee/scene-perf";
import {
  applyBondeeRenderer,
  bondeeBackgroundHex,
  bondeeFogArgs,
} from "@/lib/apt/style/bondee-renderer-config";
import { DollhouseSceneContent } from "./dollhouse-scene-content";

function DollhouseCanvasInner({
  rooms,
  highlightRoomId,
  clickableRoomIds,
  cameraZoom,
  onRoomClick,
  onRoomHover,
  onCanvasError,
}: {
  rooms: AptRoom[];
  highlightRoomId: string | null;
  clickableRoomIds: Set<string>;
  cameraZoom: number;
  onRoomClick: (roomId: string) => void;
  onRoomHover: (roomId: string | null) => void;
  onCanvasError?: (message: string) => void;
}) {
  const glConfig = useMemo(
    () => ({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance" as WebGLPowerPreference,
      failIfMajorPerformanceCaveat: false,
    }),
    []
  );

  const [fogColor, fogNear, fogFar] = bondeeFogArgs();

  return (
    <div className="dollhouse-canvas-root touch-none isolate">
      <Canvas
        shadows
        dpr={[1, cappedPixelRatio()]}
        gl={glConfig}
        frameloop="always"
        resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
        onCreated={({ gl }) => {
          try {
            applyBondeeRenderer(gl);
          } catch (e) {
            onCanvasError?.(e instanceof Error ? e.message : "WebGL init failed");
          }
        }}
        onError={(e) => {
          onCanvasError?.(e instanceof Error ? e.message : "Canvas error");
        }}
      >
        <color attach="background" args={[bondeeBackgroundHex()]} />
        <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
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
