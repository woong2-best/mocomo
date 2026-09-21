import { MocoDonationAlertWidget } from "@/components/live/overlay/moco-donation-alert-widget";
import { verifyOverlayToken } from "@/lib/live-external/overlay-token";

export const dynamic = "force-dynamic";

/**
 * OBS Browser Source (명세 alias)
 * Example: /widget/alert?streamer_id={channelId}&token=...
 */
export default async function WidgetAlertPage({
  searchParams,
}: {
  searchParams: Promise<{ streamer_id?: string; token?: string; channelId?: string }>;
}) {
  const params = await searchParams;
  const channelId = (params.streamer_id ?? params.channelId ?? "").trim();
  const token = params.token?.trim() ?? "";

  if (!channelId) {
    return (
      <p style={{ color: "#fff", padding: 16, textShadow: "0 1px 2px #000" }}>
        streamer_id(또는 channelId) 쿼리가 필요합니다.
      </p>
    );
  }

  if (!token) {
    return (
      <p style={{ color: "#fff", padding: 16, textShadow: "0 1px 2px #000" }}>
        token이 필요합니다. 호스트 설정에서 OBS MOCO 도네이션 URL을 발급하세요.
      </p>
    );
  }

  const verified = verifyOverlayToken(token, { channelId, kind: "donation" });
  if (!verified.ok) {
    return (
      <p style={{ color: "#fff", padding: 16, textShadow: "0 1px 2px #000" }}>
        {verified.error}
      </p>
    );
  }

  return (
    <div style={{ background: "transparent", minHeight: "100vh", margin: 0 }}>
      <MocoDonationAlertWidget channelId={channelId} token={token} />
    </div>
  );
}
