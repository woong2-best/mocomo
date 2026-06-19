"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import { saveBondeeHome } from "@/actions/apt-bondee";
import { IsometricHomeScene } from "@/lib/apt/bondee/isometric-home-scene";
import {
  BONDEE_FURNITURE_CATEGORIES,
  BONDEE_FURNITURE_LABELS,
  type BondeeFurnitureKind,
  type BondeeHomeState,
  type ChibiAvatarConfig,
  type ChibiPose,
} from "@/lib/apt/bondee/types";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { cn } from "@/lib/utils";
import { AptChibiCustomizer } from "@/components/apt/apt-chibi-customizer";
import { HomeAvatarControls } from "@/components/apt/home-avatar-controls";
import { useGameIrisTransition } from "@/components/games/game-iris-transition";

const GamesHubClient = dynamic(
  () => import("@/components/games/games-hub-client").then((m) => m.GamesHubClient),
  { ssr: false }
);

const POSE_OPTIONS: { id: ChibiPose; label: string; icon: typeof Sofa }[] = [
  { id: "stand", label: "서기", icon: PersonStanding },
  { id: "sit", label: "앉기", icon: Sofa },
  { id: "lie", label: "눕기", icon: Bed },
  { id: "run", label: "운동", icon: Footprints },
  { id: "wave", label: "인사", icon: Waves },
];

export function AptBondeeRoom({
  initialState,
  rooms,
  isLoggedIn,
  onHomeChange,
}: {
  initialState: BondeeHomeState;
  rooms: AptRoom[];
  isLoggedIn: boolean;
  onHomeChange?: (state: BondeeHomeState) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<IsometricHomeScene | null>(null);
  const stateRef = useRef(initialState);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState(initialState);
  const [activeRoomId, setActiveRoomId] = useState(
    initialState.activeRoomId ?? rooms.find((r) => r.type === "living")?.id ?? rooms[0]?.id
  );
  const [panel, setPanel] = useState<"avatar" | "decor" | null>("decor");
  const [decorCat, setDecorCat] = useState(0);
  const [placeTool, setPlaceTool] = useState<BondeeFurnitureKind | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nearConsole, setNearConsole] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const router = useRouter();
  const { runWithIris, IrisOverlay } = useGameIrisTransition();
  const openGamesRef = useRef<() => void>(() => {});

  const movementDisabled = panel === "decor" && (!!placeTool || deleteMode);

  const roomTabs = useMemo(
    () => rooms.filter((r) => r.type !== "hall" && r.type !== "balcony"),
    [rooms]
  );

  const persist = useCallback(
    (next: BondeeHomeState) => {
      if (!isLoggedIn) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        await saveBondeeHome(next);
        setSaving(false);
      }, 900);
    },
    [isLoggedIn]
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

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
    });
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms]);

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
    sceneRef.current?.setDecorMode(panel === "decor", placeTool, deleteMode);
  }, [panel, placeTool, deleteMode]);

  useEffect(() => {
    if (activeRoomId) sceneRef.current?.setActiveRoom(activeRoomId);
  }, [activeRoomId]);

  const onAvatarChange = (avatar: ChibiAvatarConfig) => {
    applyState({ ...state, avatar, activeRoomId: activeRoomId ?? undefined });
  };

  const onPoseChange = (pose: ChibiPose) => {
    const next = { ...state, pose, activeRoomId: activeRoomId ?? undefined };
    setState(next);
    sceneRef.current?.updateAvatar(state.avatar, pose);
    onHomeChange?.(next);
    persist(next);
  };

  const onPlaceTool = (kind: BondeeFurnitureKind) => {
    setPlaceTool(kind);
    setDeleteMode(false);
    setPanel("decor");
  };

  const rotateSelected = () => {
    if (!selectedItemId) return;
    const items = state.items.map((it) =>
      it.id === selectedItemId ? { ...it, rot: ((it.rot + 1) % 4) as 0 | 1 | 2 | 3 } : it
    );
    applyState({ ...state, items, activeRoomId: activeRoomId ?? undefined });
  };

  const deleteSelected = () => {
    if (!selectedItemId) return;
    applyState({
      ...state,
      items: state.items.filter((i) => i.id !== selectedItemId),
      activeRoomId: activeRoomId ?? undefined,
    });
    setSelectedItemId(null);
  };

  return (
    <div className="folk-card overflow-hidden bg-white">
      <IrisOverlay />
      {gamesOpen && (
        <div className="fixed inset-0 z-[190] overflow-y-auto bg-folk-cream">
          <GamesHubClient embedded onClose={closeGames} onGameNavigate={navigateToGame} />
        </div>
      )}

      <div className="relative min-h-[min(80dvh,820px)] bg-[#fef6f8]">
        <div ref={mountRef} className="absolute inset-0" />

        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-neutral-200 bg-white/95 px-2.5 py-1.5 text-xs text-muted-foreground backdrop-blur-sm space-y-0.5">
          <p>내 집 전체 · {rooms.length}개 공간{saving && " · 저장 중…"}</p>
          <p className="text-[10px] text-folk-terracotta font-medium">WASD · 방향키 이동 · TV 게임기 근처에서 E</p>
        </div>

        <div className="absolute left-3 bottom-3 pointer-events-auto">
          <HomeAvatarControls
            disabled={movementDisabled}
            canInteract={nearConsole && !movementDisabled}
            onMove={(x, z) => sceneRef.current?.setMoveInput(x, z)}
            onInteract={() => sceneRef.current?.tryInteract()}
          />
        </div>

        <div className="absolute right-3 top-3 flex flex-col gap-1.5">
          {POSE_OPTIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.label}
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

      <div className="border-t border-neutral-200 bg-white p-3 space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPanel(panel === "avatar" ? null : "avatar")}
            className={cn(
              "flex-1 rounded-xl border py-2.5 text-xs font-bold transition-colors",
              panel === "avatar" ? "border-folk-terracotta bg-folk-terracotta/10 text-folk-terracotta" : "border-neutral-200"
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
              "flex-1 rounded-xl border py-2.5 text-xs font-bold transition-colors",
              panel === "decor" ? "border-folk-terracotta bg-folk-terracotta/10 text-folk-terracotta" : "border-neutral-200"
            )}
          >
            <LayoutGrid className="h-4 w-4 inline mr-1" />
            집 꾸미기
          </button>
        </div>

        {panel === "avatar" && <AptChibiCustomizer config={state.avatar} onChange={onAvatarChange} />}

        {panel === "decor" && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground">방 선택 (가구 배치 위치)</p>
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

            <p className="text-[10px] text-muted-foreground">
              {deleteMode
                ? "삭제 모드 — 가구를 클릭하면 제거됩니다"
                : placeTool
                  ? `${BONDEE_FURNITURE_LABELS[placeTool]} → ${roomTabs.find((r) => r.id === activeRoomId)?.label ?? "방"} 바닥 클릭`
                  : "가구를 선택하거나 삭제 모드를 켜세요"}
            </p>

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

/** @deprecated alias */
export const AptBondeeHome = AptBondeeRoom;
