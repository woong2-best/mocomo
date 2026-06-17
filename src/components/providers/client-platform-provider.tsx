"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CLIENT_PLATFORM_COOKIE,
  CLIENT_PLATFORM_MAX_AGE,
  type ClientPlatform,
  isAppHostname,
  isNativeAppPlatform,
  resolveClientPlatformInBrowser,
} from "@/lib/client-platform";

type ClientPlatformContextValue = {
  platform: ClientPlatform;
  isNativeApp: boolean;
};

const ClientPlatformContext = createContext<ClientPlatformContextValue>({
  platform: "web",
  isNativeApp: false,
});

function persistAppCookie() {
  document.cookie = `${CLIENT_PLATFORM_COOKIE}=app; path=/; max-age=${CLIENT_PLATFORM_MAX_AGE}; samesite=lax`;
}

function clearAppCookie() {
  document.cookie = `${CLIENT_PLATFORM_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

function detectCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

export function ClientPlatformProvider({
  initialPlatform,
  children,
}: {
  initialPlatform: ClientPlatform;
  children: ReactNode;
}) {
  const [platform, setPlatform] = useState<ClientPlatform>(() => {
    if (initialPlatform === "app") return "app";
    return "web";
  });

  useEffect(() => {
    const hostname = window.location.hostname;
    const next = resolveClientPlatformInBrowser({
      hostname,
      initialPlatform,
      isCapacitorNative: detectCapacitorNative(),
    });
    setPlatform(next);
    document.documentElement.dataset.client = next;

    if (next === "app" && isAppHostname(hostname)) {
      persistAppCookie();
    } else if (!isAppHostname(hostname)) {
      clearAppCookie();
    }
  }, [initialPlatform]);

  const value = useMemo(
    () => ({
      platform,
      isNativeApp: isNativeAppPlatform(platform),
    }),
    [platform]
  );

  return (
    <ClientPlatformContext.Provider value={value}>{children}</ClientPlatformContext.Provider>
  );
}

export function useClientPlatform() {
  return useContext(ClientPlatformContext);
}
