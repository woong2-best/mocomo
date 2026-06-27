"use client";

import { memo } from "react";
import { AptGameHud } from "./apt-game-hud";
import { AptGameNav } from "./apt-game-nav";
import { AptGameMissionBanner } from "./apt-game-mission-banner";
import { AptGameMissionSheet } from "./apt-game-mission-sheet";
import { AptGameShopSheet } from "./apt-game-shop-sheet";
import { AptGameMoreSheet } from "./apt-game-more-sheet";
import { AptGameSideActions } from "./apt-game-side-actions";
import { AptGameToast } from "./apt-game-toast";
import { AptGameRoomSwitcher } from "./apt-game-room-switcher";
import { useAptGameRequired } from "./apt-game-context";

function AptGameShellInner() {
  const { toast, toastKind, rooms, editMode, view } = useAptGameRequired();

  return (
    <>
      {!editMode && <AptGameHud />}
      <AptGameToast message={toast} kind={toastKind} />
      {!editMode && <AptGameMissionBanner />}
      {view === "room" && !editMode && <AptGameRoomSwitcher rooms={rooms} />}
      <AptGameSideActions />
      <AptGameNav />
      <AptGameMissionSheet />
      <AptGameShopSheet />
      <AptGameMoreSheet />
    </>
  );
}

export const AptGameShell = memo(AptGameShellInner);
