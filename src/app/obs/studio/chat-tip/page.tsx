import { errorText } from "@/lib/i18n/error-text";
import { OverlayDonationClient } from "@/components/live/overlay/overlay-donation-client";
import { verifyHostOverlayToken } from "@/lib/live-external/overlay-token";

export const dynamic = "force-dynamic";

function note(text: string) {
  return (
    <p style={{ color: "#fff", padding: 16, fontFamily: "system-ui, sans-serif", textShadow: "0 1px 2px #000" }}>
      {text}
    </p>
  );
}

/** OBS browser source — chat tips. Paste from Live Studio. */
export default async function StudioObsChatTipPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) return note("Missing token. Copy the chat tip URL from Live Studio.");

  const verified = verifyHostOverlayToken(token, "donation");
  if (!verified.ok) return note(errorText(verified.error));

  return (
    <div style={{ background: "transparent", minHeight: "100vh", margin: 0 }}>
      <OverlayDonationClient channelId="" token={token} alertsPath="/api/overlay/studio/alerts" />
    </div>
  );
}
