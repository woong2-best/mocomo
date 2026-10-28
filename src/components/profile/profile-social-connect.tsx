import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  PROFILE_SOCIAL_CONNECT_PATH,
  type ProfileSocialId,
} from "@/lib/profile-social";

const BUTTONS: {
  id: ProfileSocialId;
  label: string;
  iconSrc: string;
  invert?: boolean;
}[] = [
  { id: "facebook", label: "Facebook", iconSrc: "/brand/facebook.png", invert: true },
  { id: "instagram", label: "Instagram", iconSrc: "/brand/instagram.png" },
  { id: "twitter", label: "X", iconSrc: "/brand/twitter.png", invert: true },
  { id: "naver", label: "CHZZK", iconSrc: "/brand/chzzk.png" },
];

export function ProfileSocialConnect({
  connected,
  available,
}: {
  connected: ProfileSocialId[];
  available: Record<ProfileSocialId, boolean>;
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-5 pb-5">
        <h2 className="text-base font-semibold">More Connect Moment</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {BUTTONS.map((btn) => {
            const isOn = connected.includes(btn.id);
            const href = `${PROFILE_SOCIAL_CONNECT_PATH[btn.id]}?returnTo=${encodeURIComponent("/settings/profile")}`;
            const disabled = !available[btn.id] || isOn;
            const className = `inline-flex h-11 w-11 items-center justify-center rounded-xl transition ${
              btn.invert ? "bg-black" : ""
            } ${isOn ? "opacity-100" : "opacity-45 hover:opacity-80"} ${
              disabled && !isOn ? "pointer-events-none" : ""
            }`;
            const img = (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={btn.iconSrc}
                alt=""
                className="h-8 w-8 object-contain"
                width={32}
                height={32}
              />
            );
            if (isOn || disabled) {
              return (
                <span
                  key={btn.id}
                  aria-label={isOn ? `${btn.label} connected` : btn.label}
                  title={isOn ? `${btn.label} connected` : `${btn.label} is not configured`}
                  className={className}
                >
                  {img}
                </span>
              );
            }
            return (
              <Link
                key={btn.id}
                href={href}
                aria-label={`Connect ${btn.label}`}
                title={`Connect ${btn.label}`}
                className={className}
              >
                {img}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
