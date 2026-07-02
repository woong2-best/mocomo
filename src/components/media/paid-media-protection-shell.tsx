"use client";

import { useEffect, useId, useState } from "react";
import { setScreenCaptureBlocked } from "@/lib/capacitor-screen-secure";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** 탭 전환 시 화면 가리기 */
  hideOnBackground?: boolean;
};

export function PaidMediaProtectionShell({
  children,
  className,
  hideOnBackground = true,
}: Props) {
  const scopeId = useId().replace(/:/g, "");
  const scopeClass = `paid-media-protected-${scopeId}`;
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    void setScreenCaptureBlocked(true);
    return () => {
      void setScreenCaptureBlocked(false);
    };
  }, []);

  useEffect(() => {
    const root = document.querySelector(`.${scopeClass}`);
    if (!root) return;

    const block = (e: Event) => e.preventDefault();

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (
        e.key === "PrintScreen" ||
        (e.ctrlKey && ["s", "p", "u", "c", "a"].includes(key)) ||
        (e.metaKey && ["s", "p", "4", "5"].includes(key)) ||
        (e.shiftKey && e.metaKey && key === "4")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onVisibility = () => {
      if (hideOnBackground) setHidden(document.hidden);
    };

    root.addEventListener("contextmenu", block);
    root.addEventListener("copy", block);
    root.addEventListener("cut", block);
    root.addEventListener("dragstart", block);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      root.removeEventListener("contextmenu", block);
      root.removeEventListener("copy", block);
      root.removeEventListener("cut", block);
      root.removeEventListener("dragstart", block);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [scopeClass, hideOnBackground]);

  return (
    <div className={cn("paid-media-protected relative", scopeClass, className)}>
      <style jsx>{`
        .paid-media-protected :global(img),
        .paid-media-protected :global(video) {
          -webkit-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-user-drag: none;
        }
      `}</style>
      {hidden && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/95 p-4 text-center">
          <p className="text-xs font-medium text-muted-foreground">
            유료 콘텐츠 보호 중입니다. 이 화면으로 돌아오면 다시 볼 수 있어요.
          </p>
        </div>
      )}
      {children}
    </div>
  );
}
