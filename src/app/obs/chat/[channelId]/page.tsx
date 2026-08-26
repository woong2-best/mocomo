import { OverlayChatClient } from "@/components/live/overlay/overlay-chat-client";
import { verifyOverlayToken } from "@/lib/live-external/overlay-token";

export const dynamic = "force-dynamic";

/**
 * OBS 전용 — 댓글(채팅)만 표시. 사이트 헤더·입력창 없음.
 * Example: /obs/chat/{channelId}?token=...
 */
export default async function ObsChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ channelId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { channelId } = await params;
  const { token } = await searchParams;

  if (!token) {
    return (
      <p style={{ color: "#fff", padding: 16, textShadow: "0 1px 2px #000" }}>
        토큰이 필요합니다. 방송 화면 호스트 대시보드에서 OBS 채팅 URL을 복사하세요.
      </p>
    );
  }

  const verified = verifyOverlayToken(token, {
    channelId,
    kind: "chat",
  });
  if (!verified.ok) {
    return (
      <p style={{ color: "#fff", padding: 16, textShadow: "0 1px 2px #000" }}>
        {verified.error}
      </p>
    );
  }

  return <OverlayChatClient channelId={channelId} token={token} />;
}
