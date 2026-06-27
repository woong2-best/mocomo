"use client";

import { OrthographicCamera } from "@react-three/drei";
import type { BondeePlacedItem } from "@/lib/apt/bondee/types";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import type { IsoSceneProps } from "@/lib/apt/isometric/types";
import { ISO_CAMERA_APT, ISO_CAMERA_ROOM, scaledZoom } from "@/lib/apt/isometric/camera";
import { IsoCameraRig, IsoLighting } from "./iso-camera-rig";
import { IsoHomeMeshes, IsoPlacementGrid } from "./iso-home-meshes";
import { IsoSceneInteraction } from "./iso-scene-interaction";

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
}: IsoSceneProps) {
  const preset = view === "apartment" ? ISO_CAMERA_APT : ISO_CAMERA_ROOM;
  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? null;
  const decorRooms = rooms.filter((r) => r.type !== "hall" && r.type !== "balcony");

  return (
    <>
      <OrthographicCamera
        makeDefault
        position={preset.position}
        zoom={scaledZoom(preset.zoom, cameraZoom)}
        near={0.1}
        far={100}
      />
      <IsoCameraRig view={view} cameraZoom={cameraZoom} activeRoom={activeRoom} />
      <IsoLighting />

      <IsoHomeMeshes
        rooms={decorRooms}
        items={items}
        view={view}
        activeRoomId={activeRoomId}
        selectedItemId={selectedItemId}
        highlightRoomId={view === "room" ? activeRoomId : null}
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

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[20, 14]} />
        <shadowMaterial transparent opacity={0.12} />
      </mesh>
    </>
  );
}
