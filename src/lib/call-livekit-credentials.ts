import { CallType } from "@prisma/client";
import { createLivekitToken, getLivekitUrl, isLivekitConfigured } from "@/lib/livekit";

export type CallLivekitCredentials = { token: string; serverUrl: string };

export async function issueCallLivekitCredentials(
  livekitRoom: string,
  userId: string,
  displayName: string,
  callType: CallType
): Promise<CallLivekitCredentials | null> {
  if (!isLivekitConfigured()) return null;
  const token = await createLivekitToken(livekitRoom, userId, displayName, {
    audioOnly: callType === CallType.AUDIO,
    publish: true,
  });
  if (!token) return null;
  const serverUrl = getLivekitUrl();
  if (!serverUrl) return null;
  return { token, serverUrl };
}
