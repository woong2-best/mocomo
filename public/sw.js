/* MoCoMo — 수신 통화 Web Push (앱 밖·오프라인 알림) */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "MoCoMo", body: event.data?.text() || "" };
  }

  if (data.type !== "incoming_call") {
    const title = data.title || "MoCoMo";
    const options = {
      body: data.body || "",
      icon: data.icon || "/mocomo-logo.png",
      badge: data.badge || "/mocomo-logo.png",
      data: { url: data.url || "/" },
      tag: data.tag || "mocomo",
    };
    event.waitUntil(self.registration.showNotification(title, options));
    return;
  }

  const title = data.title || "수신 통화";
  const options = {
    body: data.body || "통화가 왔습니다",
    icon: data.icon || "/mocomo-logo.png",
    badge: data.badge || "/mocomo-logo.png",
    tag: data.tag || `call-${data.callId}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [180, 80, 180, 80, 180],
    silent: false,
    data: {
      url: data.url || "/",
      callId: data.callId,
      type: "incoming_call",
    },
    actions: [
      { action: "accept", title: "받기" },
      { action: "decline", title: "거절" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const callId = data.callId;
  const action = event.action;

  let target = data.url || "/";
  if (action === "accept" && callId) {
    target = `/?incomingCall=${encodeURIComponent(callId)}&accept=1`;
  } else if (action === "decline" && callId) {
    target = `/?incomingCall=${encodeURIComponent(callId)}&decline=1`;
  } else if (callId) {
    target = `/?incomingCall=${encodeURIComponent(callId)}`;
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(target);
      }
    })
  );
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
