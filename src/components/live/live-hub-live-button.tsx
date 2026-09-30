"use client";

import Link from "next/link";

const LIVE_BTN_SRC = "/images/live/live-hub-live-button.png?v=4";

export function LiveHubLiveButton({ href }: { href: string }) {
  return (
    <Link href={href} className="live-hub-live-neon shrink-0" aria-label="Live">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LIVE_BTN_SRC} alt="" className="live-hub-live-neon__img" draggable={false} />
    </Link>
  );
}
