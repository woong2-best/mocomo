"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { setSocialDisplayed } from "@/actions/profile-social";

type ProfileSocialId = "facebook" | "instagram" | "twitter" | "naver" | "tiktok";

type ManageItem = {
  id: ProfileSocialId;
  href: string | null;
  displayed: boolean;
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
  const router = useRouter();
  const [busy, setBusy] = useState<ProfileSocialId | null>(null);

  async function toggleDisplay(id: ProfileSocialId, displayed: boolean) {
    if (busy) return;
    setBusy(id);
    await setSocialDisplayed(id, displayed);
    router.refresh();
    setBusy(null);
  }

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
            return (
              <div key={btn.id} className="flex flex-col items-center gap-2">
                {isOn && pageHref ? (
                  <a
                    href={pageHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={btn.label}
                    title={btn.label}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={btn.iconSrc}
                      alt=""
                      className="h-9 w-9 object-contain"
                      width={36}
                      height={36}
                    />
                  </a>
                ) : isOn ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={btn.iconSrc}
                    alt=""
                    className="h-9 w-9 object-contain"
                    width={36}
                    height={36}
                  />
                ) : available[btn.id] ? (
                  <a href={connectHref} aria-label={`Connect ${btn.label}`} title={`Connect ${btn.label}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={btn.iconSrc}
                      alt=""
                      className="h-9 w-9 object-contain"
                      width={36}
                      height={36}
                    />
                  </a>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={btn.iconSrc}
                    alt=""
                    className="h-9 w-9 object-contain opacity-40"
                    width={36}
                    height={36}
                  />
                )}
                {isOn ? (
                  <button
                    type="button"
                    disabled={busy === btn.id}
                    onClick={() => void toggleDisplay(btn.id, !item?.displayed)}
                    className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {item?.displayed ? "숨기기" : "표시하기"}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
