"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useClientPlatform } from "@/components/providers/client-platform-provider";

/** Capacitor FCM 토큰 → /api/push/mobile-register */
export function NativePushRegistration() {
  const { data: session, status } = useSession();
  const { isNativeApp } = useClientPlatform();
  const triedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isNativeApp || status !== "authenticated" || !session?.user?.id) return;
    if (triedRef.current === session.user.id) return;
    triedRef.current = session.user.id;

    let removeRegistration: (() => void) | undefined;

    const run = async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== "granted") return;

        const regListener = await PushNotifications.addListener("registration", (ev) => {
          const token = ev.value;
          if (!token) return;
          void import("@capacitor/core").then(({ Capacitor }) => {
            const plat = Capacitor.getPlatform();
            const platform = plat === "ios" ? "ios" : "android";
            return fetch("/api/push/mobile-register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ token, platform }),
            });
          });
        });

        const errListener = await PushNotifications.addListener("registrationError", () => undefined);

        await PushNotifications.register();

        removeRegistration = () => {
          void regListener.remove();
          void errListener.remove();
        };
      } catch {
        /* 플러그인 미동기화 시 무시 */
      }
    };

    const id = window.setTimeout(() => void run(), 2500);
    return () => {
      window.clearTimeout(id);
      removeRegistration?.();
    };
  }, [isNativeApp, session?.user?.id, status]);

  return null;
}
