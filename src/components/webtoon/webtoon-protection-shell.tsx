"use client";

import { useEffect, useState } from "react";

export function WebtoonProtectionShell({ children }: { children: React.ReactNode }) {
  const [blurred, setBlurred] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("webtoon-protected");
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";

    const block = (e: Event) => e.preventDefault();

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "PrintScreen" ||
        (e.ctrlKey && ["s", "p", "u", "c", "a"].includes(e.key.toLowerCase())) ||
        (e.metaKey && ["s", "p", "4", "5"].includes(e.key.toLowerCase())) ||
        (e.shiftKey && e.metaKey && e.key.toLowerCase() === "4")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onVisibility = () => {
      setBlurred(document.hidden);
    };

    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      root.classList.remove("webtoon-protected");
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        .webtoon-protected img,
        .webtoon-protected video {
          -webkit-user-drag: none;
          user-drag: none;
          pointer-events: none;
        }
        .webtoon-protected .webtoon-scroll-area {
          pointer-events: auto;
        }
      `}</style>
      {blurred && (
        <div className="fixed inset-0 z-[90] bg-background flex items-center justify-center p-6 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            다른 창으로 전환되면 작품 화면이 가려집니다. 다시 이 탭으로 돌아와 주세요.
          </p>
        </div>
      )}
      <div className="webtoon-scroll-area">{children}</div>
    </>
  );
}
