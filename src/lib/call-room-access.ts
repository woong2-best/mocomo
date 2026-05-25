import { db } from "@/lib/db";
import { CallStatus } from "@prisma/client";

const ACTIVE_STATUSES: CallStatus[] = [CallStatus.RINGING, CallStatus.ACTIVE];

export type LivekitRoomAccess =
  | { allowed: true; audioOnly?: boolean }
  | { allowed: false; reason: "CALL_NOT_FOUND" | "NOT_PARTICIPANT" | "CALL_NOT_ACTIVE" | "DB_ERROR" };

function isMissingVoiceCallTable(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const code = "code" in e ? String((e as { code: string }).code) : "";
  const msg = "message" in e ? String((e as { message: string }).message) : "";
  return code === "P2021" || /VoiceCall|does not exist/i.test(msg);
}

export async function validateLivekitCallRoom(
  roomName: string,
  userId: string
): Promise<LivekitRoomAccess> {
  if (!roomName.startsWith("call-")) return { allowed: true };

  try {
    const call = await db.voiceCall.findUnique({
      where: { livekitRoom: roomName },
      select: { id: true, callerId: true, calleeId: true, status: true },
    });
    if (!call) return { allowed: false, reason: "CALL_NOT_FOUND" };
    if (call.callerId !== userId && call.calleeId !== userId) {
      return { allowed: false, reason: "NOT_PARTICIPANT" };
    }
    if (!ACTIVE_STATUSES.includes(call.status)) {
      return { allowed: false, reason: "CALL_NOT_ACTIVE" };
    }
    return { allowed: true, audioOnly: true };
  } catch (e) {
    console.error("[validateLivekitCallRoom]", e);
    if (isMissingVoiceCallTable(e)) {
      return { allowed: false, reason: "DB_ERROR" };
    }
    throw e;
  }
}
