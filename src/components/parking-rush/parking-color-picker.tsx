"use client";

import { CAR_COLOR_PRESETS, type CarColorId } from "@/lib/minigames/parking-rush-logic";
import { cn } from "@/lib/utils";

type Props = {
  value: CarColorId;
  onChange: (id: CarColorId) => void;
};

export function ParkingColorPicker({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-cyan-100">차량 색상</p>
      <div className="flex flex-wrap gap-2">
        {CAR_COLOR_PRESETS.map((c) => (
          <button
            key={c.id}
            type="button"
            title={c.label}
            onClick={() => onChange(c.id)}
            className={cn(
              "h-9 w-9 rounded-full border-2 transition-transform",
              value === c.id ? "border-white scale-110" : "border-white/20"
            )}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>
    </div>
  );
}
