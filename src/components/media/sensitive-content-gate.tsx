"use client";

import { useState, type ReactNode } from "react";
import { EyeOff } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { shouldGateSensitiveContent } from "@/lib/sensitive-content";

type Props = {
  isNsfw?: boolean;
  isOwner?: boolean;
  viewerShowNsfw?: boolean;
  children: ReactNode;
  className?: string;
};

export function SensitiveContentGate({
  isNsfw = false,
  isOwner = false,
  viewerShowNsfw = false,
  children,
  className,
}: Props) {
  const { t } = useLocale();
  const [revealed, setRevealed] = useState(false);
  const gated = shouldGateSensitiveContent(isNsfw, isOwner, viewerShowNsfw);

  if (!gated || revealed) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        className="pointer-events-none select-none blur-xl scale-105 [&_*]:pointer-events-none"
        aria-hidden
      >
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
        <div className="w-full max-w-[300px] rounded-2xl bg-neutral-900/92 px-5 py-4 text-center shadow-2xl ring-1 ring-white/10">
          <EyeOff className="mx-auto mb-3 h-7 w-7 text-white/80" strokeWidth={2} />
          <p className="text-sm font-bold leading-snug text-white">
            {t("sensitiveContent.title")}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-white/75">
            {t("sensitiveContent.description")}
          </p>
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 rounded-full px-4 text-xs font-bold"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setRevealed(true);
              }}
            >
              {t("sensitiveContent.view")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
