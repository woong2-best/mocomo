"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { createDefaultGameState } from "@/lib/apt/game/defaults";
import type { AptGameState, AptGameTab, AptGameView } from "@/lib/apt/game/types";
import {
  claimAptMission,
  purchaseAptSticker,
  reportAptGameEvent,
} from "@/actions/apt-game";

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
  onStickerPlaced: (typeId: string, roomId: string) => void;
  onVisitFriend: () => void;
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
    return { ok: true };
  }, []);

  const claimMission = useCallback(async (id: string) => {
    const res = await claimAptMission(id);
    if ("error" in res && res.error) return { error: res.error };
    if ("game" in res && res.game) setGame(res.game);
    return { ok: true };
  }, []);

  const onStickerPlaced = useCallback((typeId: string, roomId: string) => {
    void reportAptGameEvent({ type: "place_sticker", typeId, roomId }).then((next) => {
      if (next) setGame(next);
    });
  }, []);

  const onVisitFriend = useCallback(() => {
    void reportAptGameEvent({ type: "visit_friend" }).then((next) => {
      if (next) setGame(next);
    });
  }, []);

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
