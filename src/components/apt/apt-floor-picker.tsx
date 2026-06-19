"use client";

import { useEffect, useMemo, useState } from "react";
import { getOccupiedFloorsForCountry } from "@/actions/apt";
import { Button } from "@/components/ui/button";
import {
  APT_DEFAULT_FLOOR,
  APT_LOBBY_FLOOR,
  APT_PENTHOUSE_FLOOR,
  APT_TOTAL_FLOORS,
} from "@/lib/apt/constants";
import { countryFlag } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function nearestAvailableFloor(target: number, occupied: Set<number>) {
  if (!occupied.has(target)) return target;
  for (let d = 1; d < APT_TOTAL_FLOORS; d++) {
    const up = target + d;
    const down = target - d;
    if (up <= APT_TOTAL_FLOORS && !occupied.has(up)) return up;
    if (down >= APT_LOBBY_FLOOR && !occupied.has(down)) return down;
  }
  return APT_DEFAULT_FLOOR;
}

export function AptFloorPicker({
  countryCode,
  countryLabel,
  floor,
  onFloorChange,
  compact = false,
  onTakenChange,
}: {
  countryCode: string;
  countryLabel: string;
  floor: number;
  onFloorChange: (floor: number) => void;
  compact?: boolean;
  onTakenChange?: (taken: boolean) => void;
}) {
  const [occupiedFloors, setOccupiedFloors] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const occupiedSet = useMemo(() => new Set(occupiedFloors), [occupiedFloors]);
  const floorTaken = occupiedSet.has(floor);

  useEffect(() => {
    onTakenChange?.(floorTaken);
  }, [floorTaken, onTakenChange]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getOccupiedFloorsForCountry(countryCode).then((floors) => {
      if (cancelled) return;
      setOccupiedFloors(floors);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  useEffect(() => {
    if (loading || occupiedFloors.length === 0) return;
    const set = new Set(occupiedFloors);
    if (set.has(floor)) {
      onFloorChange(nearestAvailableFloor(floor, set));
    }
  }, [occupiedFloors, loading, floor, onFloorChange]);

  function handleInput(next: number) {
    const clamped = Math.min(APT_TOTAL_FLOORS, Math.max(APT_LOBBY_FLOOR, next));
    onFloorChange(clamped);
  }

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div className="text-center space-y-1">
        <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
          {countryFlag(countryCode)} {countryLabel}
        </p>
        <p
          className={cn(
            "font-display font-bold tabular-nums",
            compact ? "text-2xl" : "text-4xl",
            floorTaken ? "text-destructive" : "text-folk-terracotta"
          )}
        >
          {floor}층
        </p>
        {floor === APT_PENTHOUSE_FLOOR && (
          <p className="text-xs text-folk-cobalt font-medium">펜트하우스</p>
        )}
        {floor === APT_LOBBY_FLOOR && <p className="text-xs text-folk-cobalt font-medium">1층 · 입구</p>}
        {floorTaken && <p className="text-xs text-destructive">이미 입주 중인 층입니다</p>}
      </div>

      {loading ? (
        <p className="text-xs text-center text-muted-foreground">층 정보 불러오는 중…</p>
      ) : (
        <p className="text-xs text-center text-muted-foreground">
          입주 가능 {APT_TOTAL_FLOORS - occupiedFloors.length}층 / {APT_TOTAL_FLOORS}층
        </p>
      )}

      <input
        type="range"
        min={APT_LOBBY_FLOOR}
        max={APT_TOTAL_FLOORS}
        value={floor}
        onChange={(e) => handleInput(Number(e.target.value))}
        className="w-full accent-folk-terracotta"
        disabled={loading}
      />

      <div className="flex gap-2 items-center justify-center">
        <input
          type="number"
          min={APT_LOBBY_FLOOR}
          max={APT_TOTAL_FLOORS}
          value={floor}
          onChange={(e) => handleInput(Number(e.target.value))}
          className="w-24 rounded-xl border border-input px-2 py-1.5 text-center text-sm font-bold tabular-nums"
          disabled={loading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl text-xs"
          disabled={loading}
          onClick={() => onFloorChange(nearestAvailableFloor(floor, occupiedSet))}
        >
          가까운 빈 층
        </Button>
      </div>
    </div>
  );
}

export function isFloorTaken(floor: number, occupied: number[]) {
  return occupied.includes(floor);
}
