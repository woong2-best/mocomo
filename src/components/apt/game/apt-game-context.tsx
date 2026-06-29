"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { AptGameToastKind } from "./apt-game-toast";
import { useRouter } from "next/navigation";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { getDioramaPreset } from "@/lib/diorama/living-room-preset";
import { createDefaultGameState } from "@/lib/apt/game/defaults";
import type { AptGameState, AptGameTab, AptGameView } from "@/lib/apt/game/types";
import type { EconomySnapshot, LocalEconomyCache } from "@/lib/apt/economy/types";
import { createEmptyLocalEconomyCache } from "@/lib/apt/economy/types";
import { canPlaceFromStorage } from "@/lib/apt/economy/storage-utils";
import {
  applySyncedEconomySnapshot,
  hydrateLocalEconomy,
  localConsumeStorage,
  localReturnStorage,
} from "@/lib/apt/local-home-store";
import {
  consumeAptStorageItem,
  getAptEconomySnapshot,
  returnAptStorageItem,
  syncAptEconomyCache,
} from "@/actions/apt-economy";
import {
  claimAptMission,
  purchaseAptSticker,
  reportAptGameEvent,
  boostAptEnergy,
} from "@/actions/apt-game";
import { energyRegenLabel } from "@/lib/apt/game/energy";
import { useAptFirstEntry, type FirstEntryState } from "@/hooks/use-apt-first-entry";
import { AptFirstEntryLayer } from "@/components/apt/first-impression/apt-first-entry-layer";

type AptGameContextValue = {
  game: AptGameState;
  economy: LocalEconomyCache;
  canPlaceItem: (typeId: string) => boolean;
  userLevel: number;
  userAvatarUrl: string | null;
  userName: string | null;
  activeTab: AptGameTab;
  view: AptGameView;
  editMode: boolean;
  paletteOpen: boolean;
  missionOpen: boolean;
  shopOpen: boolean;
  gemShopOpen: boolean;
  moreOpen: boolean;
  activeRoomId: string | null;
  setActiveTab: (tab: AptGameTab) => void;
  setView: (view: AptGameView) => void;
  setEditMode: (v: boolean) => void;
  setPaletteOpen: (v: boolean) => void;
  setMissionOpen: (v: boolean) => void;
  setShopOpen: (v: boolean) => void;
  setGemShopOpen: (v: boolean) => void;
  setMoreOpen: (v: boolean) => void;
  setActiveRoomId: (id: string) => void;
  enterRoom: (roomId: string) => void;
  enterOverview: () => void;
  purchaseSticker: (typeId: string) => Promise<{ ok?: boolean; error?: string }>;
  claimMission: (id: string) => Promise<{ ok?: boolean; error?: string }>;
  onStickerPlaced: (typeId: string, roomId: string) => Promise<{ error?: string }>;
  onStickerRemoved: (typeId: string) => Promise<void>;
  onVisitFriend: () => void;
  boostEnergy: () => Promise<void>;
  energyRegenLabel: string | null;
  rooms: AptRoom[];
  toast: string | null;
  toastKind: AptGameToastKind;
  showToast: (message: string, kind?: AptGameToastKind) => void;
  refreshEconomyFromServer: () => Promise<void>;
  setGame: Dispatch<SetStateAction<AptGameState>>;
  onExitHome?: () => void;
  primaryMission: AptGameState["missions"][0] | null;
  dailyDone: number;
  dailyTotal: number;
  firstEntry: FirstEntryState;
};

const AptGameContext = createContext<AptGameContextValue | null>(null);

function resolveDefaultLivingRoomId(rooms: AptRoom[]): string | null {
  const living = rooms.find((r) => r.id === "living" || r.type === "living");
  if (living && getDioramaPreset(living.id, living.type)) return living.id;
  for (const room of rooms) {
    if (room.type === "hall" || room.type === "entrance" || room.type === "balcony") continue;
    if (getDioramaPreset(room.id, room.type)) return room.id;
  }
  return rooms[0]?.id ?? null;
}

export function AptGameProvider({
  children,
  initialGame,
  initialEconomy = null,
  userLevel,
  userAvatarUrl = null,
  userName = null,
  rooms,
  initialRoomId,
  enabled,
  onRoomSelect,
  onExitHome,
}: {
  children: ReactNode;
  initialGame: AptGameState | null;
  initialEconomy?: EconomySnapshot | null;
  userLevel: number;
  userAvatarUrl?: string | null;
  userName?: string | null;
  rooms: AptRoom[];
  initialRoomId: string | null;
  enabled: boolean;
  onRoomSelect: (roomId: string) => void;
  onExitHome?: () => void;
}) {
  const router = useRouter();
  const [game, setGame] = useState<AptGameState>(initialGame ?? createDefaultGameState());
  const [economy, setEconomy] = useState<LocalEconomyCache>(
    initialEconomy
      ? { ...initialEconomy, pendingStorageConsume: {}, pendingOps: [] }
      : createEmptyLocalEconomyCache()
  );
  const economySynced = useRef(false);
  const defaultLivingRoomId = useMemo(() => resolveDefaultLivingRoomId(rooms), [rooms]);
  const [activeTab, setActiveTabState] = useState<AptGameTab>("home");
  const [view, setView] = useState<AptGameView>("room");
  const [editMode, setEditMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [gemShopOpen, setGemShopOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [activeRoomId, setActiveRoomIdState] = useState(
    () => initialRoomId ?? defaultLivingRoomId
  );
  const [toast, setToast] = useState<string | null>(null);
  const [toastKind, setToastKind] = useState<AptGameToastKind>("default");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bootedRef = useRef(false);

  useEffect(() => {
    if (!enabled || bootedRef.current) return;
    bootedRef.current = true;
    const roomId = activeRoomId ?? defaultLivingRoomId;
    if (!roomId) return;
    setActiveRoomIdState(roomId);
    onRoomSelect(roomId);
    setView("room");
  }, [enabled, activeRoomId, defaultLivingRoomId, onRoomSelect]);

  const showToast = useCallback((message: string, kind: AptGameToastKind = "default") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    setToastKind(kind);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    if (economySynced.current) return;
    economySynced.current = true;
    void (async () => {
      const hydrated = await hydrateLocalEconomy(initialEconomy);
      setEconomy(hydrated);
      if (typeof navigator !== "undefined" && navigator.onLine && initialEconomy) {
        const ops = hydrated.pendingOps ?? [];
        const legacy = hydrated.pendingStorageConsume ?? {};
        const hasLegacy = Object.values(legacy).some((n) => n > 0);
        if (ops.length > 0 || hasLegacy) {
          const res = await syncAptEconomyCache(ops, legacy);
          if (res && "economy" in res && res.economy) {
            const synced = await applySyncedEconomySnapshot(res.economy);
            setEconomy(synced);
          }
        }
      }
    })();
  }, [initialEconomy]);

  const canPlaceItem = useCallback(
    (typeId: string) => canPlaceFromStorage(economy, typeId),
    [economy]
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string; kind?: AptGameToastKind }>).detail;
      if (detail?.message) showToast(detail.message, detail.kind ?? "mission");
    };
    window.addEventListener("apt-game-toast", handler);
    return () => window.removeEventListener("apt-game-toast", handler);
  }, [showToast]);

  const setActiveTab = useCallback(
    (tab: AptGameTab) => {
      setActiveTabState(tab);
      setMoreOpen(false);
      if (tab === "home") {
        const roomId = activeRoomId ?? defaultLivingRoomId;
        if (roomId) {
          setActiveRoomIdState(roomId);
          onRoomSelect(roomId);
          setView("room");
        } else {
          setView("overview");
        }
        setEditMode(false);
        setPaletteOpen(false);
        setShopOpen(false);
      } else if (tab === "furniture") {
        setView("room");
        setEditMode(true);
        setPaletteOpen(true);
        setShopOpen(false);
        if (!activeRoomId && rooms[0]) {
          setActiveRoomIdState(rooms[0].id);
          onRoomSelect(rooms[0].id);
        }
      } else if (tab === "shop") {
        setShopOpen(true);
        setEditMode(false);
        setPaletteOpen(false);
      } else if (tab === "friends") {
        router.push("/discover");
      } else if (tab === "more") {
        setMoreOpen(true);
      }
    },
    [activeRoomId, defaultLivingRoomId, onRoomSelect, rooms, router]
  );

  const enterRoom = useCallback(
    (roomId: string) => {
      setActiveRoomIdState(roomId);
      onRoomSelect(roomId);
      setView("room");
      setActiveTabState("home");
    },
    [onRoomSelect]
  );

  const firstEntry = useAptFirstEntry({ enabled, rooms, enterRoom });

  const enterOverview = useCallback(() => {
    setView("overview");
    setEditMode(false);
    setPaletteOpen(false);
  }, []);

  const setActiveRoomId = useCallback(
    (id: string) => {
      setActiveRoomIdState(id);
      onRoomSelect(id);
    },
    [onRoomSelect]
  );

  const refreshEconomyFromServer = useCallback(async () => {
    const snapshot = await getAptEconomySnapshot();
    if (!snapshot) return;
    const merged = await hydrateLocalEconomy(snapshot);
    setEconomy(merged);
    setGame((g) => ({
      ...g,
      gold: snapshot.wallet.gold,
      gems: snapshot.wallet.gems,
    }));
  }, []);

  const purchaseSticker = useCallback(
    async (typeId: string) => {
      const res = await purchaseAptSticker(typeId);
      if ("error" in res && res.error) return { error: res.error };
      if ("game" in res && res.game) setGame(res.game);
      await refreshEconomyFromServer();
      setShopOpen(false);
      setActiveTabState("furniture");
      setEditMode(true);
      setPaletteOpen(true);
      showToast("구매 완료! 창고에서 가구 탭으로 배치하세요 ✦", "gold");
      return { ok: true };
    },
    [refreshEconomyFromServer, showToast]
  );

  const claimMission = useCallback(
    async (id: string) => {
      const res = await claimAptMission(id);
      if ("error" in res && res.error) return { error: res.error };
      if ("game" in res && res.game) setGame(res.game);
      await refreshEconomyFromServer();
      if ("reward" in res && res.reward) {
        showToast(`+${res.reward.gold}G · +${res.reward.gems}💎 · ⚡+5`, "mission");
      }
      return { ok: true };
    },
    [refreshEconomyFromServer, showToast]
  );

  const onStickerPlaced = useCallback(
    async (typeId: string, roomId: string) => {
      const online = typeof navigator !== "undefined" && navigator.onLine;
      const { cache: localNext, opId } = await localConsumeStorage(typeId, !!online);
      setEconomy(localNext);

      if (online) {
        const storageRes = await consumeAptStorageItem(typeId, 1, opId);
        if ("error" in storageRes && storageRes.error) {
          const { cache: rolled } = await localReturnStorage(typeId, true);
          setEconomy(rolled);
          return { error: storageRes.error };
        }
        if ("economy" in storageRes && storageRes.economy) {
          const merged = await hydrateLocalEconomy(storageRes.economy);
          setEconomy(merged);
        }
      }

      const next = await reportAptGameEvent({ type: "place_sticker", typeId, roomId });
      if (!next) return {};
      if ("error" in next) {
        const { cache: rolled, opId: rollbackOpId } = await localReturnStorage(
          typeId,
          !!online
        );
        setEconomy(rolled);
        if (online) await returnAptStorageItem(typeId, 1, rollbackOpId);
        return { error: next.error };
      }
      setGame(next);
      return {};
    },
    []
  );

  const onStickerRemoved = useCallback(async (typeId: string) => {
    const online = typeof navigator !== "undefined" && navigator.onLine;
    const { cache: localNext, opId } = await localReturnStorage(typeId, !!online);
    setEconomy(localNext);
    if (online) {
      const res = await returnAptStorageItem(typeId, 1, opId);
      if ("economy" in res && res.economy) {
        const merged = await hydrateLocalEconomy(res.economy);
        setEconomy(merged);
      }
    }
  }, []);

  const onVisitFriend = useCallback(() => {
    void reportAptGameEvent({ type: "visit_friend" }).then((next) => {
      if (next && !("error" in next)) setGame(next);
    });
  }, []);

  const boostEnergy = useCallback(async () => {
    const res = await boostAptEnergy();
    if ("game" in res && res.game) {
      setGame(res.game);
      showToast("⚡ 에너지 +10 충전!", "energy");
    }
  }, [showToast]);

  const regenLabel = energyRegenLabel(game.energyUpdatedAt);

  const dailyMissions = game.missions.filter((m) => m.kind === "daily");
  const dailyDone = dailyMissions.filter((m) => m.completed).length;
  const dailyTotal = dailyMissions.length;
  const primaryMission =
    game.missions.find((m) => m.kind === "daily" && !m.completed) ??
    game.missions.find((m) => !m.completed) ??
    null;

  const value = useMemo(
    () => ({
      game,
      economy,
      canPlaceItem,
      userLevel,
      userAvatarUrl,
      userName,
      activeTab,
      view,
      editMode,
      paletteOpen,
      missionOpen,
      shopOpen,
      gemShopOpen,
      moreOpen,
      activeRoomId,
      setActiveTab,
      setView,
      setEditMode,
      setPaletteOpen,
      setMissionOpen,
      setShopOpen,
      setGemShopOpen,
      setMoreOpen,
      setActiveRoomId,
      enterRoom,
      enterOverview,
      purchaseSticker,
      claimMission,
      onStickerPlaced,
      onStickerRemoved,
      onVisitFriend,
      boostEnergy,
      energyRegenLabel: regenLabel,
      rooms,
      toast,
      toastKind,
      showToast,
      refreshEconomyFromServer,
      setGame,
      onExitHome,
      primaryMission,
      dailyDone,
      dailyTotal,
      firstEntry,
    }),
    [
      game,
      economy,
      canPlaceItem,
      userLevel,
      userAvatarUrl,
      userName,
      activeTab,
      view,
      editMode,
      paletteOpen,
      missionOpen,
      shopOpen,
      gemShopOpen,
      moreOpen,
      activeRoomId,
      setActiveTab,
      setActiveRoomId,
      enterRoom,
      enterOverview,
      purchaseSticker,
      claimMission,
      onStickerPlaced,
      onStickerRemoved,
      onVisitFriend,
      boostEnergy,
      regenLabel,
      rooms,
      toast,
      toastKind,
      showToast,
      refreshEconomyFromServer,
      setGame,
      onExitHome,
      primaryMission,
      dailyDone,
      dailyTotal,
      firstEntry,
    ]
  );

  if (!enabled) return <>{children}</>;

  return (
    <AptGameContext.Provider value={value}>
      <AptFirstEntryLayer
        visible={firstEntry.overlayVisible}
        label={firstEntry.overlayLabel}
        vignetteOpacity={firstEntry.vignetteOpacity}
        phase={firstEntry.phase}
        onSkip={firstEntry.skipFirstEntry}
      />
      {children}
    </AptGameContext.Provider>
  );
}

export function useAptGame() {
  return useContext(AptGameContext);
}

export function useAptGameRequired() {
  const ctx = useContext(AptGameContext);
  if (!ctx) throw new Error("AptGameProvider required");
  return ctx;
}
