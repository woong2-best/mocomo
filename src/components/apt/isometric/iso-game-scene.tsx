"use client";

import dynamic from "next/dynamic";
import { memo, useCallback, useMemo, useState } from "react";
import type { BondeeFurnitureKind, BondeePlacedItem } from "@/lib/apt/bondee/types";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { mergeIsoLayout } from "@/lib/apt/isometric/default-layouts";
import { stickerIdToBondeeKind } from "@/lib/apt/isometric/catalog-map";
import type { IsoViewMode } from "@/lib/apt/isometric/types";
import { DioramaFurniturePalette } from "@/components/apt/diorama/diorama-furniture-palette";
import { IsoEditOverlay } from "@/components/apt/isometric/iso-edit-overlay";
import { useAptGameRequired } from "@/components/apt/game/apt-game-context";
import { ENERGY_COST_PLACE } from "@/lib/apt/game/energy";

const IsoCanvas = dynamic(
  () => import("./iso-canvas").then((m) => m.IsoCanvas),
  { ssr: false, loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#e8dfd4]">
      <p className="text-xs font-semibold text-[#5c4033]/70">3D 공간 불러오는 중…</p>
    </div>
  ) }
);

function newItemId(kind: BondeeFurnitureKind) {
  return `${kind}-${Date.now().toString(36)}`;
}

function IsoGameSceneInner({
  rooms,
  items,
  activeRoomId,
  view,
  editMode,
  paletteOpen,
  onPaletteOpenChange,
  cameraZoom,
  allowEdit,
  onItemsChange,
  onRoomSelect,
}: {
  rooms: AptRoom[];
  items: BondeePlacedItem[];
  activeRoomId: string | null;
  view: IsoViewMode;
  editMode: boolean;
  paletteOpen: boolean;
  onPaletteOpenChange: (open: boolean) => void;
  cameraZoom: number;
  allowEdit: boolean;
  onItemsChange: (items: BondeePlacedItem[]) => void;
  onRoomSelect: (roomId: string) => void;
}) {
  const game = useAptGameRequired();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [placingStickerId, setPlacingStickerId] = useState<string | null>(null);

  const decorRooms = useMemo(
    () => rooms.filter((r) => r.type !== "hall" && r.type !== "balcony"),
    [rooms]
  );

  const roomTypes = useMemo(
    () => new Map(decorRooms.map((r) => [r.id, r.type])),
    [decorRooms]
  );

  const layoutItems = useMemo(
    () => mergeIsoLayout(items, decorRooms.map((r) => r.id), roomTypes),
    [items, decorRooms, roomTypes]
  );

  const placingKind = placingStickerId ? stickerIdToBondeeKind(placingStickerId) : null;

  const handleRoomClick = useCallback(
    (roomId: string) => {
      game.enterRoom(roomId);
      onRoomSelect(roomId);
    },
    [game, onRoomSelect]
  );

  const handlePlaceAtGrid = useCallback(
    (roomId: string, gx: number, gz: number) => {
      if (!placingStickerId || !placingKind) return;
      if (!game.canPlaceItem(placingStickerId)) {
        game.setShopOpen(true);
        return;
      }
      if (game.game.energy < ENERGY_COST_PLACE) return;

      const placed: BondeePlacedItem = {
        id: newItemId(placingKind),
        kind: placingKind,
        roomId,
        gx,
        gz,
        rot: 0,
      };
      onItemsChange([...layoutItems, placed]);
      void game.onStickerPlaced(placingStickerId, roomId);
      setPlacingStickerId(null);
    },
    [placingStickerId, placingKind, game, layoutItems, onItemsChange]
  );

  const handleRotateSelected = useCallback(() => {
    if (!selectedItemId) return;
    onItemsChange(
      layoutItems.map((it) =>
        it.id === selectedItemId ? { ...it, rot: ((it.rot + 1) % 4) as 0 | 1 | 2 | 3 } : it
      )
    );
  }, [selectedItemId, layoutItems, onItemsChange]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedItemId) return;
    onItemsChange(layoutItems.filter((it) => it.id !== selectedItemId));
    setSelectedItemId(null);
  }, [selectedItemId, layoutItems, onItemsChange]);

  return (
    <>
      <IsoCanvas
        rooms={decorRooms}
        items={layoutItems}
        activeRoomId={activeRoomId}
        view={view}
        editMode={editMode}
        selectedItemId={selectedItemId}
        placingKind={placingKind}
        cameraZoom={cameraZoom}
        allowEdit={allowEdit}
        onRoomClick={handleRoomClick}
        onItemSelect={setSelectedItemId}
        onPlaceAtGrid={handlePlaceAtGrid}
        onRotateSelected={handleRotateSelected}
        onDeleteSelected={handleDeleteSelected}
      />

      {editMode && (
        <DioramaFurniturePalette
          open={paletteOpen}
          selectedTypeId={placingStickerId}
          onClose={() => onPaletteOpenChange(false)}
          onTapPlace={(typeId) => setPlacingStickerId(typeId)}
          gameMode
        />
      )}

      {editMode && selectedItemId && (
        <IsoEditOverlay
          onRotate={handleRotateSelected}
          onDelete={handleDeleteSelected}
          onConfirm={() => setSelectedItemId(null)}
        />
      )}
    </>
  );
}

export const IsoGameScene = memo(IsoGameSceneInner);
