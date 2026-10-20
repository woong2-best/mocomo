"use client";

import { useEffect } from "react";
import {
  HOME_CHROME_DEFAULTS,
  isSafeHomeChromeUrl,
  type HomeChromeSlot,
  type HomeChromeUrls,
} from "@/lib/home-chrome-shared";

const VAR_NAME: Record<HomeChromeSlot, string> = {
  sidebar: "--home-sidebar-image",
  hero: "--home-hero-image",
};

function writeVar(slot: HomeChromeSlot, custom: string | null) {
  const root = document.documentElement;
  const name = VAR_NAME[slot];
  if (custom == null) {
    root.style.setProperty(name, `url("${HOME_CHROME_DEFAULTS[slot]}")`);
    return;
  }
  if (!isSafeHomeChromeUrl(custom)) return;
  root.style.setProperty(name, `url("${custom}")`);
}

/** Applies the live URLs in this tab. Null uses the built-in photo. */
export function applyHomeChromeVars(urls: HomeChromeUrls) {
  writeVar("sidebar", urls.sidebarImageUrl);
  writeVar("hero", urls.heroImageUrl);
}

/** Corrects a stale static shell after hydration. Leaves the page alone if the request fails. */
export function HomeChromeSync() {
  useEffect(() => {
    let cancel = false;
    fetch("/api/home-chrome", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (cancel || !data || typeof data !== "object") return;
        const row = data as Record<string, unknown>;
        applyHomeChromeVars({
          sidebarImageUrl: typeof row.sidebarImageUrl === "string" ? row.sidebarImageUrl : null,
          heroImageUrl: typeof row.heroImageUrl === "string" ? row.heroImageUrl : null,
        });
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);
  return null;
}
