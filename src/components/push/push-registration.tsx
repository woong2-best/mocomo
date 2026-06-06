"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function registerPushSubscription(userId: string) {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return;
  }

  const vapidRes = await fetch("/api/push/vapid", { cache: "no-store" });
  const vapid = (await vapidRes.json()) as { configured?: boolean; publicKey?: string };
  if (!vapid.configured || !vapid.publicKey) return;

  const permission = Notification.permission;
  if (permission === "denied") return;
  if (permission === "default") {
    const result = await Notification.requestPermission();
    if (result !== "granted") return;
  }

  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
    });
  }

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }),
  });

  void userId;
}

/** 로그인 후 푸시 구독 — 앱 밖·오프라인 수신 통화 알림 */
export function PushRegistration() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const triedRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !userId) return;
    if (triedRef.current === userId) return;
    triedRef.current = userId;

    const timer = window.setTimeout(() => {
      void registerPushSubscription(userId);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [status, userId]);

  return null;
}
