"use client";

import { ProfileSocialMark } from "@/components/profile/profile-social-mark";
import { Card, CardContent } from "@/components/ui/card";
import type { ProfileConnectId } from "@/lib/profile-social";

type ManageItem = {
  id: ProfileConnectId;
  href: string | null;
};

const CONNECT_PATH: Record<ProfileConnectId, string> = {
  youtube: "/api/profile/streaming-connect/youtube",
  twitch: "/api/profile/streaming-connect/twitch",
  facebook: "/api/auth/facebook",
  instagram: "/api/auth/instagram",
  twitter: "/api/auth/twitter",
  discord: "/api/auth/discord",
  naver: "/api/auth/naver",
  tiktok: "/api/auth/tiktok",
};

const BUTTONS: { id: ProfileConnectId; label: string; iconSrc: string }[] = [
  { id: "youtube", label: "YouTube", iconSrc: "/brand/youtube.svg" },
  { id: "twitch", label: "Twitch", iconSrc: "/brand/twitch.svg" },
  { id: "facebook", label: "Facebook", iconSrc: "/brand/facebook.png" },
  { id: "instagram", label: "Instagram", iconSrc: "/brand/instagram.png" },
  { id: "twitter", label: "X", iconSrc: "/brand/twitter.png" },
  { id: "discord", label: "Discord", iconSrc: "/brand/discord.png" },
  { id: "naver", label: "CHZZK", iconSrc: "/brand/chzzk.png" },
  { id: "tiktok", label: "TikTok", iconSrc: "/brand/tiktok.png" },
];

export function ProfileSocialConnect({
  connected,
  available,
  items,
}: {
  connected: ProfileConnectId[];
  available: Record<ProfileConnectId, boolean>;
  items: ManageItem[];
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-5 pb-5">
        <h2 className="text-base font-semibold">More Connect Moment</h2>
        <div className="mt-4 flex flex-wrap items-center gap-5">
          {BUTTONS.map((btn) => {
            const item = items.find((row) => row.id === btn.id);
            const isOn = connected.includes(btn.id);
            const canConnect = available[btn.id] || Boolean(item);
            const connectHref = `${CONNECT_PATH[btn.id]}?returnTo=${encodeURIComponent("/settings/profile")}`;
            const pageHref = item?.href ?? null;
            const img = (
              <ProfileSocialMark
                id={btn.id}
                iconSrc={btn.iconSrc}
                dimmed={!(canConnect || isOn)}
              />
            );
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
            if (canConnect) {
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
