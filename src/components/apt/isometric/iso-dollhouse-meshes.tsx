"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import {
  buildPremiumDollhouseGroup,
  disposePremiumDollhouse,
  fitDollhouseScale,
} from "@/lib/apt/bondee/dollhouse-shell";

export function IsoDollhouseMeshes({
  rooms,
  highlightRoomId,
}: {
  rooms: AptRoom[];
  highlightRoomId?: string | null;
}) {
  const visibleRoomIds = useMemo(
    () => new Set(rooms.filter((r) => r.type !== "balcony").map((r) => r.id)),
    [rooms]
  );

  const group = useMemo(
    () =>
      buildPremiumDollhouseGroup({
        rooms,
        scale: fitDollhouseScale(),
        highlightRoomId,
        visibleRoomIds,
      }),
    [rooms, highlightRoomId, visibleRoomIds]
  );

  useEffect(() => () => disposePremiumDollhouse(group), [group]);

  return <primitive object={group} />;
}
