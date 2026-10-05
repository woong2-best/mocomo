import { useEffect } from "react";
import { StackActions } from "@react-navigation/native";
import { fetchMobileCallSync } from "@/api/calls";
import { useAuth } from "@/auth/AuthContext";
import { subscribeUserCallEvents } from "@/lib/supabase-call-signal";
import { navigateFromPush, navigationRef } from "@/navigation/navigationRef";

let shownCallId: string | null = null;

function openIncoming(callId: string) {
  if (!navigationRef.isReady() || shownCallId === callId) return;
  shownCallId = callId;
  const route = navigationRef.getCurrentRoute();
  const name = route?.name;
  const sameIncoming =
    name === "IncomingCall" &&
    route?.params &&
    "callId" in route.params &&
    route.params.callId === callId;
  if (sameIncoming) return;
  if (name === "DmCall" || name === "IncomingCall") {
    navigationRef.dispatch(StackActions.replace("IncomingCall", { callId }));
    return;
  }
  navigateFromPush("IncomingCall", { callId });
}

/** In-app ring. Realtime is a hint; sync polling still rings if that broadcast is missed. */
export function IncomingCallListener() {
  const { user, status } = useAuth();

  useEffect(() => {
    if (status !== "signedIn" || !user?.id) return;
    let cancelled = false;

    const consider = (callId: string) => {
      void fetchMobileCallSync()
        .then((data) => {
          if (cancelled || data.event !== "incoming" || data.call.id !== callId) return;
          openIncoming(callId);
        })
        .catch(() => undefined);
    };

    const unsub = subscribeUserCallEvents(user.id, (event, callId) => {
      if (event === "ring") consider(callId);
    });

    const timer = setInterval(() => {
      void fetchMobileCallSync()
        .then((data) => {
          if (cancelled) return;
          if (data.event !== "incoming") {
            shownCallId = null;
            return;
          }
          openIncoming(data.call.id);
        })
        .catch(() => undefined);
    }, 2000);

    return () => {
      cancelled = true;
      unsub();
      clearInterval(timer);
    };
  }, [status, user?.id]);

  return null;
}
