"use client";

import { cn } from "@/lib/utils";

export function studioChip(active: boolean, className?: string) {
  return cn(
    "px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all",
    active
      ? "border-folk-terracotta bg-folk-gold/25 text-folk-cobalt shadow-folk-sm"
      : "border-[hsl(var(--folk-cobalt)/0.18)] bg-card text-muted-foreground hover:border-folk-terracotta/45 hover:text-foreground",
    className
  );
}

export function studioChipSm(active: boolean, className?: string) {
  return cn(
    "rounded-xl text-[11px] font-semibold border-2 transition-all",
    active
      ? "border-folk-terracotta bg-folk-gold/22 text-foreground shadow-folk-sm"
      : "border-[hsl(var(--folk-cobalt)/0.15)] bg-card/80 text-muted-foreground hover:border-folk-cobalt/30",
    className
  );
}

export function studioSwatchRing(active: boolean) {
  return cn(
    "border-2 transition-transform hover:scale-105",
    active
      ? "border-folk-terracotta ring-2 ring-folk-gold/50 ring-offset-2 ring-offset-card scale-110"
      : "border-[hsl(var(--folk-cobalt)/0.2)]"
  );
}

export function StudioSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="text-foreground tabular-nums font-semibold">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none bg-muted accent-folk-terracotta cursor-pointer"
      />
    </div>
  );
}

export function StudioSegmentTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 rounded-xl bg-muted/50 border border-[hsl(var(--folk-cobalt)/0.12)] p-1",
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex-1 min-w-0 px-2 py-1.5 text-[11px] font-bold rounded-lg transition-colors",
            value === tab.id
              ? "bg-card text-folk-cobalt shadow-folk-sm border border-[hsl(var(--folk-cobalt)/0.15)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function StudioPanel({
  title,
  children,
  className,
  action,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <aside className={cn("live-studio-panel flex flex-col min-h-0 overflow-hidden", className)}>
      <div className="px-4 py-3 border-b-2 border-[hsl(var(--folk-cobalt)/0.12)] bg-folk-gold/10 shrink-0 flex items-center justify-between gap-2">
        <h2 className="text-sm font-display font-bold text-folk-cobalt">{title}</h2>
        {action}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-card/50">{children}</div>
    </aside>
  );
}

export function StudioSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group space-y-3 rounded-xl border border-[hsl(var(--folk-cobalt)/0.1)] bg-background/60 px-3 py-2.5">
      <summary className="text-xs font-bold text-folk-cobalt cursor-pointer list-none flex items-center justify-between">
        {title}
        <span className="text-muted-foreground group-open:rotate-180 transition-transform text-[10px]">
          ▾
        </span>
      </summary>
      <div className="space-y-3 pt-1">{children}</div>
    </details>
  );
}

export function StudioToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer py-0.5">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-9 h-5 rounded-full border-2 transition-colors",
          checked
            ? "bg-folk-terracotta border-folk-terracotta"
            : "bg-muted border-[hsl(var(--folk-cobalt)/0.15)]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-4"
          )}
        />
      </button>
    </label>
  );
}
