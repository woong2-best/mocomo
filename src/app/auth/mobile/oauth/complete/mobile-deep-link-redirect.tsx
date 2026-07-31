"use client";

import { useEffect } from "react";

/** Immediate redirect to mocomo:// deep link (AuthSession return URL). */
export function MobileDeepLinkRedirect({ url }: { url: string }) {
  useEffect(() => {
    window.location.replace(url);
  }, [url]);

  return (
    <div className="space-y-4">
      <p>인증이 완료되었습니다. MoCoMo 앱이 열립니다.</p>
      <a
        href={url}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 font-medium text-primary-foreground"
      >
        앱 열기
      </a>
    </div>
  );
}
