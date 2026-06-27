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
} from "react";
import type { AptGameToastKind } from "./apt-game-toast";
import { useRouter } from "next/navigation";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { createDefaultGameState } from "@/lib/apt/game/defaults";
import type { AptGameState, AptGameTab, AptGameView } from "@/lib/apt/game/types";
import {
  claimAptMission,
  purchaseAptSticker,
  reportAptGameEvent,
  boostAptEnergy,
} from "@/actions/apt-game";
import { energyRegenLabel } from "@/lib/apt/game/energy";

type AptGameContextValue = {
  game: AptGameState;
  userLevel: number;
  userAvatarUrl: string | null;
  userName: string | null;
  activeTab: AptGameTab;
  view: AptGameView;
  editMode: boolean;
  paletteOpen: boolean;
  missionOpen: boolean;
  shopOpen: boolean;
  moreOpen: boolean;
  activeRoomId: string | null;
  setActiveTab: (tab: AptGameTab) => void;
  setView: (view: AptGameView) => void;
  setEditMode: (v: boolean) => void;
  setPaletteOpen: (v: boolean) => void;
  setMissionOpen: (v: boolean) => void;
  setShopOpen: (v: boolean) => void;
  setMoreOpen: (v: boolean) => void;
  setActiveRoomId: (id: string) => void;
  enterRoom: (roomId: string) => void;
  enterOverview: () => void;
  purchaseSticker: (typeId: string) => Promise<{ ok?: boolean; error?: string }>;
  claimMission: (id: string) => Promise<{ ok?: boolean; error?: string }>;
  onStickerPlaced: (typeId: string, roomId: string) => Promise<{ error?: string }>;
  onVisitFriend: () => void;
  boostEnergy: () => Promise<void>;
  energyRegenLabel: string | null;
  rooms: AptRoom[];
  toast: string | null;
  toastKind: AptGameToastKind;
  showToast: (message: string, kind?: AptGameToastKind) => void;
  onExitHome?: () => void;
  primaryMission: AptGameState["missions"][0] | null;
  dailyDone: number;
  dailyTotal: number;
};

const AptGameContext = createContext<AptGameContextValue | null>(null);

export function AptGameProvider({
  children,
  initialGame,
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
  const [activeTab, setActiveTabState] = useState<AptGameTab>("home");
  const [view, setView] = useState<AptGameView>("overview");
  const [editMode, setEditMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [activeRoomId, setActiveRoomIdState] = useState(initialRoomId);
  const [toast, setToast] = useState<string | null>(null);
  const [toastKind, setToastKind] = useState<AptGameToastKind>("default");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, kind: AptGameToastKind = "default") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    setToastKind(kind);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

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
        setView("overview");
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
    [activeRoomId, onRoomSelect, rooms, router]
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

  const purchaseSticker = useCallback(async (typeId: string) => {
    const res = await purchaseAptSticker(typeId);
    if ("error" in res && res.error) return { error: res.error };
    if ("game" in res && res.game) setGame(res.game);
    setShopOpen(false);
    setActiveTabState("furniture");
    setEditMode(true);
    setPaletteOpen(true);
    showToast("구매 완료! 가구 탭에서 배치하세요 ✦", "gold");
    return { ok: true };
  }, [showToast]);

  const claimMission = useCallback(async (id: string) => {
    const res = await claimAptMission(id);
    if ("error" in res && res.error) return { error: res.error };
    if ("game" in res && res.game) setGame(res.game);
    if ("reward" in res && res.reward) {
      showToast(`+${res.reward.gold}G · +${res.reward.gems}💎 · ⚡+5`, "mission");
    }
    return { ok: true };
  }, [showToast]);

  const onStickerPlaced = useCallback(async (typeId: string, roomId: string) => {
    const next = await reportAptGameEvent({ type: "place_sticker", typeId, roomId });
    if (!next) return {};
    if ("error" in next) return { error: next.error };
    setGame(next);
    return {};
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
      userLevel,
      userAvatarUrl,
      userName,
      activeTab,
      view,
      editMode,
      paletteOpen,
      missionOpen,
      shopOpen,
      moreOpen,
      activeRoomId,
      setActiveTab,
      setView,
      setEditMode,
      setPaletteOpen,
      setMissionOpen,
      setShopOpen,
      setMoreOpen,
      setActiveRoomId,
      enterRoom,
      enterOverview,
      purchaseSticker,
      claimMission,
      onStickerPlaced,
      onVisitFriend,
      boostEnergy,
      energyRegenLabel: regenLabel,
      rooms,
      toast,
      toastKind,
      showToast,
      onExitHome,
      primaryMission,
      dailyDone,
      dailyTotal,
    }),
    [
      game,
      userLevel,
      userAvatarUrl,
      userName,
      activeTab,
      view,
      editMode,
      paletteOpen,
      missionOpen,
      shopOpen,
      moreOpen,
      activeRoomId,
      setActiveTab,
      setActiveRoomId,
      enterRoom,
      enterOverview,
      purchaseSticker,
      claimMission,
      onStickerPlaced,
      onVisitFriend,
      boostEnergy,
      regenLabel,
      rooms,
      toast,
      toastKind,
      showToast,
      onExitHome,
      primaryMission,
      dailyDone,
      dailyTotal,
    ]
  );

  if (!enabled) return <>{children}</>;

  return <AptGameContext.Provider value={value}>{children}</AptGameContext.Provider>;
}

export function useAptGame() {
  return useContext(AptGameContext);
}

export function useAptGameRequired() {
  const ctx = useContext(AptGameContext);
  if (!ctx) throw new Error("AptGameProvider required");
  return ctx;
}
