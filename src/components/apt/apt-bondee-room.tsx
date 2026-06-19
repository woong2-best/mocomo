"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Armchair,
  Bed,
  Footprints,
  LayoutGrid,
  PersonStanding,
  RotateCw,
  Sofa,
  Sparkles,
  Trash2,
  Waves,
  ArrowDownToLine,
} from "lucide-react";
import { saveBondeeHome } from "@/actions/apt-bondee";
import { IsometricHomeScene, type NearbyFurnitureInteract } from "@/lib/apt/bondee/isometric-home-scene";
import { ARCHITECTURE_LABELS } from "@/lib/apt/bondee/furniture-architecture";
import {
  BONDEE_FURNITURE_CATEGORIES,
  BONDEE_FURNITURE_LABELS,
  type BondeeFurnitureKind,
  type BondeeHomeState,
  type ChibiAvatarConfig,
  type ChibiPose,
} from "@/lib/apt/bondee/types";
import type { AptStudioInventoryItem } from "@/studio/lib/apt-types";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { cn } from "@/lib/utils";
import { AptChibiCustomizer } from "@/components/apt/apt-chibi-customizer";
import { HomeAvatarControls } from "@/components/apt/home-avatar-controls";
import { GramophonePanel } from "@/components/apt/gramophone-panel";
import { useGameIrisTransition } from "@/components/games/game-iris-transition";

const GamesHubClient = dynamic(
  () => import("@/components/games/games-hub-client").then((m) => m.GamesHubClient),
  { ssr: false }
);

const POSE_OPTIONS: { id: ChibiPose; label: string; icon: typeof Sofa; key: string }[] = [
  { id: "stand", label: "서기", icon: PersonStanding, key: "1" },
  { id: "sit", label: "앉기", icon: Sofa, key: "2" },
  { id: "lie", label: "눕기", icon: Bed, key: "3" },
  { id: "lie_prone", label: "엎드리기", icon: ArrowDownToLine, key: "4" },
  { id: "run", label: "체조", icon: Footprints, key: "5" },
  { id: "wave", label: "인사", icon: Waves, key: "6" },
];

function AptBondeeRoomInner({
  initialState,
  rooms,
  isLoggedIn,
  studioInventory = [],
  onHomeChange,
  paused = false,
}: {
  initialState: BondeeHomeState;
  rooms: AptRoom[];
  isLoggedIn: boolean;
  studioInventory?: AptStudioInventoryItem[];
  onHomeChange?: (state: BondeeHomeState) => void;
  paused?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<IsometricHomeScene | null>(null);
  const stateRef = useRef(initialState);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeq = useRef(0);
  const [state, setState] = useState(initialState);
  const [activeRoomId, setActiveRoomId] = useState(
    initialState.activeRoomId ?? rooms.find((r) => r.type === "living")?.id ?? rooms[0]?.id
  );
  const [panel, setPanel] = useState<"avatar" | "decor" | null>("decor");
  const [decorCat, setDecorCat] = useState(0);
  const [placeTool, setPlaceTool] = useState<BondeeFurnitureKind | null>(null);
  const [studioTool, setStudioTool] = useState<AptStudioInventoryItem | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nearConsole, setNearConsole] = useState(false);
  const [nearGramophone, setNearGramophone] = useState(false);
  const [gramophoneOpen, setGramophoneOpen] = useState(false);
  const [gramophonePlaying, setGramophonePlaying] = useState(false);
  const [nearbyFurniture, setNearbyFurniture] = useState<NearbyFurnitureInteract | null>(null);
  const [gamesOpen, setGamesOpen] = useState(false);
  const router = useRouter();
  const { runWithIris, IrisOverlay } = useGameIrisTransition();
  const openGamesRef = useRef<() => void>(() => {});
  const openGramophoneRef = useRef<() => void>(() => {});

  const movementDisabled = panel === "decor" && (!!placeTool || !!studioTool || deleteMode);

  const roomTabs = useMemo(
    () => rooms.filter((r) => r.type !== "hall" && r.type !== "balcony"),
    [rooms]
  );

  const persist = useCallback(
    (next: BondeeHomeState) => {
      if (!isLoggedIn) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const seq = ++saveSeq.current;
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        await saveBondeeHome(next);
        if (seq === saveSeq.current) setSaving(false);
      }, 900);
    },
    [isLoggedIn]
  );

  const applyItems = useCallback(
    (items: BondeeHomeState["items"]) => {
      const next = { ...stateRef.current, items, activeRoomId: activeRoomId ?? undefined };
      stateRef.current = next;
      setState(next);
      sceneRef.current?.updateItems(items);
      onHomeChange?.(next);
      persist(next);
    },
    [activeRoomId, onHomeChange, persist]
  );

  const applyState = useCallback(
    (next: BondeeHomeState) => {
      stateRef.current = next;
      setState(next);
      sceneRef.current?.setState(next);
      onHomeChange?.(next);
      persist(next);
    },
    [onHomeChange, persist]
  );

  const openGames = useCallback(() => {
    void runWithIris(() => {
      setGamesOpen(true);
    });
  }, [runWithIris]);

  openGamesRef.current = openGames;

  const openGramophone = useCallback(() => {
    setGramophoneOpen(true);
  }, []);

  openGramophoneRef.current = openGramophone;

  useEffect(() => {
    sceneRef.current?.setGramophonePlaying(gramophonePlaying);
  }, [gramophonePlaying]);

  const onPoseChange = useCallback((pose: ChibiPose) => {
    const next = { ...stateRef.current, pose, activeRoomId: activeRoomId ?? undefined };
    stateRef.current = next;
    setState(next);
    sceneRef.current?.updateAvatar(next.avatar, pose);
    onHomeChange?.(next);
    persist(next);
  }, [activeRoomId, onHomeChange, persist]);

  useEffect(() => {
    sceneRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const scene = new IsometricHomeScene(el, rooms, {
      ...stateRef.current,
      activeRoomId: activeRoomId ?? undefined,
    });
    scene.setCallbacks({
      onItemSelect: setSelectedItemId,
      onNearConsoleChange: setNearConsole,
      onGameConsoleInteract: () => openGamesRef.current(),
      onNearGramophoneChange: setNearGramophone,
      onGramophoneInteract: () => openGramophoneRef.current(),
      onActiveRoomChange: (roomId) => setActiveRoomId(roomId),
      onNearbyFurnitureChange: setNearbyFurniture,
      onPoseChange,
    });
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const closeGames = useCallback(() => {
    void runWithIris(() => {
      setGamesOpen(false);
    });
  }, [runWithIris]);

  const navigateToGame = useCallback(
    (href: string) => {
      void runWithIris(() => {
        setGamesOpen(false);
        router.push(href);
      });
    },
    [runWithIris, router]
  );

  useEffect(() => {
    sceneRef.current?.setDecorMode(panel === "decor", placeTool, deleteMode, studioTool);
  }, [panel, placeTool, deleteMode, studioTool]);

  useEffect(() => {
    if (activeRoomId) sceneRef.current?.setActiveRoom(activeRoomId);
  }, [activeRoomId]);

  const onAvatarChange = (avatar: ChibiAvatarConfig) => {
    const next = { ...stateRef.current, avatar, activeRoomId: activeRoomId ?? undefined };
    stateRef.current = next;
    setState(next);
    sceneRef.current?.updateAvatar(avatar, next.pose);
    onHomeChange?.(next);
    persist(next);
  };

  const onPlaceTool = (kind: BondeeFurnitureKind) => {
    setPlaceTool(kind);
    setStudioTool(null);
    setDeleteMode(false);
    setPanel("decor");
  };

  const onPlaceStudio = (item: AptStudioInventoryItem) => {
    setStudioTool(item);
    setPlaceTool(null);
    setDeleteMode(false);
    setPanel("decor");
  };

  const rotateSelected = () => {
    if (!selectedItemId) return;
    const items = stateRef.current.items.map((it) =>
      it.id === selectedItemId ? { ...it, rot: ((it.rot + 1) % 4) as 0 | 1 | 2 | 3 } : it
    );
    applyItems(items);
  };

  const deleteSelected = () => {
    if (!selectedItemId) return;
    applyItems(stateRef.current.items.filter((i) => i.id !== selectedItemId));
    setSelectedItemId(null);
    sceneRef.current?.setSelectedItem(null);
  };

  return (
    <div className="folk-card overflow-hidden bg-white">
      <IrisOverlay />
      {gamesOpen && (
        <div className="fixed inset-0 z-[190] overflow-y-auto bg-folk-cream">
          <GamesHubClient embedded onClose={closeGames} onGameNavigate={navigateToGame} />
        </div>
      )}

      <div className="relative min-h-[min(80dvh,820px)] bg-gradient-to-b from-[#fef6f8] to-[#ffe8f0]">
        <div ref={mountRef} className="absolute inset-0" />

        <GramophonePanel
          open={gramophoneOpen}
          onClose={() => {
            setGramophoneOpen(false);
            setGramophonePlaying(false);
          }}
          onPlayingChange={setGramophonePlaying}
        />

        <div className="pointer-events-none absolute left-3 top-3 rounded-2xl border-2 border-pink-200/80 bg-white/90 px-3 py-2 text-xs text-muted-foreground backdrop-blur-md shadow-sm space-y-0.5">
          <p className="font-bold text-folk-cobalt">🏠 내 집 · {rooms.length}개 공간{saving && " · 저장 중…"}</p>
          <p className="text-[10px] text-folk-terracotta font-medium">
            WASD 이동 · 문 통과 시 자동 개방 · 가구 근처 E · 자세 1~6 · Shift+드래그 회전 · 휠 줌
          </p>
          {nearGramophone && !movementDisabled && !gramophoneOpen && (
            <p className="text-[10px] text-amber-700 font-semibold">그라모폰 — MP3 재생 (E)</p>
          )}
          {nearbyFurniture && !movementDisabled && (
            <p className="text-[10px] text-folk-cobalt font-semibold">
              {BONDEE_FURNITURE_LABELS[nearbyFurniture.kind] ?? nearbyFurniture.label} —{" "}
              {nearbyFurniture.architectures.map((a) => ARCHITECTURE_LABELS[a]).join(" · ")} (E)
            </p>
          )}
        </div>

        <div className="absolute left-3 bottom-3 pointer-events-auto">
          <HomeAvatarControls
            disabled={movementDisabled}
            canInteract={(nearConsole || nearGramophone || !!nearbyFurniture) && !movementDisabled}
            interactLabel={
              nearConsole
                ? "게임기 시작 (E)"
                : nearGramophone
                  ? "그라모폰 MP3 (E)"
                  : nearbyFurniture
                    ? `${BONDEE_FURNITURE_LABELS[nearbyFurniture.kind] ?? nearbyFurniture.label} (E)`
                    : undefined
            }
            onMove={(x, z) => sceneRef.current?.setMoveInput(x, z)}
            onInteract={() => sceneRef.current?.tryInteract()}
          />
        </div>

        <div className="absolute right-3 top-3 flex flex-col gap-1.5">
          {POSE_OPTIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={`${p.label} (${p.key})`}
              onClick={() => onPoseChange(p.id)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border bg-white shadow-sm transition-colors",
                state.pose === p.id ? "border-folk-terracotta text-folk-terracotta" : "border-neutral-200 text-neutral-600"
              )}
            >
              <p.icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-pink-100 bg-gradient-to-b from-white to-[#fff8fa] p-3 space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPanel(panel === "avatar" ? null : "avatar")}
            className={cn(
              "flex-1 rounded-2xl border-2 py-2.5 text-xs font-bold transition-all shadow-sm",
              panel === "avatar"
                ? "border-folk-terracotta bg-folk-terracotta/15 text-folk-terracotta scale-[1.02]"
                : "border-pink-100 bg-white hover:border-pink-200"
            )}
          >
            <Sparkles className="h-4 w-4 inline mr-1" />
            아바타 꾸미기
          </button>
          <button
            type="button"
            onClick={() => {
              setPanel(panel === "decor" ? null : "decor");
              setDeleteMode(false);
            }}
            className={cn(
              "flex-1 rounded-2xl border-2 py-2.5 text-xs font-bold transition-all shadow-sm",
              panel === "decor"
                ? "border-folk-terracotta bg-folk-terracotta/15 text-folk-terracotta scale-[1.02]"
                : "border-pink-100 bg-white hover:border-pink-200"
            )}
          >
            <LayoutGrid className="h-4 w-4 inline mr-1" />
            집 꾸미기
          </button>
        </div>

        {panel === "avatar" && <AptChibiCustomizer config={state.avatar} onChange={onAvatarChange} />}

        {panel === "decor" && (
          <div className="space-y-3 rounded-2xl border-2 border-pink-100 bg-white/80 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-folk-cobalt">✨ 심즈 스타일 꾸미기</p>
              {(placeTool || studioTool) && (
                <span className="text-[10px] rounded-full bg-folk-terracotta/15 text-folk-terracotta px-2 py-0.5 font-bold">
                  배치 모드
                </span>
              )}
            </div>

            <p className="text-[10px] font-bold text-muted-foreground">1. 방 선택</p>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {roomTabs.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveRoomId(r.id)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-[10px] font-bold border",
                    activeRoomId === r.id ? "border-folk-terracotta bg-folk-terracotta/10" : "border-neutral-200"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <p className="text-[10px] font-bold text-muted-foreground">2. 가구 카테고리</p>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {BONDEE_FURNITURE_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setDecorCat(i)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-[10px] font-bold border",
                    decorCat === i ? "border-folk-terracotta bg-folk-terracotta/10" : "border-neutral-200"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <p className="text-[10px] font-bold text-muted-foreground">3. 가구 선택 → 바닥 클릭 배치</p>
            <p className="text-[10px] text-muted-foreground">
              {deleteMode
                ? "삭제 모드 — 가구를 클릭하면 제거됩니다"
                : studioTool
                  ? `Studio: ${studioTool.name} → 바닥 클릭`
                  : placeTool
                    ? `${BONDEE_FURNITURE_LABELS[placeTool]} → ${roomTabs.find((r) => r.id === activeRoomId)?.label ?? "방"} 바닥 클릭`
                    : "가구를 선택하거나 삭제 모드를 켜세요"}
            </p>

            {studioInventory.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-pink-600">MoCoMo Studio 보관함</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {studioInventory.map((item) => (
                    <button
                      key={item.studioAssetId}
                      type="button"
                      onClick={() => onPlaceStudio(item)}
                      className={cn(
                        "shrink-0 rounded-xl border p-2 text-[10px] font-semibold min-w-[4.5rem]",
                        studioTool?.studioAssetId === item.studioAssetId
                          ? "border-pink-400 bg-pink-50 text-pink-700"
                          : "border-pink-100 bg-white"
                      )}
                    >
                      {item.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbnailUrl} alt="" className="mx-auto mb-1 h-8 w-8 rounded object-cover" />
                      ) : (
                        <Sparkles className="mx-auto mb-1 h-5 w-5 text-pink-400" />
                      )}
                      <span className="line-clamp-2">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {BONDEE_FURNITURE_CATEGORIES[decorCat].kinds.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => onPlaceTool(kind)}
                  className={cn(
                    "rounded-xl border p-2 text-center text-[10px] font-semibold transition-colors",
                    placeTool === kind ? "border-folk-terracotta bg-folk-terracotta/10" : "border-neutral-200 hover:bg-neutral-50"
                  )}
                >
                  <Armchair className="h-5 w-5 mx-auto mb-1 text-neutral-500" />
                  {BONDEE_FURNITURE_LABELS[kind]}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteMode((v) => !v);
                  setPlaceTool(null);
                  setStudioTool(null);
                }}
                className={cn(
                  "flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[10px] font-bold",
                  deleteMode ? "border-destructive bg-destructive/10 text-destructive" : "border-neutral-200"
                )}
              >
                <Trash2 className="h-3 w-3" />
                삭제
              </button>
              <button
                type="button"
                disabled={!selectedItemId}
                onClick={rotateSelected}
                className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-[10px] font-bold disabled:opacity-40"
              >
                <RotateCw className="h-3 w-3" />
                회전
              </button>
              <button
                type="button"
                disabled={!selectedItemId}
                onClick={deleteSelected}
                className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-[10px] font-bold text-destructive disabled:opacity-40"
              >
                선택 삭제
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const AptBondeeRoom = memo(AptBondeeRoomInner);

/** @deprecated alias */
export const AptBondeeHome = AptBondeeRoom;
