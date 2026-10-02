"use client";

import { createTranslator } from "@/lib/i18n/messages";

const t = createTranslator("en");
import { Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveOverlayContextOptional } from "@/components/live/overlays/live-overlay-context";
import type { LiveOverlayTextProps } from "@/lib/live-overlays/types";

export function LiveOverlayToolbar({
  compact = false,
}: {
  compact?: boolean;
}) {
  const ctx = useLiveOverlayContextOptional();
  if (!ctx?.isHost) return null;

  const { state, selectedId, addWidget, updateWidgetProps, removeWidget } = ctx;

  const selected = state.widgets.find((w) => w.id === selectedId);

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-white/20 bg-black/70 backdrop-blur-md p-2 space-y-2 text-white"
          : "rounded-xl border border-border bg-card/95 p-3 space-y-3 shadow-sm"
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`text-xs font-bold ${compact ? "text-white/90" : "text-muted-foreground"}`}>
          {t("live.s1du7aio")}
        </span>
        <Button type="button" size="sm" variant={compact ? "secondary" : "outline"} className="rounded-lg h-8 gap-1" onClick={() => addWidget("text")}>
          <Type className="h-3.5 w-3.5" />
          {t("live.svlwgx")}
        </Button>
      </div>

      {selected && (
        <div className={`space-y-2 pt-2 border-t ${compact ? "border-white/15" : "border-border"}`}>
          <p className="text-[11px] font-medium opacity-80">{t("live.s181qq72")}</p>

          <TextEditor
            props={selected.props as LiveOverlayTextProps}
            compact={compact}
            onChange={(props) => updateWidgetProps(selected.id, props)}
          />

          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="rounded-lg h-8 w-full"
            onClick={() => removeWidget(selected.id)}
          >
            {t("live.s3cmbw7")}
          </Button>
        </div>
      )}

      {!selected && state.widgets.length > 0 && (
        <p className={`text-[11px] ${compact ? "text-white/60" : "text-muted-foreground"}`}>
          {t("live.s16lmseu")}
        </p>
      )}
    </div>
  );
}

function TextEditor({
  props,
  compact,
  onChange,
}: {
  props: LiveOverlayTextProps;
  compact: boolean;
  onChange: (p: LiveOverlayTextProps) => void;
}) {
  return (
    <div className="space-y-2">
      <Input
        value={props.content}
        onChange={(e) => onChange({ ...props, content: e.target.value })}
        placeholder={t("live.sy8iho4")}
        className={compact ? "h-8 bg-black/40 border-white/20 text-white" : "h-9"}
      />
      <div className="flex flex-wrap gap-2">
        <label className="text-[10px] flex items-center gap-1">
          {t("live.s10eo4")}
          <input
            type="range"
            min={14}
            max={56}
            value={props.fontSize}
            onChange={(e) => onChange({ ...props, fontSize: Number(e.target.value) })}
          />
        </label>
        <input
          type="color"
          value={props.color}
          onChange={(e) => onChange({ ...props, color: e.target.value })}
          title={t("live.sqgi0p")}
        />
        <label className="text-[10px] flex items-center gap-1">
          <input
            type="checkbox"
            checked={props.bold}
            onChange={(e) => onChange({ ...props, bold: e.target.checked })}
          />
          {t("live.sug8n")}
        </label>
      </div>
    </div>
  );
}

