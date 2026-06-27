"use client";

import { memo } from "react";
import { AptGameHud } from "./apt-game-hud";
import { AptGameNav } from "./apt-game-nav";
import { AptGameMissionBanner } from "./apt-game-mission-banner";
import { AptGameMissionSheet } from "./apt-game-mission-sheet";
import { AptGameShopSheet } from "./apt-game-shop-sheet";
import { AptGameMoreSheet } from "./apt-game-more-sheet";

function AptGameShellInner() {
  return (
    <>
      <AptGameHud />
      <AptGameMissionBanner />
      <AptGameNav />
      <AptGameMissionSheet />
      <AptGameShopSheet />
      <AptGameMoreSheet />
    </>
  );
}

export const AptGameShell = memo(AptGameShellInner);
