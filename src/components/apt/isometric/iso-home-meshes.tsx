"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { BondeePlacedItem } from "@/lib/apt/bondee/types";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import {
  buildHomeFloorGroup,
  disposeHomeGroup,
  fitScaleToBox,
} from "@/lib/apt/bondee/home-floor-meshes";
import { roomCenter, roomSize } from "@/lib/apt/building-from-plan";

export function IsoHomeMeshes({
  rooms,
  items,
  view,
  activeRoomId,
  selectedItemId,
  highlightRoomId,
  shellOnly = false,
  structureRooms = false,
}: {
  rooms: AptRoom[];
  items: BondeePlacedItem[];
  view: "apartment" | "room";
  activeRoomId: string | null;
  selectedItemId: string | null;
  highlightRoomId: string | null;
  shellOnly?: boolean;
  structureRooms?: boolean;
}) {
  const visibleRoomIds = useMemo(() => {
    if (view === "apartment") {
      const list = structureRooms
        ? rooms.filter((r) => r.type !== "balcony")
        : rooms.filter((r) => r.type !== "hall" && r.type !== "balcony");
      return new Set(list.map((r) => r.id));
    }
    if (activeRoomId) return new Set([activeRoomId]);
    return null;
  }, [view, rooms, activeRoomId, structureRooms]);

  const group = useMemo(() => {
    const scale = fitScaleToBox(10, 6.5);
    return buildHomeFloorGroup({
      rooms,
      items: shellOnly ? [] : items,
      scale,
      wallStyle: "dollhouse-open",
      furnitureMode: shellOnly ? "none" : "full",
      highlightRoomId,
      selectedItemId,
      visibleRoomIds,
    });
  }, [rooms, items, highlightRoomId, selectedItemId, visibleRoomIds, shellOnly]);

  useEffect(() => () => disposeHomeGroup(group), [group]);

  return <primitive object={group} />;
}

export function IsoPlacementGrid({ room }: { room: AptRoom }) {
  const { cx, cz, w, d } = useMemo(() => {
    const c = roomCenter(room);
    const s = roomSize(room);
    return { cx: c.x, cz: c.z, w: s.w, d: s.d };
  }, [room]);

  const lines = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const step = 0.38;
    const cols = Math.floor(w / step);
    const rows = Math.floor(d / step);
    const verts: number[] = [];
    const x0 = cx - w / 2 + step;
    const z0 = cz - d / 2 + step;

    for (let i = 0; i <= cols; i++) {
      const x = x0 + i * step;
      verts.push(x, 0.09, z0, x, 0.09, z0 + rows * step);
    }
    for (let j = 0; j <= rows; j++) {
      const z = z0 + j * step;
      verts.push(x0, 0.09, z, x0 + cols * step, 0.09, z);
    }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    return geo;
  }, [cx, cz, w, d]);

  useEffect(() => () => lines.dispose(), [lines]);

  return (
    <lineSegments geometry={lines}>
      <lineBasicMaterial color="#34d399" transparent opacity={0.45} />
    </lineSegments>
  );
}
