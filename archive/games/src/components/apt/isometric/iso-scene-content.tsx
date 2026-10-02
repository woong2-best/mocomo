"use client";

import { OrthographicCamera } from "@react-three/drei";
import type { BondeePlacedItem } from "@/lib/apt/bondee/types";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import type { IsoSceneProps } from "@/lib/apt/isometric/types";
import { ISO_CAMERA_APT, ISO_CAMERA_ROOM } from "@/lib/apt/isometric/camera";
import { IsoCameraRig } from "./iso-camera-rig";
import { IsoHomeMeshes, IsoPlacementGrid } from "./iso-home-meshes";
import { IsoSceneInteraction } from "./iso-scene-interaction";
import {
  BondeeContactShadowPlane,
  BondeeSceneLighting,
} from "@/components/apt/style/bondee-scene-lighting";

export function IsoSceneContent({
  rooms,
  items,
  activeRoomId,
  view,
  editMode,
  selectedItemId,
  placingKind,
  cameraZoom,
  allowEdit,
  onRoomClick,
  onItemSelect,
  onPlaceAtGrid,
  shellOnly = false,
  structureRooms = false,
}: IsoSceneProps) {
  const preset = view === "apartment" ? ISO_CAMERA_APT : ISO_CAMERA_ROOM;
  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? null;
  const shellRooms = structureRooms
    ? rooms.filter((r) => r.type !== "balcony")
    : rooms.filter((r) => r.type !== "hall" && r.type !== "balcony");
  const decorRooms = rooms.filter((r) => r.type !== "hall" && r.type !== "balcony");

  return (
    <>
      <OrthographicCamera makeDefault position={preset.position} near={0.1} far={100} />
      <IsoCameraRig view={view} cameraZoom={cameraZoom} activeRoom={activeRoom} />
      <BondeeSceneLighting />

      <IsoHomeMeshes
        rooms={shellRooms}
        items={items}
        view={view}
        activeRoomId={activeRoomId}
        selectedItemId={selectedItemId}
        highlightRoomId={view === "room" ? activeRoomId : null}
        shellOnly={shellOnly}
        structureRooms={structureRooms}
      />

      {editMode && activeRoom && allowEdit && <IsoPlacementGrid room={activeRoom} />}

      <IsoSceneInteraction
        rooms={decorRooms}
        activeRoomId={activeRoomId}
        editMode={editMode}
        placingKind={placingKind}
        allowEdit={allowEdit}
        onRoomClick={onRoomClick}
        onPlaceAtGrid={onPlaceAtGrid}
        onItemSelect={onItemSelect}
      />

      <BondeeContactShadowPlane width={20} depth={14} />
    </>
  );
}
