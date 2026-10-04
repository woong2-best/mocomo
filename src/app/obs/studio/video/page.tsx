import { errorText } from "@/lib/i18n/error-text";
import { MocoDonationAlertWidget } from "@/components/live/overlay/moco-donation-alert-widget";
import { verifyHostOverlayToken } from "@/lib/live-external/overlay-token";

export const dynamic = "force-dynamic";

function note(text: string) {
  return (
    <p style={{ color: "#fff", padding: 16, fontFamily: "system-ui, sans-serif", textShadow: "0 1px 2px #000" }}>
      {text}
    </p>
  );
}

/** OBS browser source — video and SFX tips. Paste from Live Studio. */
export default async function StudioObsVideoPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) return note("Missing token. Copy the video tip URL from Live Studio.");

  const verified = verifyHostOverlayToken(token, "donation");
  if (!verified.ok) return note(errorText(verified.error));

  return (
    <div style={{ background: "transparent", minHeight: "100vh", margin: 0 }}>
      <MocoDonationAlertWidget
        channelId=""
        token={token}
        apiBase="/api/overlay/studio/moco-donations"
      />
    </div>
  );
}
