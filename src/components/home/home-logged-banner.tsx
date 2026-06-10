"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FolkBrushDivider } from "@/components/brand/folk-decor";
import { FolkThemeCelestial } from "@/components/brand/folk-theme-celestial";
import { ComposeForm } from "@/components/compose/compose-form";

export function HomeLoggedBanner() {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const [postedMsg, setPostedMsg] = useState(false);

  return (
    <div className="folk-hero-banner !p-4 sm:!p-5 !mb-5">
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div>
          <p className="font-display font-bold text-lg text-folk-cobalt folk-chunky-text">
            오늘의 캔버스
          </p>
          <p className="text-sm text-folk-forest/80 mt-0.5">새 이야기를 그려 보세요</p>
        </div>
        <FolkThemeCelestial size={44} className="opacity-80 shrink-0" />
      </div>
      <FolkBrushDivider className="my-3 opacity-50" />
      <div className="relative z-10">
        <ComposeForm
          key={formKey}
          variant="inline"
          onPosted={() => {
            setFormKey((k) => k + 1);
            setPostedMsg(true);
            router.refresh();
            window.setTimeout(() => setPostedMsg(false), 2800);
          }}
        />
        {postedMsg && (
          <p className="text-sm text-emerald-600 font-medium mt-2">게시되었습니다</p>
        )}
      </div>
    </div>
  );
}
