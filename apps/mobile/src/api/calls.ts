import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type DmCallType = "AUDIO" | "VIDEO";

export type DmCallPayload = {
  id: string;
  signalingRoomId: string;
  chatRoomId: string | null;
  callType: DmCallType;
  status: string;
  caller: { id: string; username: string; image: string | null };
  callee: { id: string; username: string; image: string | null };
};

export async function initiateDmCall(input: {
  calleeId: string;
  chatRoomId: string;
  callType: DmCallType;
}) {
  return apiRequest<{ call: DmCallPayload }>(MobileApi.calls, {
    method: "POST",
    body: input,
  });
}

export async function endDmCall(callId: string) {
  return apiRequest<{ ok: boolean }>(MobileApi.callEnd(callId), {
    method: "POST",
    body: {},
  });
}

export async function acceptDmCall(callId: string) {
  return apiRequest<{ call: DmCallPayload }>(MobileApi.callAccept(callId), {
    method: "POST",
    body: {},
  });
}

export async function declineDmCall(callId: string) {
  return endDmCall(callId);
}

export type MobileCallSync =
  | { event: null }
  | { event: "declined" | "ended"; callId: string }
  | {
      event: "incoming" | "outgoing" | "active";
      call: DmCallPayload;
      peer: DmCallPayload["caller"];
    };

export async function fetchMobileCallSync() {
  return apiRequest<MobileCallSync>(MobileApi.callsSync);
}

export async function fetchMobileSocketAuthToken() {
  return apiRequest<{ token: string; expiresIn: number }>("/api/mobile/socket-auth", {
    method: "GET",
  });
}
