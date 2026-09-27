import { useEffect } from "react";
import { StackActions } from "@react-navigation/native";
import { fetchMobileCallSync } from "@/api/calls";
import { useAuth } from "@/auth/AuthContext";
import { subscribeUserCallEvents } from "@/lib/supabase-call-signal";
import { navigateFromPush, navigationRef } from "@/navigation/navigationRef";

/** In-app ring via Supabase Realtime. Push still opens the same screen from the background. */
export function IncomingCallListener() {
  const { user, status } = useAuth();

  useEffect(() => {
    if (status !== "signedIn" || !user?.id) return;
    return subscribeUserCallEvents(user.id, (event, callId) => {
      if (event !== "ring") return;
      const route = navigationRef.getCurrentRoute();
      const name = route?.name;
      const sameIncoming =
        name === "IncomingCall" &&
        route?.params &&
        "callId" in route.params &&
        route.params.callId === callId;
      if (sameIncoming) return;
      void fetchMobileCallSync()
        .then((data) => {
          if (data.event !== "incoming" || data.call.id !== callId) return;
          if (!navigationRef.isReady()) return;
          if (name === "DmCall" || name === "IncomingCall") {
            navigationRef.dispatch(StackActions.replace("IncomingCall", { callId }));
            return;
          }
          navigateFromPush("IncomingCall", { callId });
        })
        .catch(() => undefined);
    });
  }, [status, user?.id]);

  return null;
}
