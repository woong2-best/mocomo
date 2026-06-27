"use client";

import Image from "next/image";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StickerFunction, StickerInstance } from "@/lib/diorama/sticker-types";
import { getStickerAsset } from "@/lib/diorama/sticker-catalog";
import { getDefaultStickerInstances, getDioramaPreset } from "@/lib/diorama/living-room-preset";
import {
  clampStickerPosition,
  enrichInstanceFromCatalog,
  finalizeInstancesLayout,
  resolvePlacementPosition,
  sortInstancesByDepth,
} from "@/lib/diorama/sticker-instance-utils";
import {
  canDeleteInEditMode,
  isEditableInEditMode,
  newInstanceId,
} from "@/lib/diorama/sticker-edit-utils";
import { loadStickerInstances, saveStickerInstances } from "@/lib/diorama/sticker-storage";
import {
  FunctionalFurnitureHint,
  type FurnitureHintState,
} from "@/components/apt/diorama/functional-furniture-hint";
import { DioramaEditToolbar } from "@/components/apt/diorama/diorama-edit-toolbar";
import { DioramaFurniturePalette } from "@/components/apt/diorama/diorama-furniture-palette";
import { DioramaRoomBackdrop } from "@/components/apt/diorama/diorama-room-backdrop";
import { PlacementItemGrid, AptGameEditControls } from "@/components/apt/game/apt-game-edit-controls";
import { useAptGame } from "@/components/apt/game/apt-game-context";
import { PlacementBoundsOverlay } from "@/components/apt/diorama/placement-bounds-overlay";
import { ENERGY_COST_PLACE } from "@/lib/apt/game/energy";
import { canUseSticker } from "@/lib/apt/game/shop";
import { vibrateDeleteFeedback } from "@/lib/haptics";
import { DioramaStickerVisual } from "@/components/apt/diorama/diorama-sticker-visual";
import { getRoomCamera } from "@/lib/diorama/room-camera";
import { cn } from "@/lib/utils";

const LABEL_REVEAL_MS = 1600;
const SAVE_DEBOUNCE_MS = 800;
const DRAG_Z_INDEX = 9999;
const ROOM_CANVAS_ID = "room-canvas";

function DraggableSticker({
  sticker,
  editMode,
  selected,
  isRevealed,
  hintState,
  onSelect,
  onTap,
  onSpatial,
  gameMode = false,
}: {
  sticker: StickerInstance;
  editMode: boolean;
  selected: boolean;
  isRevealed: boolean;
  hintState?: FurnitureHintState;
  onSelect: (id: string) => void;
  onTap: (sticker: StickerInstance) => void;
  onSpatial?: (fn: "room-portal" | "exit-corridor") => void;
  gameMode?: boolean;
}) {
  const asset = getStickerAsset(sticker.typeId);
  const canEdit = editMode && isEditableInEditMode(sticker.typeId);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: sticker.id,
    disabled: !canEdit,
    data: { type: "instance", instanceId: sticker.id },
  });

  if (!asset) return null;

  const scale = sticker.scale ?? 1;
  const rotation = sticker.rotation ?? 0;
  const width = asset.defaultWidth * scale;
  const fn = asset.function;
  const isFn = !!fn;
  const isSpatial = fn === "room-portal" || fn === "exit-corridor";
  const showLabel = isFn && !isSpatial && isRevealed && !editMode;

  const dragTransform = transform
    ? ` translate3d(${transform.x}px, ${transform.y}px, 0)`
    : "";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDragging) return;

    if (editMode) {
      if (canEdit) onSelect(sticker.id);
      return;
    }

    if (isSpatial && fn) {
      onSpatial?.(fn);
      return;
    }
    onTap(sticker);
  };

  return (
    <div
      ref={setNodeRef}
      data-testid={`sticker-${sticker.id}`}
      aria-label={isFn ? `${asset.label} · ${asset.functionLabel}` : asset.label}
      onClick={handleClick}
      {...(canEdit ? listeners : {})}
      {...(canEdit ? attributes : {})}
      className={cn(
        "absolute origin-center border-0 bg-transparent p-0",
        canEdit && "cursor-grab touch-none active:cursor-grabbing",
        !canEdit && "touch-manipulation",
        !editMode && isFn && "cursor-pointer",
        isDragging && "z-[9999]",
        !isDragging && "transition-transform duration-150",
        selected && "ring-2 ring-pink-400/80 ring-offset-1 rounded-lg",
        editMode && selected && "ring-pink-500"
      )}
      style={{
        left: `${sticker.x}%`,
        top: `${sticker.y}%`,
        width,
        zIndex: isDragging ? DRAG_Z_INDEX : sticker.zIndex,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)${dragTransform}`,
        touchAction: canEdit ? "none" : undefined,
      }}
    >
      {showLabel && fn && (
        <span className="pointer-events-none absolute -top-5 left-1/2 z-10 -translate-x-1/2 animate-in fade-in zoom-in-95 whitespace-nowrap rounded-full border border-amber-300/70 bg-amber-50/95 px-2 py-0.5 text-[8px] font-bold text-amber-900 shadow-sm duration-200">
          {asset.functionLabel}
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <DioramaStickerVisual
        typeId={sticker.typeId}
        label={asset.label}
        src={asset.src}
        gameMode={gameMode}
        selected={selected && editMode}
      />
      {!editMode && isFn && !isSpatial && (
        <FunctionalFurnitureHint
          assetId={sticker.typeId}
          fn={fn}
          hintState={hintState}
        />
      )}
    </div>
  );
}

function DioramaStickerRoomInner({
  roomId,
  roomType,
  roomLabel,
  layoutOwnerUserId,
  canEditLayout = true,
  editMode,
  paletteOpen,
  onPaletteOpenChange,
  hintState,
  onFunctionalAction,
  onSpatialAction,
  immersive = true,
  gameMode = false,
  cameraZoom = 1,
}: {
  roomId: string;
  roomType: string;
  roomLabel: string;
  layoutOwnerUserId?: string | null;
  canEditLayout?: boolean;
  editMode: boolean;
  paletteOpen: boolean;
  onPaletteOpenChange: (open: boolean) => void;
  hintState?: FurnitureHintState;
  onFunctionalAction?: (fn: StickerFunction) => void;
  onSpatialAction?: (fn: "room-portal" | "exit-corridor") => void;
  immersive?: boolean;
  gameMode?: boolean;
  cameraZoom?: number;
}) {
  const router = useRouter();
  const game = useAptGame();
  const roomCamera = useMemo(() => getRoomCamera(roomType), [roomType]);
  const cameraScale = roomCamera.scale * cameraZoom;
  const [placeError, setPlaceError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [instances, setInstances] = useState<StickerInstance[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [serverCanEdit, setServerCanEdit] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [draggingCatalogType, setDraggingCatalogType] = useState<string | null>(null);
  const [catalogPreview, setCatalogPreview] = useState<{
    typeId: string;
    x: number;
    y: number;
    inside: boolean;
  } | null>(null);
  const catalogPreviewRef = useRef<typeof catalogPreview>(null);
  const revealUntilRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  const preset = useMemo(() => getDioramaPreset(roomId, roomType), [roomId, roomType]);
  const backdrop = preset ? getStickerAsset(preset.backdropAssetId) : null;
  const allowEdit = canEditLayout && serverCanEdit;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } })
  );

  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const pointerHits = pointerWithin(args);
    if (pointerHits.length > 0) return pointerHits;
    return rectIntersection(args);
  }, []);

  const persistInstances = useCallback(
    (next: StickerInstance[], immediate = false) => {
      dirtyRef.current = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const run = () => {
        void saveStickerInstances(layoutOwnerUserId ?? null, roomId, next, {
          canEdit: allowEdit,
        });
        dirtyRef.current = false;
      };
      if (immediate) run();
      else saveTimerRef.current = setTimeout(run, SAVE_DEBOUNCE_MS);
    },
    [layoutOwnerUserId, roomId, allowEdit]
  );

  const { setNodeRef: setDropRef } = useDroppable({ id: ROOM_CANVAS_ID });

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { instances: saved, canEdit } = await loadStickerInstances(
        layoutOwnerUserId ?? null,
        roomId
      );
      if (cancelled) return;
      setServerCanEdit(canEdit);
      const base =
        saved.length > 0 ? saved : getDefaultStickerInstances(roomId, roomType);
      setInstances(sortInstancesByDepth(base.map((s) => enrichInstanceFromCatalog(s))));
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [layoutOwnerUserId, roomId, roomType]);

  useEffect(() => {
    if (!editMode) {
      setSelectedId(null);
      setRevealedId(null);
    }
  }, [editMode]);

  useEffect(() => {
    if (!loaded || !dirtyRef.current || !allowEdit) return;
    persistInstances(instances);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [instances, loaded, allowEdit, persistInstances]);

  const mergeContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      setDropRef(node);
    },
    [setDropRef]
  );

  const addInstanceAtPercent = useCallback(
    (typeId: string, x: number, y: number, immediateSave = true) => {
      const owned = canUseSticker(typeId, game?.game.ownedStickers ?? []);
      if (game && !owned) {
        setPlaceError("상점에서 먼저 구매하세요");
        game.setShopOpen(true);
        window.setTimeout(() => setPlaceError(null), 2000);
        return;
      }
      if (game && game.game.energy < ENERGY_COST_PLACE) {
        setPlaceError(`에너지가 부족해요 (⚡${ENERGY_COST_PLACE} 필요)`);
        window.setTimeout(() => setPlaceError(null), 2200);
        return;
      }
      const id = newInstanceId(typeId);
      setInstances((prev) => {
        const { x: px, y: py } = resolvePlacementPosition(x, y, typeId, prev);
        const placed = enrichInstanceFromCatalog({
          id,
          typeId,
          x: px,
          y: py,
          zIndex: 0,
          scale: 1,
          rotation: 0,
          draggable: true,
        });
        const next = sortInstancesByDepth([...prev, placed]);
        persistInstances(next, immediateSave);
        return next;
      });
      setSelectedId(id);
      markDirty();
      void game?.onStickerPlaced(typeId, roomId).then((res) => {
        if (res?.error) {
          setPlaceError(res.error);
          setInstances((prev) => {
            const next = prev.filter((s) => s.id !== id);
            persistInstances(next, true);
            return next;
          });
          setSelectedId(null);
          window.setTimeout(() => setPlaceError(null), 2200);
        }
      });
    },
    [markDirty, persistInstances, game, roomId]
  );

  const addInstanceAtClient = useCallback(
    (typeId: string, clientX: number, clientY: number, immediateSave = true) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const rawX = ((clientX - rect.left) / rect.width) * 100;
      const rawY = ((clientY - rect.top) / rect.height) * 100;
      addInstanceAtPercent(typeId, rawX, rawY, immediateSave);
    },
    [addInstanceAtPercent]
  );

  const spawnCatalogItem = useCallback(
    (typeId: string) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.52;
      addInstanceAtClient(typeId, cx, cy, true);
    },
    [addInstanceAtClient]
  );

  const updateCatalogPreview = useCallback(
    (typeId: string, clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const inside =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;
      const rawX = ((clientX - rect.left) / rect.width) * 100;
      const rawY = ((clientY - rect.top) / rect.height) * 100;
      const { x, y } = inside
        ? resolvePlacementPosition(rawX, rawY, typeId, instances)
        : clampStickerPosition(rawX, rawY);
      const next = { typeId, x, y, inside };
      catalogPreviewRef.current = next;
      setCatalogPreview(next);
    },
    [instances]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      if (id.startsWith("catalog:")) {
        const typeId =
          (event.active.data.current?.typeId as string) ?? id.replace("catalog:", "");
        setDraggingCatalogType(typeId);
        const translated = event.active.rect.current.translated;
        if (translated) {
          updateCatalogPreview(
            typeId,
            translated.left + translated.width / 2,
            translated.top + translated.height / 2
          );
        }
        return;
      }
      setSelectedId(id);
    },
    [updateCatalogPreview]
  );

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const id = String(event.active.id);
      if (!id.startsWith("catalog:")) return;
      const typeId = event.active.data.current?.typeId as string | undefined;
      if (!typeId) return;
      const translated = event.active.rect.current.translated;
      if (!translated) return;
      updateCatalogPreview(
        typeId,
        translated.left + translated.width / 2,
        translated.top + translated.height / 2
      );
    },
    [updateCatalogPreview]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const preview = catalogPreviewRef.current;
      setDraggingCatalogType(null);
      setCatalogPreview(null);
      catalogPreviewRef.current = null;
      const { active } = event;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const activeId = String(active.id);

      if (activeId.startsWith("catalog:")) {
        if (!editMode || !allowEdit) return;
        const typeId = active.data.current?.typeId as string | undefined;
        if (!typeId) return;
        if (preview?.inside && preview.typeId === typeId) {
          addInstanceAtPercent(typeId, preview.x, preview.y, true);
          return;
        }
        const translated = active.rect.current.translated;
        if (!translated) return;
        const cx = translated.left + translated.width / 2;
        const cy = translated.top + translated.height / 2;
        const insideCanvas =
          cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom;
        if (!insideCanvas) return;
        addInstanceAtClient(typeId, cx, cy, true);
        return;
      }

      if (!editMode || !allowEdit) return;
      const target = instances.find((s) => s.id === activeId);
      if (!target || !isEditableInEditMode(target.typeId)) return;

      const translated = active.rect.current.translated;
      if (!translated) return;
      const cx = translated.left + translated.width / 2;
      const cy = translated.top + translated.height / 2;
      const rawX = ((cx - rect.left) / rect.width) * 100;
      const rawY = ((cy - rect.top) / rect.height) * 100;
      const moved = Math.hypot(rawX - target.x, rawY - target.y) > 0.25;
      if (!moved) return;

      setInstances((prev) => {
        const next = finalizeInstancesLayout(prev, activeId, rawX, rawY);
        markDirty();
        return next;
      });
    },
    [editMode, allowEdit, markDirty, addInstanceAtClient, addInstanceAtPercent, instances]
  );

  const handleTap = useCallback(
    (sticker: StickerInstance) => {
      const asset = getStickerAsset(sticker.typeId);
      const hasLink = !!sticker.linkTo;
      const hasFn =
        !!asset?.function &&
        asset.function !== "room-portal" &&
        asset.function !== "exit-corridor";
      const hasAction = hasLink || hasFn;
      if (!hasAction) return;

      const now = Date.now();
      if (revealedId === sticker.id && now < revealUntilRef.current) {
        setRevealedId(null);
        if (sticker.linkTo) {
          router.push(sticker.linkTo);
        } else if (hasFn && asset?.function) {
          onFunctionalAction?.(asset.function);
        }
        return;
      }

      setRevealedId(sticker.id);
      revealUntilRef.current = now + LABEL_REVEAL_MS;
      window.setTimeout(() => {
        setRevealedId((cur) => (cur === sticker.id ? null : cur));
      }, LABEL_REVEAL_MS);
    },
    [revealedId, router, onFunctionalAction]
  );

  const handleTapPlaceCatalog = useCallback(
    (typeId: string) => {
      spawnCatalogItem(typeId);
    },
    [spawnCatalogItem]
  );

  const selected = instances.find((s) => s.id === selectedId);
  const catalogPreviewAsset = catalogPreview
    ? getStickerAsset(catalogPreview.typeId)
    : null;
  const showPlacementZone = editMode && !!draggingCatalogType;

  const handleRotate = useCallback(() => {
    if (!selectedId) return;
    setInstances((prev) =>
      prev.map((s) =>
        s.id === selectedId
          ? { ...s, rotation: ((s.rotation ?? 0) + 15) % 360 }
          : s
      )
    );
    markDirty();
  }, [selectedId, markDirty]);

  const handleDuplicate = useCallback(() => {
    if (!selected) return;
    const copyId = newInstanceId(selected.typeId);
    setInstances((prev) => {
      const { x, y } = resolvePlacementPosition(
        selected.x + 3,
        selected.y + 2,
        selected.typeId,
        prev
      );
      const copy = enrichInstanceFromCatalog({
        ...selected,
        id: copyId,
        x,
        y,
        zIndex: 0,
      });
      const next = sortInstancesByDepth([...prev, copy]);
      markDirty();
      return next;
    });
    setSelectedId(copyId);
  }, [selected, markDirty]);

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    const target = instances.find((s) => s.id === selectedId);
    if (!target || !canDeleteInEditMode(target.typeId)) return;
    const next = instances.filter((s) => s.id !== selectedId);
    setSelectedId(null);
    setInstances(next);
    persistInstances(next, true);
    vibrateDeleteFeedback(500);
  }, [selectedId, instances, persistInstances]);

  if (!preset || !backdrop) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#e8dfd4] p-6">
        <p className="rounded-2xl border-2 border-dashed border-[#1e1e1e]/15 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-500">
          {roomLabel} 다이오라마 준비 중…
        </p>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#e8dfd4]">
        <p className="text-xs font-semibold text-slate-500">방 불러오는 중…</p>
      </div>
    );
  }

  const sorted = [...instances].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="apt-game-room-bg absolute inset-0 overflow-hidden">
      <div className="apt-game-room-vignette" />
      {editMode && gameMode && (
        <div className="pointer-events-none absolute inset-x-0 top-[4.5rem] z-[60] flex justify-center">
          <span className="rounded-full border border-[#c9b08a]/60 bg-white/90 px-4 py-1 text-[10px] font-black text-[#5c4033] shadow-md">
            ✦ 편집 모드 · 드래그로 배치
          </span>
        </div>
      )}
      {editMode && !gameMode && (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-[60] flex justify-center">
          <span className="rounded-full border border-pink-300/60 bg-pink-50/90 px-3 py-1 text-[10px] font-bold text-pink-700 shadow-sm">
            꾸미기 모드
          </span>
        </div>
      )}

      <DndContext
        sensors={editMode && allowEdit ? sensors : []}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setDraggingCatalogType(null);
          setCatalogPreview(null);
          catalogPreviewRef.current = null;
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div
            className={cn(
              "relative shrink-0 transition-transform duration-500 ease-out",
              immersive
                ? gameMode
                  ? "h-[calc(100dvh-12rem)] w-[calc((100dvh-12rem)*4/3)] max-w-none"
                  : "h-[88dvh] w-[calc(88dvh*4/3)] max-w-none"
                : "aspect-[4/3] w-full max-h-[min(72vh,calc(100%-3rem))] max-w-lg sm:max-w-2xl",
              editMode && gameMode && "ring-2 ring-amber-300/50 ring-offset-2 ring-offset-[#e8dfd4]",
              editMode && !gameMode && "ring-2 ring-pink-300/40 ring-offset-2 ring-offset-[#e8dfd4]"
            )}
            style={{
              transform: `scale(${cameraScale}) translateY(${roomCamera.translateY}%)`,
              transformOrigin: `${roomCamera.focusX}% 55%`,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {gameMode ? (
                <DioramaRoomBackdrop roomType={roomType} className="h-full w-full" />
              ) : (
                <Image
                  src={backdrop.src}
                  alt="방 배경"
                  width={900}
                  height={680}
                  priority
                  className="h-full w-full object-contain"
                  style={{ filter: "drop-shadow(0 10px 24px rgba(50,40,30,0.14))" }}
                />
              )}
            </div>
            <div
              ref={mergeContainerRef}
              data-testid="room-canvas"
              className="absolute inset-0"
            >
              {showPlacementZone && <PlacementBoundsOverlay />}
              {editMode && gameMode && selected && isEditableInEditMode(selected.typeId) && (
                <PlacementItemGrid x={selected.x} y={selected.y} />
              )}
              {catalogPreview?.inside && catalogPreviewAsset && (
                <div
                  className="pointer-events-none absolute origin-center"
                  style={{
                    left: `${catalogPreview.x}%`,
                    top: `${catalogPreview.y}%`,
                    width: catalogPreviewAsset.defaultWidth,
                    zIndex: 9000,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={catalogPreviewAsset.src}
                    alt=""
                    className="h-auto w-full opacity-55"
                    draggable={false}
                  />
                </div>
              )}
              {sorted.map((sticker) => (
                <DraggableSticker
                  key={sticker.id}
                  sticker={sticker}
                  editMode={editMode}
                  selected={selectedId === sticker.id}
                  isRevealed={revealedId === sticker.id}
                  hintState={hintState}
                  onSelect={setSelectedId}
                  onTap={handleTap}
                  onSpatial={onSpatialAction}
                  gameMode={gameMode}
                />
              ))}
              {editMode && selected && isEditableInEditMode(selected.typeId) && gameMode && (
                <AptGameEditControls
                  x={selected.x}
                  y={selected.y}
                  onRotate={handleRotate}
                  onDelete={handleDelete}
                  onConfirm={() => setSelectedId(null)}
                />
              )}
            </div>
          </div>
        </div>

        {editMode && (
          <DioramaFurniturePalette
            open={paletteOpen}
            selectedTypeId={selected?.typeId ?? null}
            onClose={() => onPaletteOpenChange(false)}
            onTapPlace={handleTapPlaceCatalog}
            gameMode={gameMode}
          />
        )}

        {placeError && (
          <div className="pointer-events-none absolute inset-x-0 top-1/3 z-[90] flex justify-center">
            <span className="rounded-full bg-amber-100 px-4 py-2 text-[11px] font-bold text-amber-900 shadow-lg">
              {placeError}
            </span>
          </div>
        )}

        <DragOverlay dropAnimation={null} style={{ zIndex: 10000 }}>
          {draggingCatalogType && catalogPreview && !catalogPreview.inside ? (
            (() => {
              const asset = getStickerAsset(draggingCatalogType);
              if (!asset) return null;
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={asset.src}
                  alt=""
                  className="pointer-events-none h-16 w-auto opacity-80 drop-shadow-lg"
                  draggable={false}
                />
              );
            })()
          ) : null}
        </DragOverlay>
      </DndContext>

      {editMode && selected && isEditableInEditMode(selected.typeId) && !gameMode && (
        <DioramaEditToolbar
          selectedTypeId={selected.typeId}
          canDelete={canDeleteInEditMode(selected.typeId)}
          paletteOpen={paletteOpen}
          onRotate={handleRotate}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />
      )}

      {!immersive && !editMode && (
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-50 flex items-center justify-between rounded-2xl border border-[#1e1e1e]/10 bg-white/92 px-3 py-2 text-[10px] font-bold text-slate-700 shadow-md backdrop-blur-sm">
          <span>{roomLabel} · 다이오라마</span>
          <span className="rounded-full bg-pink-100 px-2 py-0.5 text-pink-700">{sorted.length}개</span>
        </div>
      )}
    </div>
  );
}

export const DioramaStickerRoom = memo(DioramaStickerRoomInner);
