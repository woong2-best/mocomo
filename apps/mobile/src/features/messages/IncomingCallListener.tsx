import { useEffect } from "react";
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
      const route = navigationRef.getCurrentRoute()?.name;
      if (route === "IncomingCall" || route === "DmCall") return;
      void fetchMobileCallSync()
        .then((data) => {
          if (data.event === "incoming" && data.call.id === callId) {
            navigateFromPush("IncomingCall", { callId });
          }
        })
        .catch(() => undefined);
    });
  }, [status, user?.id]);

  return null;
}
