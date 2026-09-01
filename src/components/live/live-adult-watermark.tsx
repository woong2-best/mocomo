"use client";

import Image from "next/image";

/** 19+ 성인 방송 썸네일 중앙 워터마크 */
export function LiveAdultWatermark({ className }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[2] flex items-center justify-center ${className ?? ""}`}
      aria-hidden
    >
      <Image
        src="/images/live-adult-19-badge.png"
        alt=""
        width={88}
        height={88}
        className="h-[22%] min-h-[52px] max-h-[96px] w-auto drop-shadow-lg"
        unoptimized
      />
    </div>
  );
}

export function isLiveAdultChannel(ch: { isNsfw?: boolean; contentRating?: string | null }) {
  return ch.isNsfw === true || ch.contentRating === "ADULT";
}
