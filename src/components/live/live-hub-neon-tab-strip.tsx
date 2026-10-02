"use client";

import type { LiveFolderFilter } from "@/components/live/live-folder-rail";
import { LiveHubNeonTabsGraphic } from "@/components/live/live-hub-neon-tabs-graphic";
import { LIVE_HUB_NEON_THEME } from "@/components/live/live-hub-neon-theme";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

/** Design reference width — strip scales to fit the content column (no horizontal scroll). */
export const LIVE_NEON_TABS_DESIGN_WIDTH = 1680;
const VIEWBOX_WIDTH = 2576;
const VIEWBOX_X0 = 32;

const TABS: {
  id: LiveFolderFilter;
  label: string;
  x: number;
  w: number;
}[] = [
  { id: "ALL", label: "ALL", x: 480, w: 230 },
  { id: "FOLLOWING", label: "FOLLOW", x: 714, w: 236 },
  { id: "GAME", label: "GAME", x: 954, w: 243 },
  { id: "JUST_CHATTING", label: "CHAT", x: 1201, w: 238 },
  { id: "IRL", label: "FESTIVAL", x: 1443, w: 243 },
  { id: "MUSIC", label: "MUSIC", x: 1690, w: 236 },
  { id: "LIVE", label: "R-18", x: 1930, w: 230 },
];

function tabStyle(x: number, w: number) {
  const leftPct = ((x - VIEWBOX_X0) / VIEWBOX_WIDTH) * 100;
  const widthPct = (w / VIEWBOX_WIDTH) * 100;
  return { left: `${leftPct}%`, width: `${widthPct}%` };
}

export function LiveHubNeonTabStrip({
  active,
  onSelect,
  disabled,
}: {
  active: LiveFolderFilter;
  onSelect: (id: LiveFolderFilter) => void;
  disabled?: boolean;
}) {
  const { t } = useLocale();
  const bloom = (LIVE_HUB_NEON_THEME[active] ?? LIVE_HUB_NEON_THEME.ALL).cssBloom;

  return (
    <div
      className={cn(
        "live-hub-neon-tabs-scroll min-w-0 w-full",
        disabled && "pointer-events-none opacity-70"
      )}
    >
      <div
        className="live-hub-neon-tabs-strip w-full live-hub-neon-tabs-strip--themed"
        role="tablist"
        aria-label={t("live.hub.categoryAria")}
        style={{ ["--live-hub-neon-bloom" as string]: bloom }}
      >
        <LiveHubNeonTabsGraphic active={active} />
        {TABS.map((tab) => {
          const on = tab.id === active;
          const pos = tabStyle(tab.x, tab.w);
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={tab.label}
              disabled={disabled}
              className="live-hub-neon-tab-hit"
              style={pos}
              onClick={() => onSelect(tab.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
