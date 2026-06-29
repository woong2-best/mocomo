"use client";

import { memo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { X } from "lucide-react";
import { buildAptMailboxUrl } from "@/lib/apt/mailbox-compose-route";
import { useAptGameRequired } from "./apt-game-context";

function AptGameMoreSheetInner() {
  const { moreOpen, setMoreOpen, setActiveTab, onExitHome } = useAptGameRequired();
  const { data: session } = useSession();
  const username = session?.user?.username;

  if (!moreOpen) return null;

  const links = [
    { href: "/feed", label: "커뮤니티" },
    { href: "/messages", label: "메시지" },
    { href: buildAptMailboxUrl(), label: "우편함" },
    { href: "/live", label: "라이브" },
    { href: "/games", label: "미니게임" },
    { href: "/discover", label: "매칭" },
    { href: "/events", label: "이벤트" },
    ...(username ? [{ href: `/u/${username}`, label: "내 프로필" }] : []),
    { href: "/settings", label: "설정" },
  ];

  return (
    <div className="pointer-events-auto absolute inset-0 z-[100] flex flex-col justify-end bg-black/45 backdrop-blur-[2px]">
      <div className="apt-game-sheet rounded-t-[1.75rem] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-black text-[#5c4033]">더보기</h2>
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              setActiveTab("home");
            }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-2xl apt-game-shop-card px-4 py-3 text-center text-[12px] font-bold text-[#5c4033]"
            >
              {l.label}
            </Link>
          ))}
          {onExitHome && (
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                onExitHome();
              }}
              className="col-span-2 rounded-2xl border border-[#d4c4b0] bg-[#efe6da] px-4 py-3 text-center text-[12px] font-bold text-[#5c4033] active:scale-95"
            >
              복도 · 타워로 나가기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const AptGameMoreSheet = memo(AptGameMoreSheetInner);
