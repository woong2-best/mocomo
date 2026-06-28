import type { BondeeFurnitureKind, BondeePlacedItem } from "@/lib/apt/bondee/types";
import type { AptRoom } from "@/lib/apt/floor-plan-types";

/** APT game isometric renderer view modes */
export type IsoViewMode = "apartment" | "room";

export type IsoCameraPreset = {
  position: [number, number, number];
  /** Orthographic half-height in world units (see isometric-home-scene frustum) */
  frustum: number;
  target: [number, number, number];
};

export type IsoSceneProps = {
  rooms: AptRoom[];
  items: BondeePlacedItem[];
  activeRoomId: string | null;
  view: IsoViewMode;
  editMode: boolean;
  selectedItemId: string | null;
  placingKind: BondeeFurnitureKind | null;
  cameraZoom: number;
  allowEdit: boolean;
  onRoomClick: (roomId: string) => void;
  onItemSelect: (itemId: string | null) => void;
  onPlaceAtGrid: (roomId: string, gx: number, gz: number) => void;
  onRotateSelected: () => void;
  onDeleteSelected: () => void;
  /** Empty structure — floors/walls only, no furniture */
  shellOnly?: boolean;
  /** Include hall/entrance in 3D shell (overview dollhouse) */
  structureRooms?: boolean;
};

export type IsoLayoutSnapshot = {
  items: BondeePlacedItem[];
  rooms: AptRoom[];
};
