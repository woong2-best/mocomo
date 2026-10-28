"use client";

import { useEffect } from "react";

const DEEP_LINK = "mocomo://oauth?social=1";

export default function MobileSocialConnectedPage() {
  useEffect(() => {
    window.location.replace(DEEP_LINK);
  }, []);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6 text-center text-sm text-muted-foreground">
      <a href={DEEP_LINK} className="underline">
        Return to MoCoMo
      </a>
    </div>
  );
}
