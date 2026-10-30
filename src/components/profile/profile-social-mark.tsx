import type { ProfileConnectId } from "@/lib/profile-social";
import { profileSocialIconScale } from "@/lib/profile-social";

const BOX = 36;

export function ProfileSocialMark({
  id,
  iconSrc,
  dimmed = false,
}: {
  id: ProfileConnectId;
  iconSrc: string;
  dimmed?: boolean;
}) {
  const scale = profileSocialIconScale(id);
  const px = Math.round(BOX * scale);
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center overflow-visible">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={iconSrc}
        alt=""
        className={`object-contain${dimmed ? " opacity-40" : ""}`}
        style={{ width: px, height: px }}
        width={px}
        height={px}
        decoding="async"
      />
    </span>
  );
}
