import { errorText } from "@/lib/i18n/error-text";
import { MocoDonationAlertWidget } from "@/components/live/overlay/moco-donation-alert-widget";
import { verifyOverlayToken } from "@/lib/live-external/overlay-token";

export const dynamic = "force-dynamic";

/**
 * OBS browser source — video and SFX tips only.
 * Idle: transparent. The player appears only while a donation is playing.
 */
export default async function OverlayVideoPage({
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
        token이 필요합니다. 호스트 설정에서 OBS 영상 후원 URL을 발급하세요.
      </p>
    );
  }

  const verified = verifyOverlayToken(token, { channelId: streamerId, kind: "donation" });
  if (!verified.ok) {
    return (
      <p style={{ color: "#fff", padding: 16, textShadow: "0 1px 2px #000" }}>
        {errorText(verified.error)}
      </p>
    );
  }

  return (
    <div style={{ background: "transparent", margin: 0 }}>
      <MocoDonationAlertWidget channelId={streamerId} token={token} />
    </div>
  );
}
