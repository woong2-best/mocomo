"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import type { BondeeHomeState } from "@/lib/apt/bondee/types";
import type { StickerFunction } from "@/lib/diorama/sticker-types";
import { getDioramaPreset } from "@/lib/diorama/living-room-preset";
import { DioramaStickerRoom } from "@/components/apt/diorama/diorama-sticker-room";
import { RoomPortalOverlay } from "@/components/apt/diorama/room-portal-overlay";
import type { FurnitureHintState } from "@/components/apt/diorama/functional-furniture-hint";
import { AptMultiRoomOverview } from "@/components/apt/game/apt-multi-room-overview";
import { AptGameRoomHeader } from "@/components/apt/game/apt-game-room-header";
import { AptRoomTransition } from "@/components/apt/game/apt-room-transition";
import { useAptGame } from "@/components/apt/game/apt-game-context";
import { AptVisitFriendBanner } from "@/components/apt/game/apt-visit-friend-banner";
import { AptGameZoomControls } from "@/components/apt/game/apt-game-zoom-controls";
import { cn } from "@/lib/utils";

function AptDioramaRoomInner({
  rooms,
  state,
  activeRoomId,
  layoutOwnerUserId,
  canEditLayout = true,
  isVisiting = false,
  hintState,
  onRoomSelect,
  onFunctionalAction,
  onExitCorridor,
  onItemsChange,
  immersive = true,
  visitHostName,
  onEndVisit,
}: {
  rooms: AptRoom[];
  state: BondeeHomeState;
  activeRoomId?: string;
  selectedItemId: string | null;
  layoutOwnerUserId?: string | null;
  canEditLayout?: boolean;
  isVisiting?: boolean;
  hintState?: FurnitureHintState;
  onRoomSelect: (roomId: string) => void;
  onItemSelect: (itemId: string) => void;
  onFunctionalAction?: (fn: StickerFunction) => void;
  onExitCorridor?: () => void;
  onItemsChange?: (items: BondeeHomeState["items"]) => void;
  immersive?: boolean;
  visitHostName?: string | null;
  onEndVisit?: () => void;
}) {
  const game = useAptGame();
  const [portalOpen, setPortalOpen] = useState(false);
  const [localEditMode, setLocalEditMode] = useState(false);
  const [localPaletteOpen, setLocalPaletteOpen] = useState(false);
  const [roomPhase, setRoomPhase] = useState<"enter" | "idle" | "exit">("idle");
  const [cameraZoom, setCameraZoom] = useState(1);

  const editMode = game?.editMode ?? localEditMode;
  const paletteOpen = game?.paletteOpen ?? localPaletteOpen;
  const setPaletteOpen = game?.setPaletteOpen ?? setLocalPaletteOpen;
  const showOverview = !!game && game.view === "overview" && !isVisiting;

  const visibleRooms = rooms.filter((r) => r.type !== "hall" && r.type !== "balcony");
  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? visibleRooms[0];
  const roomIndex = useMemo(() => {
    const dioramaRooms = visibleRooms.filter((r) => getDioramaPreset(r.id, r.type));
    const idx = dioramaRooms.findIndex((r) => r.id === activeRoom?.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [visibleRooms, activeRoom?.id]);
  const hasDiorama = activeRoom && getDioramaPreset(activeRoom.id, activeRoom.type);
  const allowEdit = canEditLayout && !isVisiting;

  useEffect(() => {
    if (!allowEdit) {
      setLocalEditMode(false);
      setLocalPaletteOpen(false);
      game?.setEditMode(false);
      game?.setPaletteOpen(false);
    }
  }, [allowEdit, game]);

  useEffect(() => {
    if (!game || game.view !== "room") return;
    setRoomPhase("enter");
    const t = window.setTimeout(() => setRoomPhase("idle"), 400);
    return () => window.clearTimeout(t);
  }, [activeRoomId, game?.view, game]);

  const handleSpatial = useCallback(
    (fn: "room-portal" | "exit-corridor") => {
      if (editMode) return;
      if (fn === "room-portal") {
        setPortalOpen(true);
        return;
      }
      onExitCorridor?.();
    },
    [editMode, onExitCorridor]
  );

  const enterEditMode = useCallback(() => {
    if (game) {
      game.setActiveTab("furniture");
      return;
    }
    setLocalEditMode(true);
    setLocalPaletteOpen(true);
  }, [game]);

  const exitEditMode = useCallback(() => {
    if (game) {
      game.setEditMode(false);
      game.setPaletteOpen(false);
      game.enterOverview();
      return;
    }
    setLocalEditMode(false);
    setLocalPaletteOpen(false);
  }, [game]);

  const resolvedRoomId = activeRoomId ?? game?.activeRoomId ?? visibleRooms[0]?.id;

  if (showOverview) {
    return (
      <AptRoomTransition phase={roomPhase} className="absolute inset-0">
        <AptMultiRoomOverview rooms={rooms} />
      </AptRoomTransition>
    );
  }

  return (
    <AptRoomTransition phase={roomPhase} className="absolute inset-0">
      {isVisiting && visitHostName && onEndVisit && (
        <AptVisitFriendBanner hostName={visitHostName} onLeave={onEndVisit} />
      )}

      {game && game.view === "room" && !editMode && (
        <AptGameZoomControls
          zoom={cameraZoom}
          onZoomIn={() => setCameraZoom((z) => Math.min(1.35, Math.round((z + 0.08) * 100) / 100))}
          onZoomOut={() => setCameraZoom((z) => Math.max(0.85, Math.round((z - 0.08) * 100) / 100))}
          className="top-[calc(max(0.5rem,env(safe-area-inset-top))+8.5rem)]"
        />
      )}

      {activeRoom && (
        <DioramaStickerRoom
          roomId={resolvedRoomId ?? activeRoom.id}
          roomType={activeRoom.type}
          roomLabel={activeRoom.label}
          layoutOwnerUserId={layoutOwnerUserId}
          canEditLayout={allowEdit}
          editMode={editMode}
          paletteOpen={paletteOpen}
          onPaletteOpenChange={setPaletteOpen}
          hintState={hintState}
          onFunctionalAction={onFunctionalAction}
          onSpatialAction={handleSpatial}
          immersive={immersive}
          gameMode={!!game}
          cameraZoom={cameraZoom}
        />
      )}

      {game && editMode && activeRoom && (
        <AptGameRoomHeader
          roomLabel={activeRoom.label}
          roomIndex={roomIndex}
          onSave={exitEditMode}
        />
      )}

      {immersive && hasDiorama && allowEdit && !game && (
        <div
          className={cn(
            "pointer-events-auto absolute right-2 z-[70] flex gap-1.5",
            "top-[max(0.35rem,env(safe-area-inset-top))]"
          )}
        >
          {editMode ? (
            <>
              <button
                type="button"
                data-testid="edit-done"
                onClick={exitEditMode}
                className="rounded-xl border border-[#5c4033]/12 bg-white/80 px-3 py-2 text-[10px] font-bold text-[#5c4033] shadow-sm backdrop-blur-sm active:scale-95"
              >
                완료
              </button>
              <button
                type="button"
                data-testid="edit-palette"
                onClick={() => setPaletteOpen(!paletteOpen)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm backdrop-blur-sm active:scale-95",
                  paletteOpen
                    ? "border-pink-400/50 bg-pink-50/95"
                    : "border-[#5c4033]/12 bg-white/80"
                )}
                aria-label="가구 목록"
              >
                <span className="text-lg leading-none">📦</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              data-testid="edit-enter"
              onClick={enterEditMode}
              className="flex flex-col items-center gap-0.5 rounded-xl border border-[#5c4033]/12 bg-white/80 px-2 py-1.5 shadow-sm backdrop-blur-sm active:scale-95"
              aria-label="꾸미기 모드"
            >
              <span className="text-lg leading-none">📦</span>
              <span className="text-[8px] font-bold leading-none text-[#5c4033]">꾸미기</span>
            </button>
          )}
        </div>
      )}

      {game && !editMode && activeRoom && game.view === "room" && (
        <button
          type="button"
          onClick={() => game.enterOverview()}
          className="pointer-events-auto absolute left-3 top-[calc(max(0.5rem,env(safe-area-inset-top))+3.75rem)] z-[85] rounded-full border border-[#d4c4b0] bg-white/92 px-3 py-1.5 text-[10px] font-bold text-[#5c4033] shadow active:scale-95"
        >
          ← 집 전체
        </button>
      )}

      {isVisiting && hasDiorama && !visitHostName && (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-[65] flex justify-center">
          <span className="rounded-full border border-amber-300/50 bg-amber-50/95 px-3 py-1 text-[10px] font-bold text-amber-800 shadow-sm">
            이웃 집 구경 중 · 읽기 전용
          </span>
        </div>
      )}

      {portalOpen && !editMode && (
        <RoomPortalOverlay
          rooms={rooms}
          activeRoomId={activeRoomId}
          onSelectRoom={onRoomSelect}
          onExitCorridor={() => onExitCorridor?.()}
          onClose={() => setPortalOpen(false)}
        />
      )}

      {!immersive && (
        <div className="absolute left-2 top-2 z-[60] flex max-w-[calc(100%-3rem)] gap-1 overflow-x-auto pb-1 sm:left-3 sm:top-3">
          {visibleRooms.map((room) => {
            const ready = !!getDioramaPreset(room.id, room.type);
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => onRoomSelect(room.id)}
                className={`shrink-0 rounded-full border-2 px-2.5 py-0.5 text-[9px] font-bold shadow-sm backdrop-blur-sm sm:px-3 sm:py-1 sm:text-[10px] ${
                  activeRoom?.id === room.id
                    ? "border-[#1e1e1e] bg-white text-[#1e1e1e]"
                    : "border-[#1e1e1e]/20 bg-white/75 text-slate-500"
                } ${!ready ? "opacity-60" : ""}`}
              >
                {room.label}
              </button>
            );
          })}
        </div>
      )}

      {!hasDiorama && (
        <div className="pointer-events-none absolute top-12 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-amber-100/90 px-3 py-1 text-[10px] font-bold text-amber-800">
          이 방은 아직 다이오라마 제작 중
        </div>
      )}
    </AptRoomTransition>
  );
}

export const AptDioramaRoom = memo(AptDioramaRoomInner);
export const AptIsometricRoom = AptDioramaRoom;

/** @deprecated use prop onFunctionalAction on AptIsometricRoom */
export function useDioramaFunctionalRouter(handlers: {
  onLiveTv?: () => void;
  onMailbox?: () => void;
  onPhone?: () => void;
  onCommunity?: () => void;
  onAvatarEdit?: () => void;
  onProfileEdit?: () => void;
}) {
  const router = useRouter();
  return useCallback(
    (fn: StickerFunction) => {
      switch (fn) {
        case "live-tv":
          handlers.onLiveTv?.();
          break;
        case "mailbox":
          handlers.onMailbox?.();
          break;
        case "phone":
          handlers.onPhone?.();
          break;
        case "community":
          if (handlers.onCommunity) handlers.onCommunity();
          else router.push("/");
          break;
        case "avatar-edit":
          handlers.onAvatarEdit?.();
          break;
        case "profile-edit":
          handlers.onProfileEdit?.();
          break;
        case "room-portal":
        case "exit-corridor":
          break;
      }
    },
    [handlers, router]
  );
}
