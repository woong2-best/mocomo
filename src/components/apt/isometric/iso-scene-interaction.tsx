"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { roomCenter } from "@/lib/apt/building-from-plan";

const ITEM_GRID = 0.38;

export function IsoSceneInteraction({
  rooms,
  activeRoomId,
  editMode,
  placingKind,
  allowEdit,
  onRoomClick,
  onPlaceAtGrid,
  onItemSelect,
}: {
  rooms: AptRoom[];
  activeRoomId: string | null;
  editMode: boolean;
  placingKind: string | null;
  allowEdit: boolean;
  onRoomClick: (roomId: string) => void;
  onPlaceAtGrid: (roomId: string, gx: number, gz: number) => void;
  onItemSelect: (itemId: string | null) => void;
}) {
  const { camera, scene, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);

  const handlePointer = useCallback(
    (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const hits = raycaster.intersectObjects(scene.children, true);
      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (obj.userData.placedId) {
            if (editMode) onItemSelect(String(obj.userData.placedId));
            return;
          }
          if (obj.userData.roomId && obj.name?.startsWith("floor-")) {
            const roomId = String(obj.userData.roomId);
            if (editMode && placingKind && allowEdit && activeRoomId === roomId) {
              const room = rooms.find((r) => r.id === roomId);
              if (room) {
                const c = roomCenter(room);
                const gx = Math.round((hit.point.x - c.x) / ITEM_GRID);
                const gz = Math.round((hit.point.z - c.z) / ITEM_GRID);
                onPlaceAtGrid(roomId, gx, gz);
              }
            } else if (!editMode) {
              onRoomClick(roomId);
            }
            return;
          }
          obj = obj.parent;
        }
      }
      if (editMode) onItemSelect(null);
    },
    [
      gl.domElement,
      pointer,
      raycaster,
      camera,
      scene.children,
      editMode,
      placingKind,
      allowEdit,
      activeRoomId,
      rooms,
      onRoomClick,
      onPlaceAtGrid,
      onItemSelect,
    ]
  );

  useEffect(() => {
    const el = gl.domElement;
    el.addEventListener("pointerup", handlePointer);
    return () => el.removeEventListener("pointerup", handlePointer);
  }, [gl.domElement, handlePointer]);

  return null;
}
