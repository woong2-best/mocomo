import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

/** Foreground — still show banner like Twitter/Instagram */
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const type = notification.request.content.data?.type;
    return {
      shouldShowAlert: true,
      shouldPlaySound: type === "incoming_call",
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

let cachedToken: string | null = null;

export function getCachedPushToken() {
  return cachedToken;
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "알림",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync("messages", {
      name: "메시지",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
    await Notifications.setNotificationChannelAsync("calls", {
      name: "통화",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      sound: "default",
    });
  }

  const tokenResult = await Notifications.getDevicePushTokenAsync();
  const token = typeof tokenResult.data === "string" ? tokenResult.data : null;
  if (!token) return null;

  await apiRequest(MobileApi.pushRegister, {
    method: "POST",
    auth: true,
    body: {
      token,
      platform: Platform.OS === "ios" ? "ios" : "android",
    },
  });

  cachedToken = token;
  return token;
}

export async function unregisterPushNotifications(): Promise<void> {
  const token = cachedToken;
  cachedToken = null;
  if (!token) {
    await apiRequest(MobileApi.pushRegister, { method: "DELETE", auth: true }).catch(() => undefined);
    return;
  }
  await apiRequest(`${MobileApi.pushRegister}?token=${encodeURIComponent(token)}`, {
    method: "DELETE",
    auth: true,
  }).catch(() => undefined);
}

export function parsePushPayload(data: Record<string, unknown> | undefined) {
  if (!data) return null;
  const deeplink = typeof data.deeplink === "string" ? data.deeplink : null;
  const type = typeof data.type === "string" ? data.type : null;
  const roomId = typeof data.roomId === "string" ? data.roomId : null;
  const callId = typeof data.callId === "string" ? data.callId : null;
  const callType =
    data.callType === "VIDEO" || data.callType === "AUDIO" ? data.callType : "AUDIO";
  const chatRoomId = typeof data.chatRoomId === "string" ? data.chatRoomId : null;
  return { deeplink, type, roomId, callId, callType, chatRoomId };
}

export function routeFromPushData(data: Record<string, unknown> | undefined) {
  const parsed = parsePushPayload(data);
  if (!parsed) return null;

  if (parsed.deeplink?.startsWith("mocomo://messages/")) {
    const roomId = parsed.deeplink.replace("mocomo://messages/", "").split(/[?#]/)[0];
    if (roomId) return { screen: "MessageRoom" as const, params: { roomId } };
  }
  if (parsed.deeplink?.startsWith("mocomo://call/") || parsed.type === "incoming_call") {
    const callId =
      parsed.callId || parsed.deeplink?.replace("mocomo://call/", "").split(/[?#]/)[0];
    if (callId) return { screen: "IncomingCall" as const, params: { callId } };
  }
  if (parsed.roomId) {
    return { screen: "MessageRoom" as const, params: { roomId: parsed.roomId } };
  }
  if (parsed.deeplink === "mocomo://activity") {
    return { screen: "Activity" as const, params: undefined };
  }
  return { screen: "Activity" as const, params: undefined };
}
