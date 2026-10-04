import { errorText } from "@/lib/i18n/error-text";
import { OverlayDonationClient } from "@/components/live/overlay/overlay-donation-client";
import { verifyOverlayToken } from "@/lib/live-external/overlay-token";

export const dynamic = "force-dynamic";

/**
 * OBS browser source — chat tips, cheers, and chat alerts only.
 * Video tips use /widget/alert.
 * Example: /overlay/donation/{channelId}?token=...
 */
export default async function OverlayDonationPage({
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
        토큰이 필요합니다. 호스트 설정에서 OBS 후원 오버레이 URL을 발급하세요.
      </p>
    );
  }

  const verified = verifyOverlayToken(token, {
    channelId: streamerId,
    kind: "donation",
  });
  if (!verified.ok) {
    return (
      <p style={{ color: "#fff", padding: 16, textShadow: "0 1px 2px #000" }}>
        {errorText(verified.error)}
      </p>
    );
  }

  return (
    <div style={{ background: "transparent", minHeight: "100vh", margin: 0 }}>
      <OverlayDonationClient channelId={streamerId} token={token} />
    </div>
  );
}
