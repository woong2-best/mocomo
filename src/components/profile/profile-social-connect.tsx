"use client";

import { Card, CardContent } from "@/components/ui/card";

type ProfileSocialId = "facebook" | "instagram" | "twitter" | "naver" | "tiktok";

type ManageItem = {
  id: ProfileSocialId;
  href: string | null;
};

const CONNECT_PATH: Record<ProfileSocialId, string> = {
  facebook: "/api/auth/facebook",
  instagram: "/api/auth/instagram",
  twitter: "/api/auth/twitter",
  naver: "/api/auth/naver",
  tiktok: "/api/auth/tiktok",
};

const BUTTONS: { id: ProfileSocialId; label: string; iconSrc: string }[] = [
  { id: "facebook", label: "Facebook", iconSrc: "/brand/facebook.png" },
  { id: "instagram", label: "Instagram", iconSrc: "/brand/instagram.png" },
  { id: "twitter", label: "X", iconSrc: "/brand/twitter.png" },
  { id: "naver", label: "CHZZK", iconSrc: "/brand/chzzk.png" },
  { id: "tiktok", label: "TikTok", iconSrc: "/brand/tiktok.png" },
];

export function ProfileSocialConnect({
  connected,
  available,
  items,
}: {
  connected: ProfileSocialId[];
  available: Record<ProfileSocialId, boolean>;
  items: ManageItem[];
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-5 pb-5">
        <h2 className="text-base font-semibold">More Connect Moment</h2>
        <div className="mt-4 flex flex-wrap items-start gap-5">
          {BUTTONS.map((btn) => {
            const item = items.find((row) => row.id === btn.id);
            const isOn = connected.includes(btn.id);
            const connectHref = `${CONNECT_PATH[btn.id]}?returnTo=${encodeURIComponent("/settings/profile")}`;
            const pageHref = item?.href ?? null;
            const img = (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={btn.iconSrc}
                alt=""
                className={`h-9 w-9 object-contain${available[btn.id] || isOn ? "" : " opacity-40"}`}
                width={36}
                height={36}
              />
            );
            if (available[btn.id]) {
              return (
                <a
                  key={btn.id}
                  href={connectHref}
                  aria-label={`Connect ${btn.label}`}
                  title={`Connect ${btn.label}`}
                  className="inline-flex"
                >
                  {img}
                </a>
              );
            }
            if (isOn && pageHref) {
              return (
                <a
                  key={btn.id}
                  href={pageHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={btn.label}
                  title={btn.label}
                  className="inline-flex"
                >
                  {img}
                </a>
              );
            }
            return (
              <span key={btn.id} className="inline-flex" title={btn.label}>
                {img}
              </span>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
