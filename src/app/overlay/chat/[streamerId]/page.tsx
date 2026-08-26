import { OverlayChatClient } from "@/components/live/overlay/overlay-chat-client";
import { verifyOverlayToken } from "@/lib/live-external/overlay-token";

export const dynamic = "force-dynamic";

/**
 * OBS Browser Source — transparent unified chat overlay (MoCoMo + platform).
 * Example: /overlay/chat/{channelId}?token=...
 * Never embeds the stream player.
 */
export default async function OverlayChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ streamerId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { streamerId } = await params;
  const { token } = await searchParams;

  if (!token) {
    return (
      <p style={{ color: "#fff", padding: 16, textShadow: "0 1px 2px #000" }}>
        토큰이 필요합니다. 호스트 설정에서 OBS 오버레이 URL을 발급하세요.
      </p>
    );
  }

  const verified = verifyOverlayToken(token, {
    channelId: streamerId,
    kind: "chat",
  });
  if (!verified.ok) {
    return (
      <p style={{ color: "#fff", padding: 16, textShadow: "0 1px 2px #000" }}>
        {verified.error}
      </p>
    );
  }

  return <OverlayChatClient channelId={streamerId} token={token} />;
}
