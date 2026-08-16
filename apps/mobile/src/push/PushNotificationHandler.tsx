import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/auth/AuthContext";
import { navigateFromPush, navigationRef } from "@/navigation/navigationRef";
import {
  registerForPushNotifications,
  routeFromPushData,
  unregisterPushNotifications,
} from "@/push/push-registration";

function handleNotificationNavigation(data: Record<string, unknown> | undefined) {
  const route = routeFromPushData(data);
  if (!route) return;

  const tryNav = () => {
    if (navigationRef.isReady()) {
      if (route.params !== undefined) {
        navigateFromPush(route.screen, route.params);
      } else {
        navigateFromPush(route.screen);
      }
      return true;
    }
    return false;
  };

  if (!tryNav()) {
    const id = setInterval(() => {
      if (tryNav()) clearInterval(id);
    }, 200);
    setTimeout(() => clearInterval(id), 8000);
  }
}

/** Registers device token + routes notification taps (background/killed → open). */
export function PushNotificationHandler() {
  const { status } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (status !== "signedIn") {
      registeredRef.current = false;
      return;
    }

    if (!registeredRef.current) {
      registeredRef.current = true;
      void registerForPushNotifications().catch(() => undefined);
    }

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification.request.content.data) {
        handleNotificationNavigation(
          response.notification.request.content.data as Record<string, unknown>
        );
      }
    });

    const subReceive = Notifications.addNotificationReceivedListener(() => {
      /* OS shows banner when app backgrounded */
    });

    const subResponse = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationNavigation(
        response.notification.request.content.data as Record<string, unknown>
      );
    });

    return () => {
      subReceive.remove();
      subResponse.remove();
    };
  }, [status]);

  useEffect(() => {
    if (status === "signedOut") {
      void unregisterPushNotifications().catch(() => undefined);
    }
  }, [status]);

  return null;
}
