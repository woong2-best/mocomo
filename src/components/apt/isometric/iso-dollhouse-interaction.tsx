"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { AptRoom } from "@/lib/apt/floor-plan-types";

export function IsoDollhouseInteraction({
  onRoomClick,
  onRoomHover,
  clickableRoomIds,
}: {
  onRoomClick: (roomId: string) => void;
  onRoomHover: (roomId: string | null) => void;
  clickableRoomIds: Set<string>;
}) {
  const { camera, scene, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  const lastHover = useMemo(() => ({ id: null as string | null }), []);

  const pickRoom = useCallback(
    (clientX: number, clientY: number): string | null => {
      const rect = gl.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const hits = raycaster.intersectObjects(scene.children, true);
      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (obj.userData.roomId && obj.name?.startsWith("floor-")) {
            return String(obj.userData.roomId);
          }
          obj = obj.parent;
        }
      }
      return null;
    },
    [camera, gl.domElement, pointer, raycaster, scene.children]
  );

  const handleMove = useCallback(
    (e: PointerEvent) => {
      const roomId = pickRoom(e.clientX, e.clientY);
      if (roomId === lastHover.id) return;
      lastHover.id = roomId;
      onRoomHover(roomId && clickableRoomIds.has(roomId) ? roomId : null);
      gl.domElement.style.cursor =
        roomId && clickableRoomIds.has(roomId) ? "pointer" : "default";
    },
    [pickRoom, lastHover, onRoomHover, clickableRoomIds, gl.domElement]
  );

  const handleUp = useCallback(
    (e: PointerEvent) => {
      const roomId = pickRoom(e.clientX, e.clientY);
      if (roomId && clickableRoomIds.has(roomId)) onRoomClick(roomId);
    },
    [pickRoom, onRoomClick, clickableRoomIds]
  );

  const handleLeave = useCallback(() => {
    lastHover.id = null;
    onRoomHover(null);
    gl.domElement.style.cursor = "default";
  }, [lastHover, onRoomHover, gl.domElement]);

  useEffect(() => {
    const el = gl.domElement;
    el.addEventListener("pointermove", handleMove);
    el.addEventListener("pointerup", handleUp);
    el.addEventListener("pointerleave", handleLeave);
    return () => {
      el.removeEventListener("pointermove", handleMove);
      el.removeEventListener("pointerup", handleUp);
      el.removeEventListener("pointerleave", handleLeave);
      el.style.cursor = "default";
    };
  }, [gl.domElement, handleMove, handleUp, handleLeave]);

  return null;
}
