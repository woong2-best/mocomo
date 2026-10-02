"use client";

import { useMemo, useState } from "react";
import { createDefaultFloorPlan } from "@/lib/apt/floor-plan-logic";
import { DEFAULT_BONDEE_HOME } from "@/lib/apt/bondee/types";
import { createDefaultGameState } from "@/lib/apt/game/defaults";
import { AptGameProvider } from "@/components/apt/game/apt-game-context";
import { AptGameShell } from "@/components/apt/game/apt-game-shell";
import { AptIsometricRoom } from "@/components/apt/apt-isometric-room";

/** QA 전용 — /apt 게임 쉘 + 거실 다이오라마 (로그인 없이 로컬 검증) */
export default function AptRoomPreviewPage() {
  const rooms = useMemo(() => createDefaultFloorPlan().rooms, []);
  const livingId = rooms.find((r) => r.type === "living")?.id ?? "living";
  const [activeRoomId, setActiveRoomId] = useState(livingId);
  const state = useMemo(() => ({ ...DEFAULT_BONDEE_HOME, activeRoomId }), [activeRoomId]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#e8dfd4]">
      <AptGameProvider
        enabled
        initialGame={createDefaultGameState()}
        initialEconomy={null}
        rooms={rooms.filter((r) => r.type !== "hall" && r.type !== "balcony")}
        initialRoomId={livingId}
        onRoomSelect={setActiveRoomId}
      >
        <AptIsometricRoom
          rooms={rooms}
          state={state}
          activeRoomId={activeRoomId}
          selectedItemId={null}
          onRoomSelect={setActiveRoomId}
          onItemSelect={() => undefined}
          immersive
          canEditLayout
        />
        <AptGameShell />
      </AptGameProvider>
    </div>
  );
}
