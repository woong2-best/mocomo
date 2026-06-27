"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Armchair,
  Bed,
  Footprints,
  LayoutGrid,
  PersonStanding,
  RotateCw,
  Sofa,
  Sparkles,
  Tag,
  Trash2,
  Waves,
  ArrowDownToLine,
} from "lucide-react";
import { saveBondeeHome } from "@/actions/apt-bondee";
import {
  BONDEE_FURNITURE_CATEGORIES,
  BONDEE_FURNITURE_LABELS,
  type BondeePlacedItem,
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
import { InstrumentPlayPanel } from "@/components/apt/instrument-play-panel";
import type { InstrumentKind } from "@/lib/apt/bondee/instruments/types";
import { specForInstrument } from "@/lib/apt/bondee/instruments/architecture";
import { AptEntranceDoorToggle } from "@/components/apt/apt-entrance-door-toggle";
import { AptInteractPrompt } from "@/components/apt/apt-interact-prompt";
import { AptLiveTvPanel } from "@/components/apt/apt-live-tv-panel";
import { AptConsoleScreen } from "@/components/apt/apt-console-screen";
import { AptSmartphonePanel } from "@/components/apt/apt-smartphone-panel";
import { AptHomeIdentityPanel } from "@/components/apt/apt-home-identity-panel";
import type { HomeIdentitySummary } from "@/lib/apt/home-identity";
import { useAptHomeSocket } from "@/hooks/use-apt-home-socket";
import { useSession } from "next-auth/react";
import { useCompose } from "@/components/compose/compose-provider";
import { parseAptMailboxParams } from "@/lib/apt/mailbox-compose-route";
import { AptIsometricRoom } from "@/components/apt/apt-isometric-room";
import { AptGameProvider } from "@/components/apt/game/apt-game-context";
import { AptGameShell } from "@/components/apt/game/apt-game-shell";
import type { AptGameState } from "@/lib/apt/game/types";
import type { StickerFunction } from "@/lib/diorama/sticker-types";
import { getDioramaPreset } from "@/lib/diorama/living-room-preset";
import type { RefObject } from "react";
import type { UnifiedAptWorldScene } from "@/lib/apt/world/unified-apt-world-scene";
import type { AptWorldMode } from "@/lib/apt/world/world-types";

type ConsoleContentMode = "live" | "games" | null;
type ConsoleModePhase = "off" | "entering" | "active" | "exiting";
type NearbyFurnitureInteract = { itemId: string; actionLabel: string } | null;
type HomeSceneCallbacks = {
  onItemSelect: (itemId: string | null) => void;
  onNearGramophoneChange: (near: boolean) => void;
  onGramophoneInteract: () => void;
  onNearInstrumentChange: (near: { itemId: string; kind: InstrumentKind } | null) => void;
  onInstrumentInteract: (itemId: string, kind: InstrumentKind) => void;
  onNavigateInteract: (href: string) => void;
  onComposeInteract: () => void;
  onActiveRoomChange: (roomId: string) => void;
  onNearbyFurnitureChange: (near: NearbyFurnitureInteract) => void;
  onPoseChange: (pose: ChibiPose) => void;
  onLightToggle: (itemId: string, on: boolean) => void;
  onAcToggle: (itemId: string, on: boolean) => void;
  onFurnitureOpenToggle: (itemId: string, open: boolean) => void;
  onSmartphoneInteract: () => void;
  onFurnitureToast: (msg: string) => void;
  onConsoleModeChange: (phase: ConsoleModePhase) => void;
  onPositionChange: (pos: { x: number; z: number; pose: string; activity: string }) => void;
};
type HomeSceneController = {
  updateItems: (items: BondeeHomeState["items"]) => void;
  setState: (state: BondeeHomeState) => void;
  updateAvatar: (avatar: ChibiAvatarConfig, pose?: ChibiPose) => void;
  syncRemotePlayers: (peers: unknown[]) => void;
  setGramophonePlaying: (playing: boolean) => void;
  setInstrumentPlaying: (playing: boolean) => void;
  playRemoteInstrumentNote: (kind: InstrumentKind, midi: number, pad?: number) => void;
  setTvScreenActive: (active: boolean) => void;
  getConsoleBlend: () => number;
  getConsoleContent: () => ConsoleContentMode;
  setPaused: (paused: boolean) => void;
  setCallbacks: (callbacks: HomeSceneCallbacks) => void;
  setDecorMode: (
    active: boolean,
    kind: BondeeFurnitureKind | null,
    deleteMode: boolean,
    studioTool: AptStudioInventoryItem | null
  ) => void;
  setActiveRoom: (roomId: string) => void;
  setSelectedItem: (itemId: string | null) => void;
  setMoveInput: (x: number, z: number) => void;
  tryInteract: () => void;
  exitConsoleMode: () => void;
  enterShowcaseTour: (enabled: boolean) => void;
  dispose: () => void;
};

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
  doorOpen = true,
  onDoorToggle,
  unifiedWorldRef,
  skipSceneMount = false,
  worldMode = "interior",
  isVisiting = false,
  visitingIdentity = null,
  layoutOwnerUserId = null,
  onExitInterior,
  furnitureHintState,
  initialGame = null,
  userLevel = 1,
}: {
  initialState: BondeeHomeState;
  rooms: AptRoom[];
  isLoggedIn: boolean;
  studioInventory?: AptStudioInventoryItem[];
  onHomeChange?: (state: BondeeHomeState) => void;
  paused?: boolean;
  doorOpen?: boolean;
  onDoorToggle?: () => void;
  unifiedWorldRef?: RefObject<UnifiedAptWorldScene | null>;
  skipSceneMount?: boolean;
  worldMode?: AptWorldMode;
  isVisiting?: boolean;
  visitingIdentity?: HomeIdentitySummary | null;
  /** 다이오라마 배치 데이터 소유자(방 주인) */
  layoutOwnerUserId?: string | null;
  onExitInterior?: () => void;
  furnitureHintState?: { hasUnreadMail?: boolean; hasMissedCall?: boolean };
  initialGame?: AptGameState | null;
  userLevel?: number;
}) {
  const { data: session } = useSession();
  const homeOwnerId = layoutOwnerUserId ?? session?.user?.id ?? null;
  const canEditLayout = isLoggedIn && !isVisiting && !!homeOwnerId;
  const sceneRef = useRef<HomeSceneController | null>(null);
  const stateRef = useRef(initialState);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeq = useRef(0);
  const [state, setState] = useState(initialState);
  const [activeRoomId, setActiveRoomId] = useState(
    initialState.activeRoomId ?? rooms.find((r) => r.type === "living")?.id ?? rooms[0]?.id
  );
  const [panel, setPanel] = useState<"avatar" | "decor" | "identity" | null>(null);
  const [identityHint, setIdentityHint] = useState(false);
  const [decorCat, setDecorCat] = useState(0);
  const [placeTool, setPlaceTool] = useState<BondeeFurnitureKind | null>(null);
  const [studioTool, setStudioTool] = useState<AptStudioInventoryItem | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nearGramophone, setNearGramophone] = useState(false);
  const [gramophoneOpen, setGramophoneOpen] = useState(false);
  const [gramophonePlaying, setGramophonePlaying] = useState(false);
  const [nearInstrument, setNearInstrument] = useState<{ itemId: string; kind: InstrumentKind } | null>(null);
  const [instrumentOpen, setInstrumentOpen] = useState(false);
  const [instrumentPlaying, setInstrumentPlaying] = useState(false);
  const [activeInstrument, setActiveInstrument] = useState<InstrumentKind | null>(null);
  const [nearbyFurniture, setNearbyFurniture] = useState<NearbyFurnitureInteract | null>(null);
  const [consolePhase, setConsolePhase] = useState<ConsoleModePhase>("off");
  const [consoleBlend, setConsoleBlend] = useState(0);
  const [consoleContent, setConsoleContent] = useState<ConsoleContentMode>(null);
  const [smartphoneOpen, setSmartphoneOpen] = useState(false);
  const [furnitureToast, setFurnitureToast] = useState<string | null>(null);
  const emitMoveRef = useRef<(x: number, z: number, pose: string, activity: string) => void>(() => {});
  const emitInstrumentNoteRef = useRef<(kind: InstrumentKind, midi: number, pad?: number) => void>(() => {});

  const { peers, emitMove, emitInstrumentNote, onRemoteNote } = useAptHomeSocket(
    isLoggedIn && doorOpen ? homeOwnerId : null
  );
  emitMoveRef.current = emitMove;
  emitInstrumentNoteRef.current = emitInstrumentNote;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openCompose } = useCompose();
  const openGramophoneRef = useRef<() => void>(() => {});
  const openInstrumentRef = useRef<(kind: InstrumentKind) => void>(() => {});
  const mailboxComposeRef = useRef<() => void>(() => {});
  const mailboxParams = useMemo(() => parseAptMailboxParams(searchParams), [searchParams]);
  const pendingComposeRef = useRef(mailboxParams);
  pendingComposeRef.current = mailboxParams;
  const hasMailbox = useMemo(
    () => state.items.some((it) => it.kind === "mailbox"),
    [state.items]
  );

  const movementDisabled = panel === "decor" && (!!placeTool || !!studioTool || deleteMode);

  useEffect(() => {
    if (isVisiting && panel === "identity") setPanel(null);
  }, [isVisiting, panel]);

  useEffect(() => {
    if (worldMode !== "interior" || isVisiting || !isLoggedIn) return;
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem("apt-identity-hint") === "1") return;
    setIdentityHint(true);
  }, [worldMode, isVisiting, isLoggedIn]);

  const roomTabs = useMemo(
    () => rooms.filter((r) => r.type !== "hall" && r.type !== "balcony"),
    [rooms]
  );

  const activeRoom = useMemo(
    () => rooms.find((r) => r.id === activeRoomId) ?? roomTabs[0],
    [rooms, activeRoomId, roomTabs]
  );
  const isImmersiveDiorama = !!(activeRoom && getDioramaPreset(activeRoom.id, activeRoom.type));
  const gameEnabled = isLoggedIn && !isVisiting && worldMode === "interior";

  const visitReportedRef = useRef(false);
  useEffect(() => {
    if (!isVisiting) {
      visitReportedRef.current = false;
    }
  }, [isVisiting]);

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

  const addItemToActiveRoom = useCallback(
    (kind: BondeeFurnitureKind, studio?: AptStudioInventoryItem) => {
      const room = rooms.find((r) => r.id === activeRoomId) ?? rooms[0];
      if (!room) return;
      const item: BondeePlacedItem = {
        id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        kind,
        roomId: room.id,
        gx: Math.max(1, Math.round(room.w / 100)),
        gz: Math.max(1, Math.round(room.h / 100)),
        rot: 0,
        studioAssetId: studio?.studioAssetId,
        glbUrl: studio?.glbUrl,
        studioLabel: studio?.name,
      };
      applyItems([...stateRef.current.items, item]);
      setSelectedItemId(item.id);
      setFurnitureToast(`${studio?.name ?? BONDEE_FURNITURE_LABELS[kind]} 배치됨`);
      window.setTimeout(() => setFurnitureToast(null), 1800);
    },
    [activeRoomId, applyItems, rooms]
  );

  const openGramophone = useCallback(() => {
    setGramophoneOpen(true);
  }, []);

  const openInstrument = useCallback((kind: InstrumentKind) => {
    setActiveInstrument(kind);
    setInstrumentOpen(true);
  }, []);

  openGramophoneRef.current = openGramophone;
  openInstrumentRef.current = openInstrument;

  useEffect(() => {
    if (!mailboxParams.decorMailbox || !isLoggedIn) return;
    setPanel("decor");
    setPlaceTool("mailbox");
    setStudioTool(null);
    setDeleteMode(false);
    const entrance = rooms.find((r) => r.type === "entrance");
    if (entrance) setActiveRoomId(entrance.id);
    const decorIdx = BONDEE_FURNITURE_CATEGORIES.findIndex((c) => c.kinds.includes("mailbox"));
    if (decorIdx >= 0) setDecorCat(decorIdx);
  }, [mailboxParams.decorMailbox, isLoggedIn, rooms]);

  const handleMailboxCompose = useCallback(() => {
    const pending = pendingComposeRef.current;
    openCompose({
      viaMailbox: true,
      communityId: pending.communityId,
      initialContent: pending.initialContent,
      initialTitle: pending.initialTitle,
    });
  }, [openCompose]);

  mailboxComposeRef.current = handleMailboxCompose;

  useEffect(() => {
    sceneRef.current?.setGramophonePlaying(gramophonePlaying);
  }, [gramophonePlaying]);

  useEffect(() => {
    sceneRef.current?.setInstrumentPlaying(instrumentPlaying);
  }, [instrumentPlaying]);

  useEffect(() => {
    sceneRef.current?.syncRemotePlayers(peers);
  }, [peers]);

  useEffect(() => {
    const unsub = onRemoteNote((note) => {
      sceneRef.current?.playRemoteInstrumentNote(note.kind as InstrumentKind, note.midi, note.padIndex);
    });
    return () => {
      unsub();
    };
  }, [onRemoteNote]);

  useEffect(() => {
    if (consolePhase === "off") {
      sceneRef.current?.setTvScreenActive(false);
      return;
    }
    let raf = 0;
    const tick = () => {
      const scene = sceneRef.current;
      if (scene) {
        setConsoleBlend(scene.getConsoleBlend());
        const c = scene.getConsoleContent();
        if (c) setConsoleContent(c);
        scene.setTvScreenActive(c === "live" && consolePhase === "active");
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [consolePhase]);

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
    if (skipSceneMount) {
      sceneRef.current = (unifiedWorldRef?.current?.getInterior() as HomeSceneController | null) ?? null;
      return;
    }
    sceneRef.current = null;
    return () => {
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, skipSceneMount]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setCallbacks({
      onItemSelect: setSelectedItemId,
      onNearGramophoneChange: setNearGramophone,
      onGramophoneInteract: () => openGramophoneRef.current(),
      onNearInstrumentChange: setNearInstrument,
      onInstrumentInteract: (_itemId, kind) => openInstrumentRef.current(kind),
      onNavigateInteract: (href) => router.push(href),
      onComposeInteract: () => mailboxComposeRef.current(),
      onActiveRoomChange: (roomId) => setActiveRoomId(roomId),
      onNearbyFurnitureChange: setNearbyFurniture,
      onPoseChange,
      onLightToggle: (itemId, on) => {
        const lightsOn = { ...(stateRef.current.lightsOn ?? {}), [itemId]: on };
        const next = { ...stateRef.current, lightsOn };
        stateRef.current = next;
        setState(next);
        onHomeChange?.(next);
        persist(next);
      },
      onAcToggle: (itemId, on) => {
        const acOn = { ...(stateRef.current.acOn ?? {}), [itemId]: on };
        const next = { ...stateRef.current, acOn };
        stateRef.current = next;
        setState(next);
        onHomeChange?.(next);
        persist(next);
      },
      onFurnitureOpenToggle: (itemId, open) => {
        const furnitureOpen = { ...(stateRef.current.furnitureOpen ?? {}), [itemId]: open };
        const next = { ...stateRef.current, furnitureOpen };
        stateRef.current = next;
        setState(next);
        onHomeChange?.(next);
        persist(next);
      },
      onSmartphoneInteract: () => setSmartphoneOpen(true),
      onFurnitureToast: (msg) => {
        setFurnitureToast(msg);
        window.setTimeout(() => setFurnitureToast(null), 2600);
      },
      onConsoleModeChange: (phase) => {
        setConsolePhase(phase);
        if (phase === "off") setConsoleContent(null);
      },
      onPositionChange: ({ x, z, pose, activity }) => {
        emitMoveRef.current(x, z, pose, activity);
      },
    });
  }, [skipSceneMount, unifiedWorldRef?.current, onPoseChange, onHomeChange, persist, router]);

  useEffect(() => {
    if (!skipSceneMount || !unifiedWorldRef?.current) return;
    sceneRef.current = unifiedWorldRef.current.getInterior() as HomeSceneController;
  }, [skipSceneMount, unifiedWorldRef?.current]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
    addItemToActiveRoom(kind);
  };

  const onPlaceStudio = (item: AptStudioInventoryItem) => {
    setStudioTool(item);
    setPlaceTool(null);
    setDeleteMode(false);
    setPanel("decor");
    addItemToActiveRoom("plant", item);
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

  const interactLabel = nearInstrument
    ? `${specForInstrument(nearInstrument.kind).label} 연주`
    : nearGramophone
      ? "그라모폰 재생"
      : nearbyFurniture
        ? nearbyFurniture.actionLabel
        : null;
  const showInteract =
    !movementDisabled && !instrumentOpen && !gramophoneOpen && !!interactLabel;

  const handleFunctionalSticker = useCallback(
    (fn: StickerFunction) => {
      switch (fn) {
        case "live-tv":
          setConsoleContent("live");
          setConsolePhase("active");
          setConsoleBlend(1);
          break;
        case "mailbox":
          mailboxComposeRef.current();
          break;
        case "phone":
          setSmartphoneOpen(true);
          break;
        case "community":
          router.push("/");
          break;
        case "avatar-edit":
          setPanel("avatar");
          break;
        case "profile-edit":
          setPanel("identity");
          break;
      }
    },
    [router]
  );

  return (
    <AptGameProvider
      enabled={gameEnabled}
      initialGame={initialGame}
      userLevel={userLevel}
      rooms={roomTabs}
      initialRoomId={activeRoomId}
      onRoomSelect={setActiveRoomId}
    >
    <div
      className={cn(
        "relative h-full w-full",
        skipSceneMount && worldMode !== "interior" ? "pointer-events-none invisible" : ""
      )}
    >
      {!skipSceneMount && (
        <AptIsometricRoom
          rooms={rooms}
          state={state}
          activeRoomId={activeRoomId}
          selectedItemId={selectedItemId}
          onRoomSelect={setActiveRoomId}
          onItemSelect={deleteMode ? (itemId) => {
            applyItems(stateRef.current.items.filter((i) => i.id !== itemId));
            setSelectedItemId(null);
          } : setSelectedItemId}
          onFunctionalAction={handleFunctionalSticker}
          onExitCorridor={onExitInterior}
          hintState={furnitureHintState}
          layoutOwnerUserId={homeOwnerId}
          canEditLayout={canEditLayout}
          isVisiting={isVisiting}
          immersive={isImmersiveDiorama}
        />
      )}

      {furnitureToast && (
        <div className="pointer-events-none absolute top-24 left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
          {furnitureToast}
        </div>
      )}

      {isVisiting && visitingIdentity && (
        <div className="pointer-events-none absolute top-14 left-3 z-10 max-w-[14rem] rounded-xl border border-amber-400/30 bg-black/65 px-3 py-2 backdrop-blur-md shadow-lg">
          <p className="text-[10px] font-bold text-amber-200">{visitingIdentity.archetypeLabel}</p>
          <p className="text-[10px] text-white/75 mt-0.5">{visitingIdentity.tagline}</p>
          {visitingIdentity.tags.length > 0 && (
            <p className="text-[9px] text-white/45 mt-1">{visitingIdentity.tags.join(" ")}</p>
          )}
        </div>
      )}

        <GramophonePanel
          open={gramophoneOpen}
          onClose={() => {
            setGramophoneOpen(false);
            setGramophonePlaying(false);
          }}
          onPlayingChange={setGramophonePlaying}
        />

        <InstrumentPlayPanel
          open={instrumentOpen}
          kind={activeInstrument}
          crafted={state.diyCrafted}
          onClose={() => {
            setInstrumentOpen(false);
            setInstrumentPlaying(false);
            setActiveInstrument(null);
          }}
          onPlayingChange={setInstrumentPlaying}
          onNotePlayed={(kind, midi, pad) => emitInstrumentNoteRef.current(kind, midi, pad)}
          onCraft={(kind) => {
            const diyCrafted = { ...(stateRef.current.diyCrafted ?? {}), [kind]: true };
            applyState({ ...stateRef.current, diyCrafted });
          }}
        />

        <AptLiveTvPanel
          phase={consoleContent === "live" ? consolePhase : "off"}
          blend={consoleBlend}
          onPowerOff={() => sceneRef.current?.exitConsoleMode()}
        />

        <AptConsoleScreen
          phase={consoleContent === "games" ? consolePhase : "off"}
          blend={consoleBlend}
          onPowerOff={() => sceneRef.current?.exitConsoleMode()}
          onGameNavigate={(href) => router.push(href)}
        />

        <AptSmartphonePanel open={smartphoneOpen} onClose={() => setSmartphoneOpen(false)} />

        <div className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 z-10">
          <AptInteractPrompt label={interactLabel ?? ""} visible={!isImmersiveDiorama && showInteract} />
        </div>

        {!isImmersiveDiorama && (
        <div className="pointer-events-none absolute left-3 top-14 rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-[10px] text-white/80 backdrop-blur-md shadow-lg space-y-0.5 max-w-[min(100%,14rem)]">
          {saving && <p className="font-semibold text-pink-200">저장 중…</p>}
          {peers.length > 0 && (
            <p className="font-semibold text-green-300">방문자 {peers.length}명</p>
          )}
          {mailboxParams.decorMailbox && !hasMailbox && (
            <p className="text-sky-200 font-semibold">
              우편함 배치 후 E키로 글·사진·영상 올리기
            </p>
          )}
        </div>
        )}

        {!isImmersiveDiorama && (
        <div className="absolute left-3 bottom-3 pointer-events-auto">
          <HomeAvatarControls
            disabled={movementDisabled}
            canInteract={(nearGramophone || !!nearInstrument || !!nearbyFurniture) && !movementDisabled}
            interactLabel={
              nearInstrument
                ? `${specForInstrument(nearInstrument.kind).label} 연주 (E)`
                : nearGramophone
                  ? "그라모폰 MP3 (E)"
                  : nearbyFurniture
                    ? `${nearbyFurniture.actionLabel} (E)`
                    : undefined
            }
            onMove={(x, z) => sceneRef.current?.setMoveInput(x, z)}
            onInteract={() => sceneRef.current?.tryInteract()}
          />
        </div>
        )}

        {!isImmersiveDiorama && (
        <div className="absolute right-3 top-14 flex flex-col gap-1.5 z-10">
          {isLoggedIn && onDoorToggle && (
            <div className="w-[11rem] pointer-events-auto">
              <AptEntranceDoorToggle doorOpen={doorOpen} onToggle={onDoorToggle} compact />
            </div>
          )}
          {POSE_OPTIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={`${p.label} (${p.key})`}
              onClick={() => onPoseChange(p.id)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-black/45 shadow-lg backdrop-blur-md transition-colors",
                state.pose === p.id ? "border-pink-400 text-pink-300" : "text-white/70 hover:text-white"
              )}
            >
              <p.icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        )}

      {/* Slide-up decor / avatar panel */}
      {identityHint && isLoggedIn && !isVisiting && !isImmersiveDiorama && (
        <div className="pointer-events-auto absolute bottom-[3.5rem] left-3 right-3 z-[25] mx-auto max-w-md rounded-xl border border-amber-400/35 bg-black/80 p-3 shadow-xl backdrop-blur-md">
          <p className="text-[11px] font-bold text-amber-100">내 집 소개 설정</p>
          <p className="text-[10px] text-white/65 mt-1 leading-snug">
            하단 <span className="text-amber-200 font-semibold">정체성</span> 탭에서 집 분위기·태그·대표 공간을
            정하면 이웃이 「그 사람 집」으로 기억합니다.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPanel("identity");
                setIdentityHint(false);
                sessionStorage.setItem("apt-identity-hint", "1");
              }}
              className="flex-1 rounded-lg bg-amber-500/90 py-1.5 text-[10px] font-bold text-white"
            >
              정체성 열기
            </button>
            <button
              type="button"
              onClick={() => {
                setIdentityHint(false);
                sessionStorage.setItem("apt-identity-hint", "1");
              }}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-[10px] text-white/70"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 transition-transform duration-300 ease-out",
          panel
            ? "translate-y-0"
            : isImmersiveDiorama
              ? "translate-y-full"
              : "translate-y-[calc(100%-3.25rem)]"
        )}
      >
        <div className="border-t border-white/10 bg-black/75 backdrop-blur-xl shadow-2xl rounded-t-2xl">
          <div className="flex gap-2 p-3 border-b border-white/10">
          <button
            type="button"
            onClick={() => setPanel(panel === "avatar" ? null : "avatar")}
            className={cn(
              "flex-1 rounded-2xl border py-2.5 text-xs font-bold transition-all",
              panel === "avatar"
                ? "border-pink-400/60 bg-pink-500/20 text-pink-200"
                : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
            )}
          >
            <Sparkles className="h-4 w-4 inline mr-1" />
            아바타
          </button>
          <button
            type="button"
            onClick={() => {
              setPanel(panel === "decor" ? null : "decor");
              setDeleteMode(false);
            }}
            className={cn(
              "flex-1 rounded-2xl border py-2.5 text-xs font-bold transition-all",
              panel === "decor"
                ? "border-pink-400/60 bg-pink-500/20 text-pink-200"
                : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
            )}
          >
            <LayoutGrid className="h-4 w-4 inline mr-1" />
            꾸미기
          </button>
          {isLoggedIn && !isVisiting && (
            <button
              type="button"
              onClick={() => setPanel(panel === "identity" ? null : "identity")}
              className={cn(
                "flex-1 rounded-2xl border py-2.5 text-xs font-bold transition-all",
                panel === "identity"
                  ? "border-amber-400/60 bg-amber-500/20 text-amber-100"
                  : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
              )}
            >
              <Tag className="h-4 w-4 inline mr-1" />
              내 집 소개
            </button>
          )}
        </div>

        {panel === "avatar" && (
          <div className="max-h-[min(42dvh,360px)] overflow-y-auto p-3">
            <AptChibiCustomizer config={state.avatar} onChange={onAvatarChange} />
          </div>
        )}

        {panel === "decor" && (
          <div className="max-h-[min(42dvh,360px)] overflow-y-auto p-3 space-y-3">
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-white/90">✨ 집 꾸미기</p>
              {(placeTool || studioTool) && (
                <span className="text-[10px] rounded-full bg-pink-500/25 text-pink-200 px-2 py-0.5 font-bold">
                  배치 모드
                </span>
              )}
            </div>

            <p className="text-[10px] font-bold text-white/50">1. 방 선택</p>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {roomTabs.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveRoomId(r.id)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-[10px] font-bold border",
                    activeRoomId === r.id ? "border-pink-400/60 bg-pink-500/20 text-pink-200" : "border-white/15 text-white/70"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <p className="text-[10px] font-bold text-white/50">2. 가구 카테고리</p>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {BONDEE_FURNITURE_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setDecorCat(i)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-[10px] font-bold border",
                    decorCat === i ? "border-pink-400/60 bg-pink-500/20 text-pink-200" : "border-white/15 text-white/70"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <p className="text-[10px] font-bold text-white/50">3. 가구 선택 → 바닥 클릭 배치</p>
            <p className="text-[10px] text-white/50">
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
                <p className="text-[10px] font-bold text-pink-300">MoCoMo Studio 보관함</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {studioInventory.map((item) => (
                    <button
                      key={item.studioAssetId}
                      type="button"
                      onClick={() => onPlaceStudio(item)}
                      className={cn(
                        "shrink-0 rounded-xl border p-2 text-[10px] font-semibold min-w-[4.5rem]",
                        studioTool?.studioAssetId === item.studioAssetId
                          ? "border-pink-400/60 bg-pink-500/20 text-pink-200"
                          : "border-white/15 bg-white/5 text-white/70"
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
                    placeTool === kind ? "border-pink-400/60 bg-pink-500/20 text-pink-200" : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                  )}
                >
                  <Armchair className="h-5 w-5 mx-auto mb-1 text-white/40" />
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
                  deleteMode ? "border-red-400/60 bg-red-500/20 text-red-200" : "border-white/15 text-white/70"
                )}
              >
                <Trash2 className="h-3 w-3" />
                삭제
              </button>
              <button
                type="button"
                disabled={!selectedItemId}
                onClick={rotateSelected}
                className="flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-bold text-white/70 disabled:opacity-40"
              >
                <RotateCw className="h-3 w-3" />
                회전
              </button>
              <button
                type="button"
                disabled={!selectedItemId}
                onClick={deleteSelected}
                className="flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-bold text-red-300 disabled:opacity-40"
              >
                선택 삭제
              </button>
            </div>
          </div>
          </div>
        )}

        {panel === "identity" && isLoggedIn && !isVisiting && (
          <div className="max-h-[min(42dvh,360px)] overflow-y-auto p-3">
            <AptHomeIdentityPanel
              state={state}
              rooms={roomTabs}
              onChange={(identity) => applyState({ ...stateRef.current, identity })}
              onPreviewShowcase={() => sceneRef.current?.enterShowcaseTour(true)}
            />
          </div>
        )}
        </div>
      </div>
      {gameEnabled && <AptGameShell />}
    </div>
    </AptGameProvider>
  );
}

export const AptBondeeRoom = memo(AptBondeeRoomInner);

/** @deprecated alias */
export const AptBondeeHome = AptBondeeRoom;
