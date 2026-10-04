import { errorText } from "@/lib/i18n/error-text";
import { OverlayChatClient } from "@/components/live/overlay/overlay-chat-client";
import { verifyHostOverlayToken } from "@/lib/live-external/overlay-token";

export const dynamic = "force-dynamic";

function note(text: string) {
  return (
    <p style={{ color: "#fff", padding: 16, fontFamily: "system-ui, sans-serif", textShadow: "0 1px 2px #000" }}>
      {text}
    </p>
  );
}

/** OBS browser source — chat. Paste from Live Studio. */
export default async function StudioObsChatPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) return note("Missing token. Copy the chat URL from Live Studio.");

  const verified = verifyHostOverlayToken(token, "chat");
  if (!verified.ok) return note(errorText(verified.error));

  return (
    <OverlayChatClient
      channelId=""
      token={token}
      feedPath="/api/overlay/studio/feed"
      platformChatPath="/api/overlay/studio/platform-chat"
    />
  );
}
